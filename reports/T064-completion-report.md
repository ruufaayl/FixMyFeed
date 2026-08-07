# T064 — Completion Report

**Task:** T064 — Implement Merchant API quota scheduling and retries (Epic E06)
**Branch:** `task/T060-T065-google-merchant-connector`. **State:** Not Started → In Review

## Specifications read

- `implementation/tasks/T064-implement-merchant-api-quota-scheduling-and-retries.md`
- `docs/05-integrations/google-merchant-center/{quota-and-rate-limits,google-error-mapping,api-degradation-behavior}.md`

## What was built

`packages/connectors/src/google/quota.ts` — Google error mapping + daily-quota scheduling, on the **T033** retry/backoff policy. Pure and deterministic.

- `classifyGoogleApiError` — maps Google errors to the canonical taxonomy: `rateLimitExceeded`→rate_limit, `quotaExceeded`/`dailyLimitExceeded`/`RESOURCE_EXHAUSTED`→quota, else HTTP status via the shared mapper; network→retryable. Honors `retryAfterMs`.
- `shouldRetryGoogle` / `nextGoogleAttemptDelayMs` — delegate to the T033 retry policy (retryable-only; retryAfter-then-capped-exponential-jitter).
- `planDailyQuota` — budgets how many requests may run now within the remaining daily quota; on exhaustion reports `waitMs` to the reset so callers pause instead of hard-blocking.

## Files changed

Added `google/quota.ts` + `tests/google-quota.test.mjs` + this report; wired `google/index.ts` + `ci.yml`. No dependency, env var, schema/migration, or boundary change.

## Tests

`tests/google-quota.test.mjs` (3): error classification (rate/quota/http/network), retry delegation + retryAfter precedence, daily-quota budgeting + reset wait. Part of the full local gate.

## Security & privacy

Pure; no secrets/network. Prevents quota abuse/hard-blocks (availability).

## Rollback / limitations

Revert the E06 PR or remove `google/quota.ts`. **Follow-up:** the worker scheduler wires `planDailyQuota` + T033 breaker/limiter around the ingestion jobs.

## Traceability

`WORKSTREAM_REGISTRY.md` T064 → In Review; `google/quota.ts` ↔ `quota-and-rate-limits.md`, `google-error-mapping.md`, T033.
