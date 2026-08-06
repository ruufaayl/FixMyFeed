/**
 * Retry classification and backoff (task T021).
 *
 * Pure and deterministic (with an injectable RNG). Only classified *transient*
 * failures are retried, with bounded exponential backoff plus jitter; exhausted
 * jobs are dead-lettered by the runtime rather than discarded
 * (job-and-workflow-architecture.md).
 */

export interface RetryPolicy {
  /** Total attempts including the first. */
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  /** Jitter as a fraction of the computed delay (0..1). */
  readonly jitterRatio: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = Object.freeze({
  maxAttempts: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 300_000,
  jitterRatio: 0.2,
});

export type FailureClass = "transient" | "permanent";

/** Marks an error the runtime should retry (transient); anything else is permanent. */
export class TransientJobError extends Error {
  readonly transient = true as const;
  constructor(message: string) {
    super(message);
    this.name = "TransientJobError";
  }
}

const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EPIPE",
  "EAI_AGAIN",
  "40001", // postgres serialization_failure
  "40P01", // postgres deadlock_detected
]);
const TRANSIENT_NAME_RE = /timeout|temporarily|unavailable|throttl|rate.?limit/i;

/** Classifies a thrown value as transient (retryable) or permanent. */
export function classifyFailure(error: unknown): FailureClass {
  if (error && typeof error === "object") {
    const e = error as {
      transient?: unknown;
      code?: unknown;
      status?: unknown;
      name?: unknown;
      message?: unknown;
    };
    if (e.transient === true) return "transient";
    if (typeof e.code === "string" && TRANSIENT_CODES.has(e.code)) return "transient";
    if (e.status === 429 || e.status === 503 || e.status === 502 || e.status === 504)
      return "transient";
    const text = `${typeof e.name === "string" ? e.name : ""} ${typeof e.message === "string" ? e.message : ""}`;
    if (TRANSIENT_NAME_RE.test(text)) return "transient";
  }
  return "permanent";
}

/** Whether another attempt should be made after `attempt` (1-based) failed. */
export function shouldRetry(
  attempt: number,
  failureClass: FailureClass,
  policy: RetryPolicy,
): boolean {
  return failureClass === "transient" && attempt < policy.maxAttempts;
}

/**
 * Bounded exponential backoff with symmetric jitter for the given 1-based
 * attempt number. Deterministic given `rng` (defaults to Math.random).
 */
export function computeBackoffMs(
  attempt: number,
  policy: RetryPolicy,
  rng: () => number = Math.random,
): number {
  const exponent = Math.max(0, attempt - 1);
  const base = Math.min(policy.baseDelayMs * 2 ** exponent, policy.maxDelayMs);
  const jitter = base * policy.jitterRatio * (rng() * 2 - 1);
  const delay = Math.round(base + jitter);
  return Math.max(0, Math.min(delay, policy.maxDelayMs));
}
