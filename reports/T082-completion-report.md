# T082 — Completion Report

**Task:** T082 — Implement product identity and variant validators (Epic E08)
**Branch:** `task/T080-T087-diagnostics-engine`. **State:** Not Started → In Review

## What was built
`packages/diagnostics/src/validators/identity.ts` — identity-quality validators on `CatalogProduct`, reusing the T074 GTIN/SKU normalizers.
- `isValidGtinChecksum(digits)` — mod-10 GTIN check-digit validation.
- `identity.gtin_format` → `invalid_gtin` (error): a variant GTIN that fails length or checksum.
- `identity.missing_identifier` → `missing_identifier` (warning): a variant with neither GTIN nor SKU (unmatchable).
- `identity.duplicate_sku` / `identity.duplicate_gtin` → `duplicate_sku` / `duplicate_gtin` (error): **catalog-scoped** — the same normalized identifier reused across different products.

## Files changed
Added `diagnostics/validators/identity.ts` + `tests/diag-validators-identity.test.mjs` + this report; wired `diagnostics/index.ts` + `ci.yml`. No dependency, env var, schema/migration, or boundary change.

## Tests
`tests/diag-validators-identity.test.mjs` (5): checksum accept/reject, clean catalog, bad-length + bad-checksum GTINs, missing identifier, cross-product duplicate SKU (case-normalized) + GTIN with the single-product-reuse negative case.

## Security & privacy
Pure; no secrets, no network. Evidence carries only the identifier value and product count.

## Rollback / limitations
Revert the E08 PR or drop the file from the registered set. Duplicate detection is catalog-scoped (needs the full product set). **Follow-up:** image/URL acquisition validators (T083), landing-page/consistency (T084).

## Traceability
`WORKSTREAM_REGISTRY.md` T082 → In Review; `validators/identity.ts` ↔ product-identity / variant validator specs.
