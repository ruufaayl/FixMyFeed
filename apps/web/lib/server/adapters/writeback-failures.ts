/**
 * Writeback failure taxonomy + bounded retry (task T164) — server-only.
 *
 * Normalizes the stable failure codes emitted by the Shopify writeback port into
 * a small set of dispositions the rest of the system can act on:
 *
 *  - `retry`       transient upstream/network/throttle — retried with bounded
 *                  backoff, then surfaced;
 *  - `reconnect`   the OAuth token/scope is invalid — the merchant must reconnect;
 *  - `recalculate` the live product changed (stale baseline) — the plan must be
 *                  recomputed against fresh state;
 *  - `terminal`    permanent (validation, unsupported field, deleted product,
 *                  policy refusal) — no retry.
 *
 * Only stable codes cross this boundary — never raw Shopify responses or
 * credentials. `withBoundedRetry` retries only `retry`-disposition failures.
 */
import { computeConnectorBackoffMs } from "@fixmyfeed/connectors";
import type { WritebackPort, WritebackResult } from "@fixmyfeed/repairs";

export type FailureDisposition = "retry" | "reconnect" | "recalculate" | "terminal";

export interface WritebackFailure {
  readonly code: string;
  readonly disposition: FailureDisposition;
}

const DISPOSITION: Readonly<Record<string, FailureDisposition>> = {
  // Transient — safe to retry with backoff.
  rate_limit: "retry",
  network: "retry",
  upstream: "retry",
  // Credential/scope — the merchant must reconnect (no point retrying).
  authentication: "reconnect",
  authorization: "reconnect",
  missing_write_scope: "reconnect",
  // Concurrency — recompute the plan against fresh state.
  conflict: "recalculate",
  conflict_stale_baseline: "recalculate",
  // Permanent — never retry.
  validation: "terminal",
  not_found: "terminal",
  product_not_found: "terminal",
  unsupported_field: "terminal",
  rejected: "terminal",
  // Policy/safety refusals — won't change without config/approval.
  writeback_disabled: "terminal",
  allowlist_empty: "terminal",
  shop_not_allowlisted: "terminal",
  not_a_dev_store: "terminal",
  plan_not_approved: "terminal",
  capability_unsupported: "terminal",
  unknown_mode: "terminal",
  // Unknown provider categories fail closed (terminal) — never a retry storm.
  unknown: "terminal",
};

/** Classifies a writeback failure code into its recovery disposition. */
export function classifyWritebackFailure(error: string | null): WritebackFailure {
  const code = error ?? "unknown";
  return { code, disposition: DISPOSITION[code] ?? "terminal" };
}

/** Whether a failure code is transient and eligible for a bounded retry. */
export function isRetryableFailure(error: string | null): boolean {
  return classifyWritebackFailure(error).disposition === "retry";
}

export interface BoundedRetryOptions {
  readonly maxAttempts?: number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly random?: () => number;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps a `WritebackPort`, retrying only transient (`retry`-disposition) failures
 * with exponential backoff + jitter (T033), up to `maxAttempts`. Reconnect,
 * recalculate, and terminal failures return immediately — never retried.
 */
export function withBoundedRetry(
  port: WritebackPort,
  options: BoundedRetryOptions = {},
): WritebackPort {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const sleep = options.sleep ?? defaultSleep;
  return {
    async apply(instruction) {
      let last: WritebackResult = { ok: false, error: "unknown" };
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        last = await port.apply(instruction);
        if (last.ok) return last;
        if (!isRetryableFailure(last.error) || attempt === maxAttempts) return last;
        await sleep(computeConnectorBackoffMs(attempt, undefined, {}, options.random));
      }
      return last;
    },
  };
}
