# T034 — Completion Report

**Task:** T034 — Implement sync cursor and reconciliation framework (Epic E03)
**Branch:** `task/T034-implement-sync-cursor-and-reconciliation-framework` → PR into `develop`
**Depends on:** T030 (connector contract — cursor models) — merged.
**State transition:** `Not Started` → `In Review`

## Specifications read

- `implementation/tasks/T034-implement-sync-cursor-and-reconciliation-framework.md` (authority)
- `docs/04-system-architecture/consistency-and-reconciliation.md`, `docs/07-data-architecture/data-reconciliation.md`
- `docs/07-data-architecture/tables/stores-and-integrations/connector-sync-cursors.md`
- `docs/12-feature-specifications/F019-incremental-synchronization.md`, `F020-full-reconciliation.md`

## What was built

The last E03 framework: incremental **sync cursors** (persisted position) and a pure **reconciliation** diff.

- **Sync cursor table (`packages/database/src/connector-sync-cursor-schema.ts`, migration `0010`)** — `connector_sync_cursors`: tenant + `connector_id` + `object_type` (unique together), `cursor_model` (`none`/`timestamp`/`opaque`/`page`, mirroring T030's cursor models), `cursor_value` (watermark/token), `status` (`idle`/`running`/`error`), `last_synced_at` / `last_full_sync_at`, audit timestamps, optimistic `version`.
- **Cursor advancement (`packages/database/src/connector-sync-cursor.ts`, pure)** — `advanceCursor` enforces the critical safety property: a `timestamp` cursor is **monotonic** (equal or forward accepted; backward throws `SYNC_CURSOR_REGRESSION`, preventing skipped/reprocessed data from a stale value); `opaque`/`page` tokens are provider-owned and replaced; `none` never carries a value. `needsFullSync` gates the first full sync.
- **Reconciliation diff (`packages/connectors/src/reconciliation.ts`, pure)** — `reconcile(local, remote, options)` compares a local snapshot against the remote source of truth via caller-supplied `keyOf`/`fingerprintOf`, classifying each item as **added / updated / removed / unchanged** with a count summary. Deterministic and shape-neutral (order-preserving).

## Files changed

- **Added:** `packages/connectors/src/reconciliation.ts`, `packages/database/src/{connector-sync-cursor-schema,connector-sync-cursor}.ts`, `tests/sync-reconciliation.test.mjs`, `reports/T034-completion-report.md`.
- **Generated:** `drizzle/0010_t034_connector_sync_cursors.sql`, `meta/0010_snapshot.json`, `meta/_journal.json` (entry `idx: 10`).
- **Modified:** `packages/connectors/src/index.ts` + `packages/database/src/{schema,index}.ts` (exports), `tests/auth.test.mjs` + `tests/tenancy.test.mjs` (schema-key lists += `connectorSyncCursors`), `tools/db-smoke.mjs` (`EXPECTED_TABLES` += `connector_sync_cursors`; comment `0000–0010`), `.github/workflows/ci.yml` (test list), `WORKSTREAM_REGISTRY.md` (T034 → In Review).

No new dependency, no new environment variable, no boundary/architecture change.

## Domain / schema / API / event changes

One new table (`connector_sync_cursors`) via migration `0010`. No API routes; per-provider sync jobs (E04) consume this framework.

## Tests and exact results

Full CI gate **locally**: `node --test` over all 25 test files → **238 pass, 0 fail**; `tsc -b` clean; `eslint .` clean (0 errors); `check:traceability` 100/100; `check:backup-restore` passes. `prettier --check` is clean for all repository-owned files (see note below).

`tests/sync-reconciliation.test.mjs` (6): reconcile classifies added/updated/removed/unchanged with a summary; empty-local → all added, empty-remote → all removed; **timestamp cursor monotonicity (regression rejected, equal allowed, invalid rejected)**; opaque/page replace, none→null, candidate required; `needsFullSync` gating; `connector_sync_cursors` shape + migration `0010` (unique index, no DROP, journal `entries[10]`).

**Note on `prettier --check .`:** two untracked spec-overlay directories (`fixmyfeed-g-series-repo-overlay-v1.0.0/`, `fixmyfeed-growth-operations-specifications-v1.0.0/`) appeared in the working tree during this task; they are the same "reference material, not owned by tooling" genre as the already-`.prettierignore`d `feed-doctor-*` spec folders, but are not yet ignored. They are **not part of T034 and are not committed here** (staged explicitly). CI's `format:check` runs on the committed tree and is unaffected. Flagged to the owner to add to `.prettierignore` (or remove) separately.

## Security & privacy analysis

- **No data loss/duplication** — monotonic timestamp cursors prevent a stale value from skipping or reprocessing records; the unique `(org, connector, object_type)` index prevents divergent cursors.
- Tenant isolation via `organization_id`; reconciliation is pure over caller-supplied projections (no secrets, no I/O).

## Accessibility / performance / cost analysis

N/A UI. Cost $0. Reconciliation is O(local + remote) with a single hash map; cursor advancement is O(1).

## External credentials or approvals

None.

## Rollback procedure

Revert the PR merge commit, or delete the three `src` files + `tests/sync-reconciliation.test.mjs`, the `0010` migration/snapshot + journal entry, revert the barrels/exports, the two schema-key lists, the `db-smoke.mjs` addition, and the ci.yml entry, and set the T034 registry row to `Not Started`. `0010` is expand-only. Non-destructive.

## Known limitations / follow-ups

1. **Wiring** — the incremental-sync loop (load cursor → fetch page → reconcile → apply → `advanceCursor` → persist) is assembled by per-provider E04 sync jobs.
2. **Reconciliation-run/difference persistence** (`reconciliation_runs`, `reconciliation_differences` tables) is separate feed-processing work; this task provides the in-memory diff the runs record.
3. **`.prettierignore` for the new overlay spec directories** — see the note above; owner decision.

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T034 → `In Review`.
- `packages/connectors/src/reconciliation.ts` and `packages/database/src/connector-sync-cursor*.ts` trace to `consistency-and-reconciliation.md`, `data-reconciliation.md`, and `connector-sync-cursors.md`.
- `tests/sync-reconciliation.test.mjs` provides reconciliation, cursor-advancement, schema, and migration evidence.
