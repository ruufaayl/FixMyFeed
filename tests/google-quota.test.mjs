/**
 * Google Merchant API quota scheduling + retries tests (task T064).
 *
 * Traceability: docs/05-integrations/google-merchant-center/{quota-and-rate-
 * limits,google-error-mapping,api-degradation-behavior}.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { google, ConnectorError } from "../packages/connectors/dist/index.js";

const { classifyGoogleApiError, nextGoogleAttemptDelayMs, shouldRetryGoogle, planDailyQuota } =
  google;

test("classifyGoogleApiError: rate limit / quota / http / network mapping", () => {
  const rate = classifyGoogleApiError({
    status: 429,
    body: { error: { code: 429, errors: [{ reason: "rateLimitExceeded" }] } },
  });
  assert.equal(rate.category, "rate_limit");
  assert.equal(rate.retryable, true);

  const quota = classifyGoogleApiError({
    status: 403,
    body: { error: { code: 403, errors: [{ reason: "dailyLimitExceeded" }] } },
  });
  assert.equal(quota.category, "quota");
  assert.equal(quota.retryable, true);

  assert.equal(classifyGoogleApiError({ status: 401 }).category, "authentication");
  assert.equal(classifyGoogleApiError({ status: 404 }).category, "not_found");
  assert.equal(classifyGoogleApiError({ status: 500 }).category, "upstream");
  const net = classifyGoogleApiError({ networkError: true });
  assert.equal(net.category, "network");
  assert.equal(net.retryable, true);
});

test("retry helpers delegate to the T033 policy", () => {
  const err = classifyGoogleApiError({ status: 500 });
  assert.equal(shouldRetryGoogle(err, 1, { maxAttempts: 3 }), true);
  assert.equal(shouldRetryGoogle(new ConnectorError("x", "validation"), 1), false);
  // retryAfter wins in backoff
  const rate = classifyGoogleApiError({
    status: 429,
    retryAfterMs: 2000,
    body: { error: { errors: [{ reason: "rateLimitExceeded" }] } },
  });
  assert.equal(
    nextGoogleAttemptDelayMs(rate, 1, {}, () => 0.5),
    2000,
  );
});

test("planDailyQuota: budgets requests and reports wait on exhaustion", () => {
  const plan = planDailyQuota({ dailyLimit: 1000, used: 400, unitsPerRequest: 1 });
  assert.equal(plan.remainingUnits, 600);
  assert.equal(plan.requestsAllowedNow, 600);
  assert.equal(plan.exhausted, false);

  const costly = planDailyQuota({ dailyLimit: 100, used: 0, unitsPerRequest: 25 });
  assert.equal(costly.requestsAllowedNow, 4);

  const done = planDailyQuota({
    dailyLimit: 100,
    used: 100,
    resetAt: new Date("2026-08-08T00:00:00Z"),
    now: () => new Date("2026-08-07T23:00:00Z"),
  });
  assert.equal(done.exhausted, true);
  assert.equal(done.waitMs, 3600_000); // 1 hour to reset
});
