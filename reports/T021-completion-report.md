# T021 — Completion Report

**Task:** T021 — Implement pg-boss queues and worker runtime (Epic E02)
**Branch:** `task/T021-implement-pg-boss-queues-and-worker-runtime` → PR into `develop`
**Depends on:** T003 (config), T010 (database) — merged.
**State transition:** `Not Started` → `In Review`

## What was built

The durable job-queue foundation in `packages/jobs`, per `job-and-workflow-architecture.md`:

- **`queues.ts`** — a queue registry **partitioned by workload class** (import, synchronization, diagnostics, repair, export, notification, maintenance), _not_ by tenant. Each queue has an explicit name (`workload.<class>`), a dead-letter queue (`.dlq`), a retry policy, and a default concurrency.
- **`envelope.ts`** — the versioned, secret-free **job envelope** every job carries: schema version, job id, tenant id (or null for system work), acting principal, correlation id, operation id, and resource references. `assertNoSecrets` rejects payloads with secret-looking keys (password/token/apiKey/credential/…) **at any depth** — raw secrets never enter a job.
- **`retry.ts`** — pure retry logic: `classifyFailure` (transient vs permanent), `shouldRetry` (transient only, bounded by `maxAttempts`), and `computeBackoffMs` (**bounded exponential backoff with jitter**, deterministic given an injectable RNG).
- **`runtime.ts`** — `createWorkerRuntime` over pg-boss: registers queues + dead-letters, enqueues jobs, and runs handlers with envelope validation and **failure routing** — transient failures rethrow so pg-boss retries with bounded backoff (dead-lettering on exhaustion); permanent failures are sent straight to the dead-letter queue (no wasted retries). pg-boss is created via an **injectable factory**, so the runtime is unit-testable without a database.
- **`errors.ts`** — `JobsError` with stable codes.

Cancellation/pause/resume, tenant-quota checks at batch boundaries, checkpoints for large catalogs, and the transactional outbox are called out in the architecture and are follow-on increments (see limitations); this task lands the queue/runtime/retry/envelope foundation they build on.

## Files changed

- **Added:** `packages/jobs/src/{queues,envelope,retry,runtime,errors}.ts`, `tests/jobs.test.mjs`.
- **Modified:** `packages/jobs/src/index.ts` (public API), `packages/jobs/package.json` (deps: `pg-boss ^10.3.2`, `@fixmyfeed/config`), `pnpm-lock.yaml`, `.github/workflows/ci.yml` (runs the new test).
- **Traceability:** `WORKSTREAM_REGISTRY.md` T021 → `In Review`.

`pg-boss` is added to the **`jobs` package** (not root); the boundary test confirms `jobs`→`config` is within its allow-list. No schema/migration (pg-boss manages its own tables at runtime; no new documented table introduced).

## Tests and exact results

Full CI gate **locally**: `node --test` over all 14 test files → **151 pass, 0 fail**; `prettier --check .` clean; `eslint .` clean; `check:traceability` 100/100.

`tests/jobs.test.mjs` (9): queue registry (one queue per workload class, named + dead-lettered, not tenant-partitioned); retry classification + bounded `shouldRetry`; backoff (exact exponential values, capped, jitter within `[0, maxDelay]`); envelope creation; **secrets rejected at any depth**; malformed-envelope rejection; runtime requires a DB URL + rejects unknown queues; start wires each queue + dead-letter; and the **transient→rethrow / permanent→dead-letter** routing via a fake pg-boss.

**Verification limits (no live database):** the runtime is exercised through a pg-boss test double. A live pg-boss integration run needs Postgres — now feasible via the CI Postgres service added alongside the DB migration test; a DB-backed jobs integration test is a reasonable follow-up.

## Security & privacy

- **No raw secrets in jobs:** the envelope forbids secret-looking payload keys; jobs reference resources, not credentials (credentials live in the T015 encrypted vault).
- Retry is bounded (no infinite loops / thundering herd — jitter); exhausted work is dead-lettered, **never silently discarded**.
- Every job carries tenant + correlation + operation ids for tenant-scoped, traceable processing.

## Accessibility / performance / cost

N/A (backend). Cost $0 (pg-boss is open-source; runs on the existing Postgres). Backoff + concurrency caps bound load; the cost guard may lower concurrency further.

## Environment variables / external approvals

None new (`DATABASE_URL` already cataloged; pg-boss uses it).

## Rollback procedure

Revert the PR merge commit, or delete `packages/jobs/src/{queues,envelope,retry,runtime,errors}.ts` + `tests/jobs.test.mjs`, restore the placeholder `index.ts`, revert `packages/jobs/package.json`/`pnpm-lock.yaml` and the ci.yml entry, and set the T021 registry row to `Not Started`. No schema/data — non-destructive.

## Known limitations / follow-ups

1. **Live pg-boss integration test** — deferred to a DB-backed run (the CI Postgres service now exists).
2. **Cancellation / pause / resume / tenant-quota-at-batch-boundaries / checkpoints / transactional outbox** — architecture-listed capabilities that build on this foundation; each is a focused follow-up.
3. `computeBackoffMs` is available for callers/telemetry; pg-boss applies its own bounded backoff via the queue's `retryLimit`/`retryDelay`/`retryBackoff` — the two are aligned by the queue definition.

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T021 → `In Review`.
- `packages/jobs/src/*` trace to `job-and-workflow-architecture.md`, `asynchronous-communication.md`, `reference-architecture.md`.
- `tests/jobs.test.mjs` provides queue/envelope/retry/runtime evidence.
