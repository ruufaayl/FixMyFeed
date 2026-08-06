# T016 — Completion Report

**Task:** T016 — Implement immutable audit logging (Epic E01)
**Branch:** `task/T016-implement-immutable-audit-logging` → PR into `develop`
**Depends on:** T010 (migration framework), T012 (tenancy) — merged.
**State transition:** `Not Started` → `In Review`

## Specifications read

- `/AGENTS.md`, `/IMPLEMENTATION_BASELINE.md`, `/implementation/epics/E01-*.md`, `/implementation/tasks/T016-*.md`.
- `docs/07-data-architecture/tables/platform-operations/audit-logs.md`, `immutable-record-policy.md`, `auditability-policy.md`, `schema-versioning.md`; `PHYSICAL_SCHEMA_REGISTRY.md`.
- Reviewed merged `packages/database` migration layout and column conventions (T010/T011/T012/T014).

## What was built

An **append-only, tamper-evident** audit log:

- **`packages/database/src/audit-schema.ts`** — `audit_logs` table. It is immutable by design: **no `updated_at`, `version`, or `deleted_at`** (audit rows are never mutated or soft-deleted). Records actor (`actor_user_id`/`actor_type`), `action` category, resource, `outcome`, `code`, `operation_id`, redacted `payload`, `occurred_at`, and a **hash chain** (`prev_hash` + `hash`, hex sha-256, format-checked). `organization_id`/`actor_user_id` are plain columns (no FK) so audit history survives deletion of the org/user it describes.
- **`packages/database/src/audit-hash.ts`** — pure, deterministic (`node:crypto`) `computeAuditHash()` and `verifyAuditChain()`. Each record's hash covers a canonical (key-sorted) serialization of its content plus the previous record's hash, so any mutation, deletion, or reordering breaks the chain and is reported with the first broken index.
- **Migration `0003`** (`drizzle-kit generate` + a hand-appended guard): creates `audit_logs` and installs a **database-level immutability trigger** (`BEFORE UPDATE OR DELETE ... RAISE EXCEPTION`), so append-only is enforced in PostgreSQL, not just the application.
- **`tests/audit.test.mjs`** (8 tests).

## Files changed

- **Added:** `packages/database/src/audit-schema.ts`, `packages/database/src/audit-hash.ts`.
- **Modified:** `packages/database/src/schema.ts` (barrel) + `src/index.ts` (exports).
- **Generated + edited:** `packages/database/drizzle/0003_t016_immutable_audit_logs.sql` (with appended trigger), `meta/0003_snapshot.json`, `meta/_journal.json` (entry `idx: 3`).
- **Added:** `tests/audit.test.mjs`; **Modified:** `tests/auth.test.mjs`, `tests/tenancy.test.mjs` (schema-aggregation key lists += `auditLogs`).
- **Modified:** `.github/workflows/ci.yml` (runs the new test file).
- **Traceability:** `WORKSTREAM_REGISTRY.md` T016 → `In Review`.

No new runtime dependency; **no root `package.json`/`pnpm-lock.yaml` change**.

## Tests and exact results

`tests/audit.test.mjs` — **8 pass, 0 fail**: hash determinism + hex format; payload-key-order independence but content/`prevHash` sensitivity; chain verification accepts a valid chain; **detects a mutated record** (breaks at the tampered index); **detects a deleted/reordered record** (broken link); `audit_logs` is append-only (asserts absence of `updated_at`/`version`/`deleted_at`); migration creates the table + immutability trigger and is non-destructive; journal records `0003` in order.

`pnpm run check` (`format:check && lint && typecheck && test && check:traceability`) — **exit 0** (`test` script suite 48/48; traceability 100/100). Combined CI test list (incl. `audit.test.mjs`) runs on the PR.

**Verification limits (no live database):** T005 (docker-local Postgres) is not merged, so the migration and the immutability trigger were not applied end-to-end. Evidence is `tsc -b` clean, offline `drizzle-kit generate` producing a clean additive `0003`, the migration SQL assertions (trigger present, no destructive ops), and full hash-chain unit tests. The trigger's runtime behavior should be exercised once T005 lands.

## Security and privacy analysis

- **Tamper-evidence:** the hash chain makes silent mutation/deletion detectable; the DB trigger blocks UPDATE/DELETE outright. Together they give defense in depth for the audit trail (immutable-record-policy.md).
- No secrets stored; `payload` is documented as redacted upstream. Hashes are of content, not secrets.
- Audit rows deliberately survive org/user deletion (no FK cascade), preserving the record of who did what.

## Accessibility analysis

Not applicable — schema/data layer, no UI.

## Performance and cost analysis

- **Cost:** $0. No new dependency or service.
- **Performance:** append is O(1) plus one sha-256; indexes on `(organization_id, occurred_at desc)`, `action`, and `hash` support tenant-scoped reads and chain lookups. Chain verification is O(n) over the verified slice.

## Environment variables added / external approvals

None.

## Rollback procedure

Revert the PR merge commit. DB rollback: `0003` is expand-only — a contract migration dropping the trigger, function, and `audit_logs` table fully reverses it. Locally: delete `audit-schema.ts`/`audit-hash.ts`, the `0003` migration/snapshot + journal entry, revert `schema.ts`/`index.ts`, remove the `auditLogs` key from the two test schema lists, drop the ci.yml entry, and set the T016 registry row back to `Not Started`.

## Known limitations / follow-ups

1. **Registry column count:** `PHYSICAL_SCHEMA_REGISTRY.md` lists `audit_logs` = 14; the implementation is 15 columns (the hash-chain pair plus the documented fields). The source spec is templated with no exact column list; flagged for the doc owner to reconcile (I did not unilaterally rewrite the authoritative count — consistent with T014's stance).
2. **Trigger not tracked by Drizzle snapshots:** the immutability trigger lives in the migration SQL (Drizzle does not diff triggers). A future `drizzle-kit generate` will not drop it, but the trigger is maintained by hand in migrations — documented here.
3. **Append serialization:** the hash chain assumes appends are serialized per chain scope; concurrent appends must be ordered by the writing repository (operational concern for the audit-write path, a later wiring task).
4. **No live-DB apply/trigger test** until T005 merges.

## Coordination (Codex / T015)

- T016 creates migration **`0003`**. **Codex's T015 (encrypted credential vault) is also a `0003` candidate** off merged T014. Whichever merges second must **rebase and regenerate as `0004`**. Recommend agreeing an order; I'll notify on T016 merge.
- Shared files both tasks touch (resolve on the later rebase): `packages/database/src/schema.ts`, `drizzle/meta/_journal.json`, `.github/workflows/ci.yml`, and the **full-schema key lists in `tests/auth.test.mjs` + `tests/tenancy.test.mjs`** (every new table must be added to both).

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T016 → `In Review`.
- `audit-schema.ts` + `audit-hash.ts` trace to `audit-logs.md`, `immutable-record-policy.md`, `auditability-policy.md`.
- `tests/audit.test.mjs` provides tamper-evidence, immutability, and additive-migration evidence.
