# T073 — Completion Report

**Task:** T073 — Implement normalized catalog and immutable snapshots (Epic E07)
**Branch:** `task/T070-T076-feed-ingestion-and-catalog`. **State:** Not Started → In Review

## What was built

`packages/database` — the persistence for the normalized catalog (migration `0011`).

- **`catalogs`** — a merchant's catalog per source (org + connector + external account, unique).
- **`catalog_products`** — normalized products: `external_id`, content `fingerprint`, and the domain `CatalogProduct` `payload` (jsonb); unique `(catalog, external_id)`, FK→catalogs cascade.
- **`catalog_snapshots`** — **immutable** point-in-time captures (snapshot hash + product count + captured_at; **no updated_at/version**), FK→catalogs cascade.
- Pure logic (`catalog.ts`): `catalogProductFingerprint`, `toCatalogProductRow`, `buildCatalogSnapshot` (order-independent content hash + count), `toCatalogSnapshotRow`.

## Files changed

Added `database/src/{catalog-schema,catalog}.ts`; generated `0011` migration/snapshot/journal; wired `schema.ts`/`index.ts`, `tests/auth.test.mjs`+`tests/tenancy.test.mjs` (schema-key lists += catalogs/catalogProducts/catalogSnapshots), `tools/db-smoke.mjs` (+3 tables; comment 0000–0011), `ci.yml`. No new dependency, env var, or boundary change.

## Tests

`tests/catalog.test.mjs` (4): fingerprint determinism/change-sensitivity, product row, order-independent snapshot hash + count, schema shape (snapshots immutable) + migration `0011`. Full local gate.

## Security & privacy

Tenant-scoped (`organization_id`); snapshots append-only/immutable; content-hash change detection avoids storing redundant history. No secrets.

## Rollback / limitations

Revert the E07 PR or delete the schema/migration + set the row to Not Started. `0011` is expand-only. **Follow-up:** the persist job (map connector NormalizedProduct → CatalogProduct → rows, capture a snapshot) is worker wiring.

## Traceability

`WORKSTREAM_REGISTRY.md` T073 → In Review; `catalog-schema.ts`/`catalog.ts` ↔ large-catalog-storage.md, historical-snapshot-storage.md, catalog table specs.
