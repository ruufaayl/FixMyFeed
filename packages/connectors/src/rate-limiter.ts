/**
 * Connector rate limiter / quota tracker (task T033).
 *
 * A token bucket sized from a connector's `RateLimitModel` (T030): the bucket
 * holds `requestsPerWindow` tokens and refills continuously over `windowSeconds`.
 * `tryAcquire` spends a token when available and otherwise reports how long to
 * wait, so callers throttle proactively instead of relying on provider 429s
 * (connector-rate-limit-handling.md).
 *
 * Deterministic given an injected clock; bucket state is held in the closure.
 */
import type { RateLimitModel } from "./capabilities.js";

export interface RateLimitDecision {
  readonly allowed: boolean;
  /** Milliseconds until the next token is available (0 when allowed). */
  readonly retryAfterMs: number;
}

export interface RateLimiter {
  tryAcquire(now?: Date): RateLimitDecision;
  /** Tokens currently available (fractional), for observability. */
  available(now?: Date): number;
}

/** Builds a token-bucket rate limiter from a connector rate-limit model. */
export function createRateLimiter(model: RateLimitModel): RateLimiter {
  if (
    !Number.isFinite(model?.requestsPerWindow) ||
    model.requestsPerWindow <= 0 ||
    !Number.isFinite(model?.windowSeconds) ||
    model.windowSeconds <= 0
  ) {
    throw new TypeError("rate-limit model requires positive requestsPerWindow and windowSeconds");
  }
  const capacity = model.requestsPerWindow;
  const refillPerMs = capacity / (model.windowSeconds * 1000);

  let tokens = capacity;
  let last = Number.NaN;

  const refill = (at: number) => {
    if (Number.isNaN(last)) {
      last = at;
      return;
    }
    if (at > last) {
      tokens = Math.min(capacity, tokens + (at - last) * refillPerMs);
      last = at;
    }
  };

  return {
    tryAcquire(now) {
      const at = (now ?? new Date()).getTime();
      refill(at);
      if (tokens >= 1) {
        tokens -= 1;
        return { allowed: true, retryAfterMs: 0 };
      }
      const deficit = 1 - tokens;
      return { allowed: false, retryAfterMs: Math.ceil(deficit / refillPerMs) };
    },
    available(now) {
      refill((now ?? new Date()).getTime());
      return tokens;
    },
  };
}
