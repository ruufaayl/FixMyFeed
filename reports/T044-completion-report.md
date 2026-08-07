# T044 — Completion Report

**Task:** T044 — Implement Shopify controlled writeback (Epic E04)
**Branch:** `task/T044-implement-shopify-controlled-writeback` → PR into `develop`
**Depends on:** T040 (Shopify connector), T043 (product fingerprint) — merged. Consumes T013 (RBAC) / approval workflow at the app layer.
**State transition:** `Not Started` → `In Review`

## Specifications read

- `implementation/tasks/T044-implement-shopify-controlled-writeback.md` (authority)
- `docs/05-integrations/shopify/{shopify-writeback,shopify-writeback-conflicts,shopify-graphql-admin-api}.md`
- `packages/connectors/src/shopify/{reconciliation,bulk-import}.ts` (fingerprint + normalized shape)

## What was built

**Controlled, deny-by-default, consent-gated** Shopify writeback in `packages/connectors/src/shopify/writeback.ts` — the highest-risk connector action, so every safety gate is explicit and pure. The worker performs the GraphQL call idempotently and records the audited change-set.

- **Allow-list (deny by default)** — only `WRITEBACK_ALLOWED_PRODUCT_FIELDS` (title, descriptionHtml, productType, vendor, tags) and `WRITEBACK_ALLOWED_VARIANT_FIELDS` (barcode/GTIN, sku, price, compareAtPrice) may be written; **any other field is rejected**, and gids are validated. Empty change sets are rejected.
- **Consent gate (never inferred)** — `assertWritebackAuthorized` refuses a plan unless it carries `approved: true` **and** an `approvalId`, plus an idempotency key. This enforces the spec rule _"never infer missing repair consent."_
- **Conflict detection** — `detectWritebackConflict` / `assertNoWritebackConflict` recompute the current remote product's T043 fingerprint and compare it to the plan's **baseline** (what the fix was computed against); a mismatch means the merchant edited the product since, so the write is aborted with a non-retryable `conflict` error rather than clobbering newer edits.
- **Mutation building (gated)** — `buildProductUpdateMutation` / `buildVariantUpdateMutation` only build the `productUpdate` / `productVariantsBulkUpdate` GraphQL after re-asserting authorization + validation; `userErrorsToConnectorError` maps Shopify `userErrors` to a canonical `ConnectorError`.

## Files changed

- **Added:** `packages/connectors/src/shopify/writeback.ts`, `tests/shopify-writeback.test.mjs`, `reports/T044-completion-report.md`.
- **Modified:** `packages/connectors/src/shopify/index.ts` (exports), `.github/workflows/ci.yml` (test list), `WORKSTREAM_REGISTRY.md` (T044 → In Review).

No new dependency, no new environment variable, no schema/migration, no boundary/architecture change.

## Tests and exact results

Full CI gate **locally**: `node --test` over all 30 test files → **264 pass, 0 fail**; `tsc -b` clean; ESLint 0 errors; `check:traceability` 100/100; `check:backup-restore` passes. Repo-owned files are Prettier-clean (the only `prettier --check .` warnings are the still-uncommitted overlay dirs).

`tests/shopify-writeback.test.mjs` (7): product/variant allow-list validation (non-listed field, empty set, bad gid rejected); **consent gate** (not-approved / no-approvalId → authorization error; no idempotency key → validation); **conflict detection** (baseline match → ok; changed product → non-retryable conflict); `productUpdate` + `productVariantsBulkUpdate` mutation building (and an unauthorized plan cannot build one); `userErrors` mapping.

## Security & privacy analysis

- **Deny-by-default writes** — the field allow-list means a bug or bad fix can only ever touch feed-relevant fields, never account/pricing/inventory outside the list.
- **Explicit consent required** — no writeback mutation can be built without an approval id; consent is never inferred (spec-mandated).
- **Conflict-safe** — fingerprint baseline check prevents overwriting concurrent merchant edits (lost-update protection).
- **Idempotent** — each plan carries an idempotency key so a retried apply is safe.
- Pure; no secrets, no network here.

## Accessibility / performance / cost analysis

N/A UI. Cost $0. O(fields) mutation building; one fingerprint per conflict check.

## Rollback procedure

Revert the PR merge commit, or delete `packages/connectors/src/shopify/writeback.ts` + `tests/shopify-writeback.test.mjs`, remove their exports from `shopify/index.ts`, drop the ci.yml entry, and set the T044 registry row to `Not Started`. Non-destructive.

## Known limitations / follow-ups

1. **Orchestration** — the worker apply loop (re-fetch current product → `assertNoWritebackConflict` → `assertWritebackAuthorized` → build mutation → GraphQL call → map `userErrors` → record audit + change-set), behind the approval workflow and T033 rate limits, is an `apps/worker` task.
2. **Approval workflow** — issuing the `approvalId` (RBAC repair:approve, recent-auth) is a domain/app concern (T013 + the future approval task); this module only enforces its presence.
3. **Reauthorization for high-risk writes** and change-set audit persistence are wired at the app layer.

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T044 → `In Review`.
- `packages/connectors/src/shopify/writeback.ts` traces to `shopify-writeback.md`, `shopify-writeback-conflicts.md`.
- `tests/shopify-writeback.test.mjs` provides allow-list, consent, conflict, mutation, and userErrors evidence.
