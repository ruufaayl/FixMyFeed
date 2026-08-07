# T061 — Completion Report

**Task:** T061 — Implement Merchant API account and product issue ingestion (Epic E06)
**Branch:** `task/T060-T065-google-merchant-connector` → PR into `develop`. **State:** Not Started → In Review

## Specifications read
- `implementation/tasks/T061-implement-merchant-api-account-and-product-issue-ingestion.md`
- `docs/05-integrations/google-merchant-center/{product-issues-integration,account-issues-integration,issue-rendering-integration,products-api-integration}.md`

## What was built
`packages/connectors/src/google/product-issues.ts` — ingestion of the Merchant API **item-level product issues** and **account-level issues** — the disapproval reasons that ARE the feed diagnostics. Pure; the worker performs HTTP paging.
- `buildProductStatusesRequest` — Merchant API `productStatuses` request (paged).
- `mapProductStatus` / `parseProductStatuses` — normalize item-level issues into `NormalizedProductIssue` with `NormalizedIssue` (code, servability, resolution, **derived severity** [disapproved→error, demoted→warning], description/detail/documentation, attribute, destination, affected countries).
- `buildAccountIssuesRequest` / `parseAccountIssues` — normalize account-level issues.

## Files changed
Added `google/product-issues.ts` + `tests/google-product-issues.test.mjs` + this report; wired `google/index.ts` + `ci.yml`. No dependency, env var, schema/migration, or boundary change (issues are normalized structures the diagnostics/persistence layer, E08/E07, will consume).

## Tests
`tests/google-product-issues.test.mjs` (3): productStatuses request/paging, item-level issue normalization + severity, account-issue request/parser. Part of the full local gate.

## Security & privacy
Read-only normalization; only feed-diagnostic issue data (no secrets, no PII). Documentation links preserved for user-facing remediation.

## Rollback / limitations
Revert the E06 PR or remove `google/product-issues.ts`. **Follow-up:** persistence of issues (E08 diagnostics / product-issues table) and the worker ingestion job are follow-ups; this task delivers the connector-side normalization.

## Traceability
`WORKSTREAM_REGISTRY.md` T061 → In Review; `google/product-issues.ts` ↔ `product-issues-integration.md`, `account-issues-integration.md`.
