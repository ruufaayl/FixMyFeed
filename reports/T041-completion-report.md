# T041 — Completion Report

**Task:** T041 — Implement Shopify bulk catalog import (Epic E04)
**Branch:** `task/T041-implement-shopify-bulk-catalog-import` → PR into `develop`
**Depends on:** T040 (Shopify OAuth/contract), T030 (connector contract) — merged. (Downstream T073 normalized-catalog persistence is not yet built — see limitations.)
**State transition:** `Not Started` → `In Review`

## Specifications read

- `implementation/tasks/T041-implement-shopify-bulk-catalog-import.md` (authority)
- `docs/05-integrations/shopify/{shopify-bulk-operations,shopify-product-model,shopify-source-mapping,shopify-product-status-model}.md`
- `packages/connectors/src/shopify/*` (the T040 Shopify connector this extends)

## What was built

The **pure Shopify bulk-import pipeline** in `packages/connectors/src/shopify/bulk-import.ts` — everything needed to turn a Shopify store's catalog into normalized products, with no network and no persistence (the app runs the GraphQL request and downloads the JSONL; this module builds requests and transforms text/objects).

- **Bulk-operation lifecycle** — `SHOPIFY_BULK_STATUSES` (`CREATED`/`RUNNING`/`COMPLETED`/`CANCELING`/`CANCELED`/`FAILED`/`EXPIRED`) with `isBulkTerminal` / `isBulkComplete`, so the orchestrating job (a T025 `operation`) knows when the JSONL result is ready.
- **Bulk query** — `SHOPIFY_PRODUCT_BULK_QUERY` (products + nested variants + media, incl. `barcode` for GTIN diagnostics) and `buildProductBulkRunMutation` which wraps it in `bulkOperationRunQuery`.
- **JSONL reconstruction** — `parseBulkJsonl` rebuilds the product tree from Shopify's flattened JSONL: top-level lines are products; child lines attach to their product via `__parentId` (variant lines → variants, image-bearing lines → images); blank lines are ignored, orphans skipped, malformed lines rejected.
- **Source mapping** — `mapShopifyProduct` normalizes a Shopify product node into `NormalizedProduct` / `NormalizedVariant` / `NormalizedImage` (status `ACTIVE`/`ARCHIVED`/`DRAFT` → `active`/`archived`/`draft`; barcode/sku/price/inventory surfaced for feed diagnostics). This normalized shape is the connector's output contract, ready for T073 persistence and T080–T087 diagnostics.

## Files changed

- **Added:** `packages/connectors/src/shopify/bulk-import.ts`, `tests/shopify-bulk-import.test.mjs`, `reports/T041-completion-report.md`.
- **Modified:** `packages/connectors/src/shopify/index.ts` (exports), `.github/workflows/ci.yml` (test list), `WORKSTREAM_REGISTRY.md` (T041 → In Review).

No new dependency, no new environment variable, no schema/migration, no boundary/architecture change.

## Domain / schema / API / event changes

None new. The normalized product shape is an in-memory connector output; the import run is orchestrated by an existing T025 `operation`; persistence lands when T073 (normalized catalog) is built.

## Tests and exact results

Full CI gate **locally**: `node --test` over all 27 test files → **249 pass, 0 fail**; `tsc -b` clean; ESLint clean (0 errors); `check:traceability` 100/100; `check:backup-restore` passes. Repo-owned files are Prettier-clean (see note).

`tests/shopify-bulk-import.test.mjs` (5): bulk status/terminal/complete classification; mutation wrapping + query shape; `mapShopifyProduct` field/status/children normalization + required-field errors; **`parseBulkJsonl` reconstructs products with variants and images via `__parentId`** (with blank-line and orphan handling); empty input → no products, malformed line → `ConnectorError`.

**Note on `prettier --check .`:** the two untracked spec-overlay directories are still the only source of `prettier --check .` warnings; **not part of T041, not committed** (staged explicitly). Repo-owned files are clean; CI (committed tree) is unaffected.

## Security & privacy analysis

- Pure transformation — no secrets, no network, no persistence; the access token and GraphQL transport stay in the app.
- Defensive parsing — untrusted JSONL is validated per line (malformed → error), orphan children are dropped, and only string tags survive normalization.
- The normalized shape carries only catalog data (no credentials); barcode/GTIN is surfaced for diagnostics, not logged.

## Accessibility / performance / cost analysis

N/A UI. Cost $0. `parseBulkJsonl` is a single O(lines) pass with a product map; suitable for streaming large catalogs line-by-line in a follow-up if needed.

## External credentials or approvals

A live import needs the store's OAuth token (from T040, in the T015 vault) and Shopify Admin API access; none required for CI.

## Rollback procedure

Revert the PR merge commit, or delete `packages/connectors/src/shopify/bulk-import.ts` + `tests/shopify-bulk-import.test.mjs`, remove their exports from `shopify/index.ts`, drop the ci.yml entry, and set the T041 registry row to `Not Started`. Non-destructive.

## Known limitations / follow-ups

1. **Persistence** — mapped `NormalizedProduct`s are not yet stored; the normalized-catalog tables + immutable snapshots are **T073** (E07, not built). This task delivers the connector-side pipeline that feeds it.
2. **Orchestration wiring** — the worker job that runs the bulk mutation, polls status, downloads the JSONL, and calls `parseBulkJsonl` (as a T025 operation, honoring T033 rate limits) is an `apps/worker` task.
3. **Streaming** — very large catalogs could be parsed line-by-line rather than whole-string; deferred until a real dataset warrants it.

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T041 → `In Review`.
- `packages/connectors/src/shopify/bulk-import.ts` traces to `shopify-bulk-operations.md`, `shopify-product-model.md`, `shopify-source-mapping.md`, `shopify-product-status-model.md`.
- `tests/shopify-bulk-import.test.mjs` provides lifecycle, mutation, mapping, and JSONL-reconstruction evidence.
