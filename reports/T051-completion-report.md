# T051 — Completion Report

**Task:** T051 — Implement WooCommerce catalog synchronization (Epic E05)
**Branch:** `task/T050-T054-woocommerce-source-connector` → PR into `develop` (E05 spans T050–T054).
**State transition:** `Not Started` → `In Review`

## Specifications read

- `implementation/tasks/T051-implement-woocommerce-catalog-synchronization.md` (authority)
- `docs/05-integrations/woocommerce/{woocommerce-product-model,woocommerce-variation-model,woocommerce-source-mapping,woocommerce-rest-api,woocommerce-image-model,woocommerce-inventory-model}.md`

## What was built

`packages/connectors/src/woocommerce/catalog.ts` — the pure catalog-sync pipeline that pages the WooCommerce REST products endpoint and maps each product into the **shared `NormalizedProduct` shape** (identical to the Shopify connector's output, so diagnostics are source-neutral).

- **`buildWooProductsUrl`** — paginated (`page`/`per_page`≤100), `orderby=modified&order=asc` for stable paging, optional `modified_after` incremental filter (validated ISO).
- **`mapWooProduct(raw, variations?)`** — maps status (`publish→active`, `private/trash→archived`, else `draft`), category→`productType`, tags, permalink→`onlineStoreUrl`, images; a **simple product becomes one synthetic variant** from its own sku/price/stock, a **variable product maps its variations**. GTIN is read from `global_unique_id` (WooCommerce 9+) into `barcode`; `regular_price`/`sale_price`, `stock_status`→`availableForSale`, `stock_quantity` surfaced for feed diagnostics.
- **`wooModifiedAt`** — `date_modified_gmt` (preferred) / `date_modified` for watermark advancement.

## Files changed

- **Added:** `packages/connectors/src/woocommerce/catalog.ts` (+ exports/tests). Reuses the normalized shape from `shopify/bulk-import` (a package-level catalog type). No dependency, env var, schema/migration, or boundary change.

## Tests and results

`tests/woocommerce.test.mjs` (T051): products URL (pagination/order/incremental + invalid timestamp), simple-product mapping (status/category/tags/GTIN/price/availability), variable-product variations, `wooModifiedAt`, required-field errors. Full local gate **278/278**, tsc/eslint clean, traceability 100/100.

## Security & privacy

Pure transformation; no secrets, no network, no persistence. Only catalog data is normalized (GTIN surfaced for diagnostics, not logged).

## Rollback / limitations

Revert the E05 PR or remove `woocommerce/catalog.ts`. **Follow-up:** the worker fetch loop (page → map → hand to reconciliation) and persistence into the normalized catalog (T073, not built) are follow-ups; variable-product variations require a second REST call the worker performs.

## Traceability

`WORKSTREAM_REGISTRY.md` T051 → In Review; `woocommerce/catalog.ts` ↔ `woocommerce-product-model.md`, `woocommerce-variation-model.md`, `woocommerce-source-mapping.md`.
