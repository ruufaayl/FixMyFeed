# T072 — Completion Report

**Task:** T072 — Implement schema mapping and import preview (Epic E07)
**Branch:** `task/T070-T076-feed-ingestion-and-catalog`. **State:** Not Started → In Review

## What was built

`packages/diagnostics/src/schema-mapping.ts` — maps arbitrary feed columns to the canonical Merchant Center attributes and previews import readiness. Pure and deterministic.

- `FEED_ATTRIBUTES` (id, title, description, link, image_link, price, gtin, brand, …) + `REQUIRED_FEED_ATTRIBUTES`.
- `inferMapping(headers)` — alias-based auto-detection (normalized header match; each attribute claimed once).
- `applyMapping(record, mapping)` — re-key a record by canonical attribute (drops empties).
- `buildImportPreview(records, {mapping, sampleSize})` — total records, mapped/unmapped columns, **required-attribute coverage**, `ready` flag, and a normalized sample.

This is the core of the free-audit UX: upload/point at a feed → see exactly what maps and what's missing.

## Files changed

Added `diagnostics/schema-mapping.ts` + `tests/diag-schema-mapping.test.mjs` + this report; wired `diagnostics/index.ts` + `ci.yml`. No dependency, env var, schema/migration, or boundary change.

## Tests

`tests/diag-schema-mapping.test.mjs` (4): alias inference, single-claim, apply (drop empties), preview coverage/readiness/sample/unmapped + errors. Part of the full local gate.

## Security & privacy

Pure; no secrets, no persistence. Only maps declared feed columns.

## Rollback / limitations

Revert the E07 PR or remove `schema-mapping.ts`. **Follow-up:** manual mapping overrides + persistence of the chosen mapping are UI/app concerns; the mapping feeds the CatalogProduct build (T073).

## Traceability

`WORKSTREAM_REGISTRY.md` T072 → In Review; `schema-mapping.ts` ↔ source-mapping specs.
