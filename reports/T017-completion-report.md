# T017 — Completion Report

**Task:** T017 — Implement support access grants (Epic E01)
**Branch:** `task/T017-implement-support-access-grants` → PR into `develop`
**Depends on:** T012 (tenancy), T013 (RBAC), T016 (audit) — all merged.
**State transition:** `Not Started` → `In Review`

## Context: reassigned from Codex

Codex hit its weekly limit (offline until 2026-08-11). It had **completed T015** (encrypted credential vault — merged, Verified, migration `0004`) but **never started T017** (no branch; registry `Not Started`). Per owner direction I picked up T017 fresh from `develop` (`e8efa3d`).

## What was built

A time-boxed **support access grant** — a temporary, expiring overlay that lets an internal support/administrator user act within a tenant, **not** a permanent membership (`authorization-matrix.md`: "Support grants are time-boxed overlays, not permanent memberships").

- **`packages/database/src/support-access-schema.ts`** — `support_access_grants` table: tenant-scoped (`organization_id` FK, restrictive), `support_user_id`/`granted_by_user_id`/`revoked_by_user_id` FKs, `reason`, `scope` (read_only/diagnostics/full), `status` (active/expired/revoked), `granted_at`/`expires_at` (**required window, `expires_at > granted_at` check**), `revoked_at`, optimistic `version`, audit timestamps. Mutable with optimistic concurrency (unlike the immutable audit log).
- **`packages/database/src/support-access.ts`** — pure, deterministic lifecycle logic: `isSupportGrantActive` (active ∧ unrevoked ∧ within window), `deriveSupportGrantStatus` (clock/revocation → status), `validateSupportGrantInput` (required actors, bounded reason, known scope, positive & **bounded (≤7d) duration**, rejects self-grant), `activeSupportScopes`, and a `SupportAccessError` envelope.
- **Migration `0005`** (`drizzle-kit generate`): creates the table with all checks/FKs/indexes. Additive, non-destructive.
- **`tests/support-access.test.mjs`** (9 tests).

## Integration with my earlier tasks

- **T013 RBAC:** granting is gated by the existing `support-access:grant` permission (Administrator-only) in `packages/domain/src/rbac/roles.ts` — T017 does not add a new authorization check.
- **T016 audit:** grant/activation/revocation are recorded via the immutable `audit_logs` `support_access` action category.
- **T014 sessions:** support access relates to the `impersonated_by_user_id` session column (acting-as-tenant); `activeSupportScopes` is the hook a session/authorization layer uses.

## Files changed

- **Added:** `packages/database/src/support-access-schema.ts`, `support-access.ts`, `tests/support-access.test.mjs`.
- **Modified:** `packages/database/src/schema.ts` (barrel) + `src/index.ts` (exports).
- **Generated:** `drizzle/0005_t017_support_access_grants.sql`, `meta/0005_snapshot.json`, `meta/_journal.json` (entry `idx: 5`).
- **Modified:** `tests/auth.test.mjs`, `tests/tenancy.test.mjs` (schema-key lists += `supportAccessGrants`).
- **Modified:** `.github/workflows/ci.yml` — added `tests/support-access.test.mjs` **and `tests/auth.test.mjs`** (the latter fixes a pre-existing gap: `auth.test.mjs` ran only in pre-push, never in CI — so its schema-key assertion wasn't CI-validated).
- **Traceability:** `WORKSTREAM_REGISTRY.md` T017 → `In Review`.

No new runtime dependency; no root `package.json`/`pnpm-lock.yaml` change.

## Tests and exact results

Full CI gate run **locally** (my post-T014-regression rule): `node --test` over all 12 test files → **135 pass, 0 fail**; `prettier --check .` clean; `eslint .` clean; `check:traceability` 100/100.

`tests/support-access.test.mjs` (9): closed scope/status catalogs; `isSupportGrantActive` across active/expired/pre-start/revoked; status derivation; input validation primary + **7 failure paths** (empty actor, empty/oversized reason, unknown scope, non-positive window, self-grant, over-max duration); `activeSupportScopes` filters to effective grants; table is tenant-scoped/time-boxed/versioned; migration `0005` additive; journal `entries[5]` fixed-index check (the hardened pattern Codex and I now share).

**Verification limits (no live database):** T005 (docker-local Postgres) still unmerged — migration `0005` was not applied end-to-end. Verified via `tsc -b`, offline `drizzle-kit generate`, and pure-logic + schema-shape tests. (Same standing gap as T014/T016; see the outstanding request to merge T005 and run a real migrate.)

## Security and privacy analysis

- **Least privilege + time-boxing:** grants carry a bounded scope and a mandatory, bounded expiry window; `isSupportGrantActive` denies by default outside `[granted_at, expires_at)`, when revoked, or when status ≠ active.
- **Separation of duties:** a user cannot grant support access to themselves (validation) and granting requires the `support-access:grant` permission.
- Tenant-scoped FKs are restrictive; `payload` is documented as redacted/minimized. No secrets stored.

## Accessibility analysis

Not applicable — schema/data layer, no UI.

## Performance and cost analysis

- **Cost:** $0. No new dependency or service.
- **Performance:** indexes on `(organization_id, expires_at desc)`, `support_user_id`, and `(status, expires_at)` support tenant-scoped active-grant lookups and an expiry sweep. Validity checks are O(1).

## Environment variables added / external approvals

None.

## Rollback procedure

Revert the PR merge commit. DB rollback: `0005` is expand-only — a contract migration dropping `support_access_grants` reverses it. Locally: delete `support-access-schema.ts`/`support-access.ts`/`tests/support-access.test.mjs`, the `0005` migration/snapshot + journal entry, revert `schema.ts`/`index.ts`, remove `supportAccessGrants` from the two test schema lists, drop the ci.yml additions, and set the T017 registry row back to `Not Started`.

## Known limitations / follow-ups

1. **Registry column count:** `PHYSICAL_SCHEMA_REGISTRY.md` lists `support_access_grants` = 14; the implementation is 16 (bounded scope/lifecycle plus the documented column vocabulary). Templated spec, no exact column list — flagged for the doc owner (consistent with T014/T016).
2. **RBAC overlay wiring** (combining active grant scopes with membership roles at `evaluatePermission` time) is the T013↔T017 seam; `activeSupportScopes` provides the input, but the composed evaluation belongs to the authorization/service layer (a later wiring task).
3. **Expiry sweep / activation semantics** (a job that flips `active`→`expired`) is an operational concern for the jobs runtime (E02); `deriveSupportGrantStatus` provides the deterministic rule it will use.
4. **No live-DB apply test** until T005 merges.

## Coordination (Codex)

- T017 = migration **`0005`** (after T015's `0004`). No overlap risk with Codex right now (offline; T015 already merged).
- When Codex returns: the shared **schema-key lists** in `tests/auth.test.mjs`/`tests/tenancy.test.mjs`, the `schema.ts` barrel, `_journal.json`, and `ci.yml` now include `supportAccessGrants`/`0005`. Journal tests remain fixed-index (`entries[5]`), so future migrations won't break T017's test.

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T017 → `In Review`.
- `support-access-schema.ts` + `support-access.ts` trace to `authorization-matrix.md`, `privileged-access-management.md`, `support-tooling-architecture.md`, `support-access-grants.md`.
- `tests/support-access.test.mjs` provides lifecycle, validation, and additive-migration evidence.
