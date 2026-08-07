/**
 * Connector circuit breaker (task T033).
 *
 * A three-state breaker (`closed → open → half_open → closed`) that stops
 * hammering a failing provider: after `failureThreshold` consecutive failures it
 * opens for `openDurationMs`, then admits a small number of trial requests
 * (`half_open`); trial successes close it, a trial failure re-opens it
 * (connector-health-model.md, connector-retry-policy.md).
 *
 * Deterministic given an injected clock; state is held in the closure.
 */
export const CIRCUIT_STATES = ["closed", "open", "half_open"] as const;
export type CircuitState = (typeof CIRCUIT_STATES)[number];

export interface CircuitBreakerOptions {
  /** Consecutive failures before opening. Default 5. */
  readonly failureThreshold?: number;
  /** How long the breaker stays open before a trial. Default 30_000 ms. */
  readonly openDurationMs?: number;
  /** Concurrent trial requests allowed while half-open. Default 1. */
  readonly halfOpenMaxTrials?: number;
  /** Trial successes required to close from half-open. Default 1. */
  readonly successThreshold?: number;
}

export interface CircuitBreaker {
  /** Current logical state (performs the open→half_open time transition). */
  state(now?: Date): CircuitState;
  /** Attempts to reserve a request slot; true if the request may proceed. */
  tryAcquire(now?: Date): boolean;
  recordSuccess(): void;
  recordFailure(now?: Date): void;
}

export function createCircuitBreaker(options: CircuitBreakerOptions = {}): CircuitBreaker {
  const failureThreshold = options.failureThreshold ?? 5;
  const openDurationMs = options.openDurationMs ?? 30_000;
  const halfOpenMaxTrials = options.halfOpenMaxTrials ?? 1;
  const successThreshold = options.successThreshold ?? 1;

  let state: CircuitState = "closed";
  let consecutiveFailures = 0;
  let openedAt = 0;
  let halfOpenInFlight = 0;
  let halfOpenSuccesses = 0;

  const clock = (now?: Date) => (now ?? new Date()).getTime();

  const toOpen = (at: number) => {
    state = "open";
    openedAt = at;
    halfOpenInFlight = 0;
    halfOpenSuccesses = 0;
  };
  const toHalfOpen = () => {
    state = "half_open";
    halfOpenInFlight = 0;
    halfOpenSuccesses = 0;
  };
  const toClosed = () => {
    state = "closed";
    consecutiveFailures = 0;
    halfOpenInFlight = 0;
    halfOpenSuccesses = 0;
  };

  const resolveState = (at: number): CircuitState => {
    if (state === "open" && at - openedAt >= openDurationMs) {
      toHalfOpen();
    }
    return state;
  };

  return {
    state(now) {
      return resolveState(clock(now));
    },
    tryAcquire(now) {
      const at = clock(now);
      const current = resolveState(at);
      if (current === "closed") return true;
      if (current === "open") return false;
      // half_open: admit a bounded number of trials.
      if (halfOpenInFlight < halfOpenMaxTrials) {
        halfOpenInFlight += 1;
        return true;
      }
      return false;
    },
    recordSuccess() {
      if (state === "half_open") {
        halfOpenInFlight = Math.max(0, halfOpenInFlight - 1);
        halfOpenSuccesses += 1;
        if (halfOpenSuccesses >= successThreshold) toClosed();
      } else {
        consecutiveFailures = 0;
      }
    },
    recordFailure(now) {
      const at = clock(now);
      if (state === "half_open") {
        toOpen(at); // any trial failure re-opens
        return;
      }
      consecutiveFailures += 1;
      if (consecutiveFailures >= failureThreshold) toOpen(at);
    },
  };
}
