# T081 — Completion Report

**Task:** T081 — Implement structural and required attribute validators (Epic E08)
**Branch:** `task/T080-T087-diagnostics-engine`. **State:** Not Started → In Review

## What was built
`packages/diagnostics/src/validators/structural.ts` — the first concrete validator families on the T080 engine, over `CatalogProduct`.

**Required-attribute** (`requiredAttributeValidators`):
- `required.title` → `missing_title` (critical), `required.description` → `missing_description` (warning), `required.link` → `missing_link` (critical), `required.image` → `missing_image` (critical), `required.price` → `missing_price` (critical, satisfied if any variant has a valid price).

**Structural** (`structuralValidators`):
- `structural.no_variants` (error), `structural.duplicate_variant_ids` (error), `structural.invalid_price_format` (error, non-decimal price), `structural.negative_inventory` (warning).

Shared `validatorHelpers` (`isBlank`, `isValidPrice`) reused by later families.

## Files changed
Added `diagnostics/validators/structural.ts` + `tests/diag-validators-structural.test.mjs` + this report; wired `diagnostics/index.ts` + `ci.yml`. No dependency, env var, schema/migration, or boundary change.

## Tests
`tests/diag-validators-structural.test.mjs` (5): clean product = no issues (both families), all-missing product flags five required codes, price-satisfied-by-any-variant, structural four-code detection.

## Security & privacy
Pure; no secrets, no network. Evidence carries only the offending catalog value.

## Rollback / limitations
Revert the E08 PR or drop the file from the registered set. **Follow-up:** identity/variant validators (T082), image/URL (T083), landing-page/consistency (T084).

## Traceability
`WORKSTREAM_REGISTRY.md` T081 → In Review; `validators/structural.ts` ↔ structural / required-attribute validator specs.
