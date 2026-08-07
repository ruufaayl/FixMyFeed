/**
 * Connector health, quota, and circuit-breaker tests (task T033).
 *
 * Imports the built @fixmyfeed/connectors package. All pure over an injected
 * clock / jitter source — no timers, no network.
 *
 * Traceability: docs/05-integrations/common/connector-health-model.md,
 * connector-rate-limit-handling.md, connector-retry-policy.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CIRCUIT_STATES,
  createCircuitBreaker,
  createRateLimiter,
  shouldRetryConnector,
  computeConnectorBackoffMs,
  CONNECTOR_HEALTH_STATUSES,
  deriveConnectorHealth,
  ConnectorError,
} from "../packages/connectors/dist/index.js";

const D = (iso) => new Date(iso);

// ---------------------------------------------------------------------------
// circuit-breaker.ts
// ---------------------------------------------------------------------------

test("circuit breaker: opens after threshold, half-opens after cooldown, closes on success", () => {
  assert.deepEqual(CIRCUIT_STATES, ["closed", "open", "half_open"]);
  const cb = createCircuitBreaker({
    failureThreshold: 3,
    openDurationMs: 1000,
    successThreshold: 1,
  });
  const t0 = D("2026-08-07T00:00:00.000Z");
  assert.equal(cb.tryAcquire(t0), true); // closed

  cb.recordFailure(t0);
  cb.recordFailure(t0);
  assert.equal(cb.state(t0), "closed");
  cb.recordFailure(t0); // 3rd -> open
  assert.equal(cb.state(t0), "open");
  assert.equal(cb.tryAcquire(t0), false); // blocked while open

  // Before cooldown: still open.
  assert.equal(cb.tryAcquire(D("2026-08-07T00:00:00.500Z")), false);
  // After cooldown: half_open admits one trial.
  const t1 = D("2026-08-07T00:00:01.001Z");
  assert.equal(cb.state(t1), "half_open");
  assert.equal(cb.tryAcquire(t1), true); // trial admitted
  assert.equal(cb.tryAcquire(t1), false); // only one trial in flight
  cb.recordSuccess(); // -> closed
  assert.equal(cb.state(t1), "closed");
  assert.equal(cb.tryAcquire(t1), true);
});

test("circuit breaker: a half-open trial failure re-opens", () => {
  const cb = createCircuitBreaker({ failureThreshold: 1, openDurationMs: 1000 });
  const t0 = D("2026-08-07T00:00:00.000Z");
  cb.recordFailure(t0); // -> open
  const t1 = D("2026-08-07T00:00:01.500Z");
  assert.equal(cb.state(t1), "half_open");
  assert.equal(cb.tryAcquire(t1), true);
  cb.recordFailure(t1); // trial fails -> open again
  assert.equal(cb.state(t1), "open");
  assert.equal(cb.tryAcquire(t1), false);
});

// ---------------------------------------------------------------------------
// rate-limiter.ts
// ---------------------------------------------------------------------------

test("rate limiter: spends tokens, blocks when empty, refills over the window", () => {
  const rl = createRateLimiter({ requestsPerWindow: 2, windowSeconds: 1, retryAfterHonored: true });
  const t0 = D("2026-08-07T00:00:00.000Z");
  assert.equal(rl.tryAcquire(t0).allowed, true);
  assert.equal(rl.tryAcquire(t0).allowed, true);
  const blocked = rl.tryAcquire(t0);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterMs > 0);
  // Refill: 2 tokens/sec -> 1 token after 500ms.
  assert.equal(rl.tryAcquire(D("2026-08-07T00:00:00.500Z")).allowed, true);
  assert.throws(
    () => createRateLimiter({ requestsPerWindow: 0, windowSeconds: 1, retryAfterHonored: false }),
    TypeError,
  );
});

// ---------------------------------------------------------------------------
// retry.ts
// ---------------------------------------------------------------------------

test("retry policy: retries only retryable errors within maxAttempts", () => {
  const retryable = new ConnectorError("x", "rate_limit");
  const permanent = new ConnectorError("y", "validation");
  assert.equal(shouldRetryConnector(retryable, 1, { maxAttempts: 3 }), true);
  assert.equal(shouldRetryConnector(retryable, 3, { maxAttempts: 3 }), false); // exhausted
  assert.equal(shouldRetryConnector(permanent, 1, { maxAttempts: 3 }), false);
  assert.equal(shouldRetryConnector(new Error("plain"), 1), false);
});

test("computeConnectorBackoffMs: retryAfter wins, else capped exponential + jitter", () => {
  // retryAfterMs takes precedence (capped to maxMs).
  const withRetryAfter = new ConnectorError("x", "rate_limit", { retryAfterMs: 2500 });
  assert.equal(
    computeConnectorBackoffMs(1, withRetryAfter, { maxMs: 30_000 }, () => 0.5),
    2500,
  );
  assert.equal(
    computeConnectorBackoffMs(1, new ConnectorError("x", "rate_limit", { retryAfterMs: 99_999 }), {
      maxMs: 5000,
    }),
    5000,
  );

  // Exponential with full jitter (random=1 -> full delay).
  const err = new ConnectorError("x", "upstream");
  assert.equal(
    computeConnectorBackoffMs(1, err, { baseMs: 500, factor: 2 }, () => 1),
    500,
  );
  assert.equal(
    computeConnectorBackoffMs(3, err, { baseMs: 500, factor: 2 }, () => 1),
    2000,
  );
  assert.equal(
    computeConnectorBackoffMs(10, err, { baseMs: 500, maxMs: 3000 }, () => 1),
    3000,
  ); // capped
  assert.equal(
    computeConnectorBackoffMs(3, err, { baseMs: 500 }, () => 0),
    0,
  ); // jitter floor
});

// ---------------------------------------------------------------------------
// health.ts
// ---------------------------------------------------------------------------

test("deriveConnectorHealth: maps circuit + error rate to a status", () => {
  assert.deepEqual(CONNECTOR_HEALTH_STATUSES, ["healthy", "degraded", "unhealthy"]);
  const h = (s) => deriveConnectorHealth(s);
  assert.equal(h({ errorRate: 0.0, circuitState: "closed", consecutiveFailures: 0 }), "healthy");
  assert.equal(h({ errorRate: 0.2, circuitState: "closed", consecutiveFailures: 0 }), "degraded");
  assert.equal(
    h({ errorRate: 0.0, circuitState: "half_open", consecutiveFailures: 0 }),
    "degraded",
  );
  assert.equal(h({ errorRate: 0.0, circuitState: "closed", consecutiveFailures: 3 }), "degraded");
  assert.equal(h({ errorRate: 0.6, circuitState: "closed", consecutiveFailures: 0 }), "unhealthy");
  assert.equal(h({ errorRate: 0.0, circuitState: "open", consecutiveFailures: 9 }), "unhealthy");
});
