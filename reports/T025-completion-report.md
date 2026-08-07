# T025 — Completion Report

**Task:** T025 — Implement idempotency and operation resources (Epic E02)
**Branch:** `task/T025-implement-idempotency-and-operation-resources` → PR into `develop`
**Depends on:** T010 (database), T012 (tenancy), T021/T022 (jobs/outbox context) — merged.
**State transition:** `Not Started` → `In Review`

## Specifications read

- `implementation/tasks/T025-implement-idempotency-and-operation-resources.md` (authority)
- `docs/04-system-architecture/idempotency-strategy.md`, `docs/08-api-and-contracts/api-idempotency.md`
- `docs/08-api-and-contracts/api-asynchronous-operations.md`, `docs/08-api-and-contracts/public-api/operations-api.md`
- `docs/07-data-architecture/tables/platform-operations/idempotency-keys.md`
- `packages/database/src/{columns,schema}.ts` and `drizzle.config.ts` (existing DB conventions + migration flow)

## What was built

Two tenant-owned tables plus their pure lifecycle logic, in `packages/database` (the only SQL-owning package).

- **`operations` (`operation-schema.ts`)** — the durable resource an async API returns and a durable job advances. Status is the canonical loading-state set: `queued → running / retrying / blocked → completed / partially_completed / cancelled / failed` (terminal). Columns: `operation_type`, `status`, `progress` (0–100, checked), `resource_type/resource_id`, `result`/`error` (jsonb), `started_at`/`completed_at`, audit timestamps, optimistic `version`; indexes on `(organization_id, status)` and `(organization_id, created_at)`.
- **`idempotency_keys` (`idempotency-schema.ts`)** — makes a mutating request safely retryable. Unique `(organization_id, idempotency_key)`; stores `request_method/path`, a `request_fingerprint`, `status` (`pending → completed`), the response snapshot (`response_status`, `response_body`), an optional `operation_id` FK (→ `operations`, `ON DELETE set null`), and `expires_at` (drives retention cleanup, index).
- **Operation logic (`operations.ts`, pure)** — `createOperation` (validated, queued), `transitionOperation` (validates against an allowed-transition graph, rejects moves out of terminal states, stamps `started_at`/`completed_at`, bumps `version`), `canTransitionOperation`, `isTerminalOperationStatus`.
- **Idempotency logic (`idempotency.ts`, pure)** — `computeRequestFingerprint` (deterministic SHA-256 over canonicalized method+path+body, key-order-independent), `createIdempotencyRecord` (pending row + TTL), `decideIdempotency` (pure decision: `proceed` / `replay` / `in_progress` / **conflict** on fingerprint mismatch / `proceed` when expired), `completeIdempotencyRecord` (response snapshot patch with HTTP-status validation).
- **Migration `0007`** creates both tables (additive, non-destructive).

Both logic modules are pure over records (no I/O), so the API/persistence layer that wires them (a later task) owns inserts, updates, and race handling via the unique constraint.

## Files changed

- **Added:** `packages/database/src/{operation-schema,operations,idempotency-schema,idempotency}.ts`, `tests/idempotency.test.mjs`, `reports/T025-completion-report.md`.
- **Generated:** `drizzle/0007_t025_idempotency_and_operations.sql`, `meta/0007_snapshot.json`, `meta/_journal.json` (entry `idx: 7`).
- **Modified:** `packages/database/src/{schema,index}.ts` (barrel + public exports), `tests/auth.test.mjs` + `tests/tenancy.test.mjs` (schema-key lists += `idempotencyKeys`, `operations`), `tools/db-smoke.mjs` (added `operations`, `idempotency_keys` **and the previously-missed `outbox_events`/`inbox_events`** to `EXPECTED_TABLES`; comment `0000–0007`), `.github/workflows/ci.yml` (test list), `WORKSTREAM_REGISTRY.md` (T025 → In Review).

No new dependency; no root `package.json`/lockfile change; no new environment variable.

## Domain / schema / API / event changes

Two new tables (`operations`, `idempotency_keys`) via migration `0007`. No API routes yet (the operations/idempotency HTTP surface is a later API-layer task that consumes this logic). No new event.

## Tests and exact results

Full CI gate **locally**: `node --test` over all 18 test files → **187 pass, 0 fail**; `tsc -b` clean; `prettier --check .` clean; `eslint .` clean; `check:traceability` 100/100.

`tests/idempotency.test.mjs` (10): operation creation + validation; transition stamping (`started_at`/`completed_at`, version) ; illegal + out-of-terminal transitions rejected; progress range; fingerprint determinism/order-independence/body-sensitivity; pending record + TTL; **`decideIdempotency` proceed/replay/in_progress/conflict/expired**; response-status validation; table shapes; migration `0007` present and recorded at `entries[7]`.

**Verification limits (no live database):** logic runs pure; the transactional insert, the unique-constraint race, and cleanup of expired keys need Postgres — exercisable via the CI Postgres service (the migration-apply job applies `0007` and `db-smoke.mjs` now asserts both new tables plus the previously-unlisted outbox/inbox tables). A DB-backed integration test is a reasonable follow-up.

## Security & privacy analysis

- **Tenant isolation** — both tables carry `organization_id`; the unique idempotency key is scoped per tenant, so one tenant's key can never collide with or replay another's.
- **Fingerprint prevents key confusion** — replaying a key with a different request is a `CONFLICT`, not a silent wrong-response.
- `result`/`error`/`response_body` are documented as redacted of secrets (secrets live in the T015 vault, not in operation/idempotency payloads).
- Deterministic, no external calls; expired keys are reusable, bounding storage growth.

## Accessibility / performance / cost analysis

N/A UI (backend). Cost $0. Indexes keep the tenant status board, keyset listing, and expiry cleanup cheap; no unbounded scans. Idempotency turns client retries into O(1) lookups instead of duplicate work.

## External credentials or approvals

None.

## Rollback procedure

Revert the PR merge commit, or delete the four `src` files + `tests/idempotency.test.mjs`, the `0007` migration/snapshot + journal entry, revert `schema.ts`/`index.ts`, the two schema-key lists, the `db-smoke.mjs` additions, and the ci.yml entry, and set the T025 registry row to `Not Started`. `0007` is expand-only (a contract migration dropping the two tables reverses it). Non-destructive.

## Known limitations / follow-ups

1. **DB-backed integration** (transactional insert, unique-constraint race, expired-key cleanup) — deferred to a Postgres run.
2. **API surface** — the operations/idempotency HTTP endpoints (operations-api.md; Idempotency-Key header handling) are a later API-layer task that consumes `decideIdempotency`/`transitionOperation`.
3. **Retention job** — a maintenance job deleting expired `idempotency_keys` (via the T021 `maintenance` queue) is a follow-up.
4. Registry column counts for the new tables are templated; the implemented columns follow the documented vocabulary — reconcile with the doc owner if desired (consistent with earlier tasks).

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T025 → `In Review`.
- `packages/database/src/{operation,idempotency}*.ts` trace to `idempotency-strategy.md`, `api-idempotency.md`, `api-asynchronous-operations.md`, `operations-api.md`, `tables/platform-operations/idempotency-keys.md`.
- `tests/idempotency.test.mjs` provides operation-lifecycle, idempotency-decision, schema, and migration evidence.
