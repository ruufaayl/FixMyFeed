# T071 — Completion Report

**Task:** T071 — Implement streaming CSV TSV XML and JSON parsers (Epic E07)
**Branch:** `task/T070-T076-feed-ingestion-and-catalog`. **State:** Not Started → In Review

## What was built
`packages/diagnostics/src/parsers.ts` — dependency-free, deterministic feed parsers → flat `FeedRecord[]` for schema mapping (T072).
- `parseDelimited`/`parseCsv`/`parseTsv` — an RFC 4180 state machine (quoted fields, embedded delimiters/newlines, `""` escapes), header-keyed rows.
- `parseJson` — array or `{products|items|entries:[...]}`; flat scalar fields only.
- `parseXml` — extracts RSS `<item>`/Atom `<entry>` items and their child element text, **stripping namespace prefixes** (`g:id`→`id`), decoding entities + CDATA.
- `parseFeed(format, text)` — dispatch.

The worker streams bytes; these operate on decoded text.

## Files changed
Added `diagnostics/parsers.ts` + `tests/diag-parsers.test.mjs` + this report; wired `diagnostics/index.ts` + `ci.yml`. No dependency, env var, schema/migration, or boundary change.

## Tests
`tests/diag-parsers.test.mjs` (5): CSV quoting/embedded delimiters/newlines, TSV, JSON (array/products/nested-ignored/errors), XML (g: namespace, entities, CDATA), dispatch. Part of the full local gate.

## Security & privacy
Pure parsing; bounded (no external entities, CDATA unwrapped as text — no XXE); malformed input → DiagnosticsError. No secrets.

## Rollback / limitations
Revert the E07 PR or remove `parsers.ts`. **Follow-up:** true byte-streaming for very large feeds is a worker concern; nested JSON/XML structures beyond flat records are handled by schema mapping (T072).

## Traceability
`WORKSTREAM_REGISTRY.md` T071 → In Review; `parsers.ts` ↔ streaming-parser + source-mapping specs.
