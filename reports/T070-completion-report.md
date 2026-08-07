# T070 — Completion Report

**Task:** T070 — Implement file upload and remote feed acquisition (Epic E07)
**Branch:** `task/T070-T076-feed-ingestion-and-catalog` → PR into `develop` (E07 built as one PR spanning T070–T076). **State:** Not Started → In Review

## What was built

Foundational: `packages/domain/src/catalog.ts` — the **canonical `CatalogProduct` shape** (source-neutral; connectors produce it, database persists it, diagnostics validate it). Wired the `diagnostics` package (deps: domain, database) and its `DiagnosticsError` envelope.

`packages/diagnostics/src/acquisition.ts` (T070) — pure validation for acquiring a feed (upload or URL):

- `validateFeedUrl` — **HTTPS only + private-host SSRF guard** (localhost/127./10./192.168./172.16-31./169.254./.local).
- `detectFeedFormat` — infer csv/tsv/xml/json from content type / filename.
- `validateFeedSource` — validate kind, resolve format, enforce `MAX_FEED_BYTES` (100 MB), SSRF-check URL sources.

Fetch + object-storage persistence are app-wired (injected T023 storage); no network here.

## Files changed

Added `domain/catalog.ts`, `diagnostics/{errors,acquisition}.ts`; wired `domain/index.ts`, `diagnostics/{package.json,index.ts}`, `pnpm-lock.yaml`, `ci.yml`. No new env var, schema/migration, or boundary change (diagnostics already in the graph; its declared deps ⊆ allow-list).

## Tests

`tests/diag-acquisition.test.mjs` (3): URL SSRF/https validation, format detection, feed-source validation (size cap, SSRF, unknown format). Part of the full local gate.

## Security & privacy

SSRF guard on untrusted feed URLs; size cap bounds abuse; no secrets. Deep SSRF hardening is the app fetch layer's job.

## Rollback / limitations

Revert the E07 PR or remove the added files. **Follow-up:** the fetch+store job over injected storage is app wiring.

## Traceability

`WORKSTREAM_REGISTRY.md` T070 → In Review; catalog type ↔ E07; acquisition ↔ feed acquisition specs.
