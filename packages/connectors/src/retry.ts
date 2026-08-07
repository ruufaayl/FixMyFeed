/**
 * Connector retry policy (task T033).
 *
 * Bounded exponential backoff with jitter, driven by the canonical
 * `ConnectorError`: only `retryable` failures are retried, a provider-supplied
 * `retryAfterMs` (e.g. a 429 Retry-After) takes precedence, and delays are
 * capped (connector-retry-policy.md).
 *
 * Pure and deterministic given an injected jitter source.
 */
import { ConnectorError } from "./errors.js";

export interface RetryPolicy {
  /** Max total attempts (including the first). Default 4. */
  readonly maxAttempts?: number;
  /** Base backoff in ms for attempt 1. Default 500. */
  readonly baseMs?: number;
  /** Maximum backoff in ms. Default 30_000. */
  readonly maxMs?: number;
  /** Exponential growth factor. Default 2. */
  readonly factor?: number;
}

const DEFAULTS: Required<RetryPolicy> = {
  maxAttempts: 4,
  baseMs: 500,
  maxMs: 30_000,
  factor: 2,
};

/** True if a failed `attempt` (1-based) should be retried. */
export function shouldRetryConnector(
  error: unknown,
  attempt: number,
  policy: RetryPolicy = {},
): boolean {
  const maxAttempts = policy.maxAttempts ?? DEFAULTS.maxAttempts;
  if (attempt >= maxAttempts) return false;
  if (error instanceof ConnectorError) return error.retryable;
  // Unknown/non-connector errors are treated as non-retryable by default.
  return false;
}

/**
 * Computes the backoff before the next attempt. A `ConnectorError.retryAfterMs`
 * wins (capped to `maxMs`); otherwise exponential `base * factor^(attempt-1)`
 * capped to `maxMs`, then full jitter in `[0, delay]`.
 */
export function computeConnectorBackoffMs(
  attempt: number,
  error: unknown,
  policy: RetryPolicy = {},
  random: () => number = Math.random,
): number {
  const baseMs = policy.baseMs ?? DEFAULTS.baseMs;
  const maxMs = policy.maxMs ?? DEFAULTS.maxMs;
  const factor = policy.factor ?? DEFAULTS.factor;

  if (error instanceof ConnectorError && typeof error.retryAfterMs === "number") {
    return Math.min(Math.max(0, error.retryAfterMs), maxMs);
  }

  const exponent = Math.max(0, attempt - 1);
  const uncapped = baseMs * Math.pow(factor, exponent);
  const capped = Math.min(uncapped, maxMs);
  // Full jitter: a random value in [0, capped].
  return Math.round(capped * random());
}
