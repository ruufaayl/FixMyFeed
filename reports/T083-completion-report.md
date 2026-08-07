# T083 — Completion Report

**Task:** T083 — Implement image and URL acquisition validators (Epic E08)
**Branch:** `task/T080-T087-diagnostics-engine`. **State:** Not Started → In Review

## What was built

`packages/diagnostics/src/validators/media.ts` — two layers over `CatalogProduct`.

**Structural** (`mediaValidators`, pure/sync):

- `image.url_format` → `invalid_image_url` (error) / `insecure_image_url` (warning, http).
- `image.missing_alt` → `missing_image_alt` (info).
- `link.url_format` → `invalid_link_url` (error) / `insecure_link_url` (warning).
- `isHttpUrl(value)` helper (absolute http(s) only).

**Acquisition** (`checkUrlAcquisition(products, probe)`, async):

- Injected `UrlProbe` port (`probe(url) → {ok, status, contentType}`); **the package makes no network calls** — the adapter enforces the SSRF policy.
- Emits `image_unreachable` / `link_unreachable` (error) and `image_bad_content_type` (error, non-image response). Each distinct URL is probed at most once.

## Files changed

Added `diagnostics/validators/media.ts` + `tests/diag-validators-media.test.mjs` + this report; wired `diagnostics/index.ts` + `ci.yml`. No dependency, env var, schema/migration, or boundary change.

## Tests

`tests/diag-validators-media.test.mjs` (5): `isHttpUrl`, clean product, invalid/insecure/missing-alt structural cases, acquisition (unreachable + bad content type + reachable-yields-nothing), URL-probed-once dedupe.

## Security & privacy

Pure package; the probe port is injected and MUST enforce HTTPS-only + no private hosts (per T070 `validateFeedUrl`). Evidence carries only URLs and HTTP status/content-type.

## Rollback / limitations

Revert the E08 PR or drop the file. Acquisition requires a caller-supplied probe adapter (wired in the scan worker). **Follow-up:** landing-page + consistency validators (T084).

## Traceability

`WORKSTREAM_REGISTRY.md` T083 → In Review; `validators/media.ts` ↔ image / URL-acquisition validator specs.
