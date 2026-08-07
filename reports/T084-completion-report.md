# T084 — Completion Report

**Task:** T084 — Implement landing page and consistency validators (Epic E08)
**Branch:** `task/T080-T087-diagnostics-engine`. **State:** Not Started → In Review

## What was built

`packages/diagnostics/src/validators/consistency.ts` — two layers over `CatalogProduct`.

**Consistency** (`consistencyValidators`, pure/sync):

- `consistency.compare_at_price` → `invalid_compare_at_price` (warning, compare-at below price).
- `consistency.availability_inventory` → `available_without_inventory` (warning) / `unavailable_with_inventory` (info).
- `consistency.title_length` → `title_too_long` (info, >150) / `consistency.description_length` → `description_too_long` (info, >5000).

**Landing-page** (`checkLandingPages(products, probe)`, async):

- Injected `LandingPageProbe` port (`fetch(url) → LandingPageFacts | null`); **no in-package network**, adapter enforces SSRF.
- Emits `landing_page_unavailable` (error), `landing_page_price_mismatch` (warning, vs feed min price), `missing_structured_data` (info). Null facts (unfetchable — covered by T083) are skipped. Each URL fetched once.

## Files changed

Added `diagnostics/validators/consistency.ts` + `tests/diag-validators-consistency.test.mjs` + this report; wired `diagnostics/index.ts` + `ci.yml`. No dependency, env var, schema/migration, or boundary change.

## Tests

`tests/diag-validators-consistency.test.mjs` (4): clean product, four-code consistency detection, landing-page unavailable/mismatch/missing-structured-data (+ clean product yields nothing), null-facts skipped.

## Security & privacy

Pure package; landing-page probe injected and SSRF-guarded by the adapter. Evidence carries only prices/lengths, no page content.

## Rollback / limitations

Revert the E08 PR or drop the file. Landing-page checks need a caller-supplied probe (wired in the scan worker). **Follow-up:** issue normalization/dedup/lifecycle (T085), scoring (T086), orchestration (T087).

## Traceability

`WORKSTREAM_REGISTRY.md` T084 → In Review; `validators/consistency.ts` ↔ landing-page / consistency validator specs.
