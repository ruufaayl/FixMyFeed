# T076 — Completion Report

**Task:** T076 — Implement full reconciliation and discrepancy records (Epic E07)
**Branch:** `task/T070-T076-feed-ingestion-and-catalog`. **State:** Not Started → In Review

## What was built

Full reconciliation of a source-of-truth catalog against a downstream/observed view, with persisted discrepancy records.

**Schema (`packages/database`)** — `reconciliation-schema.ts`: append-only `catalog_discrepancies` table (org, catalog FK cascade, `run_id` grouping one pass, `kind` check-constrained, `external_id`, `matched_on`, `fields` jsonb, `detected_at`). Immutable — no `updated_at`/`version`, like snapshots. **Migration 0012** (`0012_t076_catalog_discrepancies.sql`, generated via drizzle-kit; renamed to convention, journal tag fixed). Registered in `schema.ts` + exported from `index.ts`.

**Logic (`packages/diagnostics`)** — `reconciliation.ts`:

- `reconcileCatalogs(source, downstream)` — pairs products by strongest identity (T074 matcher: GTIN > SKU > id); unpaired source = **missing_downstream**, unpaired downstream = **extra_downstream**, paired-but-drifted = **field_mismatch** (differing scalar fields, tags, and per-variant price/availability). Returns discrepancies + summary + `inSync`.
- `toCatalogDiscrepancyRow(org, catalog, runId, discrepancy, detectedAt)` — maps to the insert row.

## Files changed

Added `database/reconciliation-schema.ts`, `database/drizzle/0012_*.sql` (+ meta snapshot/journal), `diagnostics/reconciliation.ts`, `tests/diag-reconciliation.test.mjs`, this report. Edited `database/{schema,index}.ts`, `diagnostics/index.ts`, `tools/db-smoke.mjs` (expected tables + 0000–0012), `tests/{auth,tenancy}.test.mjs` (schema-key lists), `ci.yml`. No boundary change.

## Tests

`tests/diag-reconciliation.test.mjs` (4): missing/extra/field_mismatch classification + inSync, identical-catalog inSync, row mapping, schema + migration-0012 assertions. `auth`/`tenancy` schema-key tests updated. Full local gate + migration-apply covers the new table via db-smoke.

## Security & privacy

Pure comparison logic; no secrets. Discrepancy records store only product identifiers and changed field names, not credentials.

## Rollback / limitations

Revert the E07 PR; migration 0012 only adds a table (no destructive DDL). **Follow-up:** the reconciliation worker persists rows and feeds discrepancies into the E08 issue lifecycle.

## Traceability

`WORKSTREAM_REGISTRY.md` T076 → In Review; `reconciliation.ts` + `catalog_discrepancies` ↔ full-reconciliation / discrepancy-record specs.
