# T065 — Completion Report

**Task:** T065 — Implement issue resolution capability routing (Epic E06)
**Branch:** `task/T060-T065-google-merchant-connector`. **State:** Not Started → In Review

## Specifications read

- `implementation/tasks/T065-implement-issue-resolution-capability-routing.md`
- `docs/05-integrations/google-merchant-center/{issue-resolution-integration,google-appeal-workflow,restricted-actions-and-allowlists,automatic-improvements-integration}.md`

## What was built

`packages/connectors/src/google/resolution-routing.ts` — routes a Google Merchant issue to how it can be resolved, connecting diagnostics to the repair/writeback capabilities. Pure and **deny-by-default** (unknown issues are never auto-fixed).

- `routeIssueResolution(issue)` → `ResolutionPlan` { kind (`auto_fix`/`manual`/`appeal`/`unsupported`), normalized `attribute` (gtin/title/description/price/…), reason }. **Policy issues route to `appeal` before any attribute match**; store/landing-page and image issues route to `manual`; identifier/title/description/price map to `auto_fix` on a connector-neutral attribute that T044/T054 writeback translates.
- `routeProductIssues(product)` → per-issue plans + an `autoFixable` summary.

## Files changed

Added `google/resolution-routing.ts` + `tests/google-resolution-routing.test.mjs` + this report; wired `google/index.ts` + `ci.yml`. No dependency, env var, schema/migration, or boundary change.

## Tests

`tests/google-resolution-routing.test.mjs` (4): attribute auto-fixes, manual/appeal/unsupported routing, **policy-wins-over-attribute**, and product-level auto-fixability summary. Part of the full local gate.

## Security & privacy

Deny-by-default: unknown issues → `unsupported` (never silently auto-fixed); policy disapprovals → `appeal` (never treated as a data fix). Pure; nothing written here. Auto-fix maps only to a normalized attribute the consent-gated writeback (T044/T054) enacts.

## Rollback / limitations

Revert the E06 PR or remove `google/resolution-routing.ts`. **Follow-up:** the repair pipeline (E-repairs) consumes these plans, translating the normalized attribute to the source connector's writeback field under the approval workflow.

## Traceability

`WORKSTREAM_REGISTRY.md` T065 → In Review; `google/resolution-routing.ts` ↔ `issue-resolution-integration.md`, `google-appeal-workflow.md`, `restricted-actions-and-allowlists.md`.
