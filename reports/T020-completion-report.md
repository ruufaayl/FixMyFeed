# T020 — Completion Report

**Task:** T020 — Implement tenant-aware repositories (Epic E02 — Persistence, Jobs, Platform)
**Branch:** `task/T020-implement-tenant-aware-repositories` → PR into `develop`
**Depends on:** T010 (db framework), T012 (concrete tenancy repository) — merged. Generalizes their patterns.
**State transition:** `Not Started` → `In Review`

## What was built

A **reusable, generic tenant-aware repository framework** in `packages/database` that every future organization-owned business entity (catalogs, issues, repairs, …) composes — so tenant isolation is enforced once, centrally, instead of re-implemented per entity. T012 built the _concrete_ org/workspace/membership repository; T020 is the _reusable base_.

- **`tenant-repository.ts`** — `createTenantRepository(entity, persistence, options)` over a persistence **port** (`TenantEntityPersistence`). On every operation it enforces the repository invariants from `multi-tenant-architecture.md` / `data-plane-architecture.md`:
  - **Tenant isolation (deny by default):** reads, updates, and deletes are always scoped to the caller's `organization_id`; another tenant's row is invisible and unmodifiable. Scope is validated (UUID) on every call — never inferred.
  - **Optimistic concurrency:** mutations require the expected `version`; stale versions raise `TENANT_REPOSITORY_VERSION_CONFLICT`.
  - **Soft delete:** `deleted_at` rows are excluded from reads.
  - **Bounded keyset pagination:** stable `(created_at desc, id desc)` cursors with an enforced `maxLimit` — no unbounded scans.
- **`tenant-repository-errors.ts`** — `TenantRepositoryError` with stable codes (`TENANT_SCOPE_REQUIRED`, `INVALID_INPUT`, `NOT_FOUND`, `VERSION_CONFLICT`); secret-free messages.
- **`tests/tenant-repository.test.mjs`** (7 tests) — uses a faithful in-memory adapter to prove the invariants without a database.

The isolation logic lives in the repository over the port, so it is fully unit-testable now; the thin Drizzle SQL adapter (`createDrizzleTenantPersistence`) is the immediate next increment — it needs a live database, which is currently blocked (see below).

## Files changed

- **Added:** `packages/database/src/tenant-repository.ts`, `tenant-repository-errors.ts`, `tests/tenant-repository.test.mjs`.
- **Modified:** `packages/database/src/index.ts` (exports), `.github/workflows/ci.yml` (runs the new test).
- **Traceability:** `WORKSTREAM_REGISTRY.md` T020 → `In Review`.

No new dependency; no schema/migration (this is a code framework over the existing schema); no root `package.json`/lockfile change.

## Tests and exact results

Full CI gate **locally**: `node --test` over all 13 test files → **142 pass, 0 fail**; `prettier --check .` clean; `eslint .` clean; `check:traceability` 100/100.

`tests/tenant-repository.test.mjs` (7): scope validation (rejects missing/malformed org); create stamps the scope; **tenant isolation** (another tenant cannot find/get/update/delete a row, and the owner is unaffected); optimistic concurrency (stale version rejected); soft delete hides rows; bounded non-overlapping keyset pagination (over-large limit rejected); list never returns another tenant's rows.

## Security and privacy analysis

- Tenant isolation is the security property under test and is proven for every mutating and reading path; scope is mandatory and validated (deny by default; ownership never inferred — AGENTS.md).
- Error messages carry stable codes only — no secrets or persistence internals.
- Bounded pagination prevents unbounded scans (a DoS/perf guard).

## Accessibility / performance / cost

- Accessibility: N/A (data layer). Cost: $0 (no dependency/service). Performance: O(1) validation; pagination fetches `limit + 1` rows to compute the next cursor — bounded by design.

## Environment variables / external approvals

None.

## Rollback procedure

Revert the PR merge commit, or delete `tenant-repository.ts`/`tenant-repository-errors.ts`/`tests/tenant-repository.test.mjs`, remove the exports from `index.ts`, drop the ci.yml entry, and set the T020 registry row to `Not Started`. No schema/data involved — non-destructive.

## Known limitations / follow-ups

1. **Drizzle SQL adapter (`createDrizzleTenantPersistence`) is the next increment** — a thin binding that applies the scope in a real `WHERE organization_id = …` clause. It requires a live database to test (see below) and mirrors T012's `createDrizzleTenancyPersistence`.
2. **Real-database validation is blocked by CI runner availability.** The migration-apply job I added (real Postgres 17 + `drizzle-kit migrate` + audit-immutability smoke test) is merged on `develop`, but GitHub Actions is currently failing to acquire hosted runners ("job was not acquired by Runner of type hosted"), and this environment has no local Docker — so neither the migration chain nor any DB-backed adapter can be exercised end-to-end yet. This needs the runner/minutes/billing issue resolved (or a local Docker run).

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T020 → `In Review`.
- `tenant-repository.ts` traces to `multi-tenant-architecture.md`, `tenant-isolation-model.md`, `data-plane-architecture.md`.
- `tests/tenant-repository.test.mjs` provides the isolation/concurrency/soft-delete/pagination evidence.
