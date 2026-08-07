/**
 * Google Merchant API quota scheduling and retries (task T064).
 *
 * The Merchant API enforces per-day and per-minute quotas and returns
 * structured errors (`rateLimitExceeded`, `quotaExceeded`, `dailyLimitExceeded`)
 * (quota-and-rate-limits.md, google-error-mapping.md, api-degradation-behavior.md).
 * This module maps those errors to the canonical connector taxonomy (so the T033
 * circuit breaker and retry policy behave), and provides a daily-quota gate so a
 * batch of work is scheduled within the remaining budget rather than burning it
 * and getting hard-blocked. Pure and deterministic.
 */
import { ConnectorError, categoryFromHttpStatus, type ConnectorErrorCategory } from "../errors.js";
import { computeConnectorBackoffMs, shouldRetryConnector, type RetryPolicy } from "../retry.js";

export interface GoogleErrorInput {
  readonly status?: number;
  readonly networkError?: boolean;
  readonly retryAfterMs?: number;
  readonly body?: {
    readonly error?: {
      readonly code?: number;
      readonly status?: string;
      readonly message?: string;
      readonly errors?: readonly { readonly reason?: string; readonly message?: string }[];
    };
  };
}

function reasonsOf(input: GoogleErrorInput): Set<string> {
  const out = new Set<string>();
  const err = input.body?.error;
  if (err?.status) out.add(err.status.toLowerCase());
  for (const e of err?.errors ?? []) {
    if (typeof e.reason === "string") out.add(e.reason.toLowerCase());
  }
  return out;
}

/**
 * Maps a Google Merchant API error into a canonical `ConnectorError`.
 * `rateLimitExceeded` → rate_limit; `quotaExceeded`/`dailyLimitExceeded` →
 * quota; otherwise the HTTP status maps through the shared taxonomy. Network
 * errors are retryable.
 */
export function classifyGoogleApiError(input: GoogleErrorInput): ConnectorError {
  if (input.networkError) {
    return new ConnectorError("Google request failed (network)", "network", { retryable: true });
  }
  const reasons = reasonsOf(input);
  const has = (...names: string[]) => names.some((n) => reasons.has(n));

  let category: ConnectorErrorCategory;
  if (has("ratelimitexceeded", "userratelimitexceeded")) {
    category = "rate_limit";
  } else if (has("quotaexceeded", "dailylimitexceeded", "resource_exhausted")) {
    category = "quota";
  } else if (typeof input.status === "number") {
    category = categoryFromHttpStatus(input.status);
  } else {
    category = "unknown";
  }

  const message = input.body?.error?.message ?? `Google ${category} error`;
  return new ConnectorError(message, category, {
    providerCode: input.body?.error?.code ?? input.status,
    retryAfterMs: input.retryAfterMs,
  });
}

/** Backoff for the next Google attempt (delegates to the T033 policy). */
export function nextGoogleAttemptDelayMs(
  error: unknown,
  attempt: number,
  policy: RetryPolicy = {},
  random: () => number = Math.random,
): number {
  return computeConnectorBackoffMs(attempt, error, policy, random);
}

/** True if a failed Google attempt should be retried (T033 policy). */
export function shouldRetryGoogle(
  error: unknown,
  attempt: number,
  policy: RetryPolicy = {},
): boolean {
  return shouldRetryConnector(error, attempt, policy);
}

// ---------------------------------------------------------------------------
// Daily-quota gate
// ---------------------------------------------------------------------------

export interface DailyQuotaInput {
  /** Total units allowed per day. */
  readonly dailyLimit: number;
  /** Units already consumed today. */
  readonly used: number;
  /** Units one request costs. Default 1. */
  readonly unitsPerRequest?: number;
  /** When the daily quota resets (used to report wait time). */
  readonly resetAt?: Date;
  readonly now?: () => Date;
}

export interface QuotaPlan {
  /** Requests that can run now within the remaining daily budget. */
  readonly requestsAllowedNow: number;
  /** Remaining units in the daily budget. */
  readonly remainingUnits: number;
  /** True when the budget is exhausted and work must wait for reset. */
  readonly exhausted: boolean;
  /** Milliseconds until the quota resets, when exhausted (else 0). */
  readonly waitMs: number;
}

/**
 * Plans how many requests may run now within the remaining daily quota. When the
 * budget is exhausted it reports how long to wait for the reset, so callers
 * pause rather than hammer the API into a hard block.
 */
export function planDailyQuota(input: DailyQuotaInput): QuotaPlan {
  const unitsPerRequest = Math.max(1, input.unitsPerRequest ?? 1);
  const dailyLimit = Math.max(0, input.dailyLimit);
  const used = Math.max(0, input.used);
  const remainingUnits = Math.max(0, dailyLimit - used);
  const requestsAllowedNow = Math.floor(remainingUnits / unitsPerRequest);
  const exhausted = requestsAllowedNow === 0;
  let waitMs = 0;
  if (exhausted && input.resetAt) {
    const now = (input.now ?? (() => new Date()))().getTime();
    waitMs = Math.max(0, input.resetAt.getTime() - now);
  }
  return { requestsAllowedNow, remainingUnits, exhausted, waitMs };
}
