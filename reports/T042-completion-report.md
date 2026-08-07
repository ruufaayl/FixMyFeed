# T042 — Completion Report

**Task:** T042 — Implement Shopify webhook ingestion (Epic E04)
**Branch:** `task/T042-implement-shopify-webhook-ingestion` → PR into `develop`
**Depends on:** T032 (webhook verification + `webhook_receipts` dedup), T040 (Shopify OAuth/shop-domain), T041 (normalized product shape) — merged.
**State transition:** `Not Started` → `In Review`

## Specifications read

- `implementation/tasks/T042-implement-shopify-webhook-ingestion.md` (authority)
- `docs/05-integrations/shopify/shopify-webhooks.md`
- `docs/06-security-privacy-and-compliance/webhook-security.md`
- `packages/connectors/src/webhook.ts` (T032), `shopify/{oauth,bulk-import}.ts` (T040/T041)

## What was built

The **pure Shopify webhook ingestion pipeline** in `packages/connectors/src/shopify/webhooks.ts` — authenticate, identify, deduplicate, classify, and normalize an inbound Shopify webhook. No network, no new table (dedup reuses T032's `webhook_receipts`).

- **`verifyShopifyWebhook`** — HMAC-SHA256 (**base64**) of the **raw body** with the app client secret, constant-time via T032's `verifyWebhookSignature`. This is the body HMAC — distinct from the OAuth query-string HMAC (T040). Header lookup is case-insensitive; returns `false` on tampered/absent signature (never throws on untrusted input).
- **`parseShopifyWebhookHeaders`** — normalizes the Shopify headers into an envelope: `topic`, `eventKind`, `shopDomain` (validated via T040's `normalizeShopDomain`), **`webhookId` (`X-Shopify-Webhook-Id` — the dedup key for `webhook_receipts`)**, `apiVersion`, `triggeredAt`. Missing topic/webhook-id/invalid shop → `ConnectorError`.
- **`classifyShopifyTopic`** — maps a Shopify topic to a normalized event kind (`products/create|update` → `product.upserted`, `products/delete` → `product.deleted`, `app/uninstalled` → `app.uninstalled`, else `unknown`).
- **`mapShopifyRestProduct`** — normalizes a Shopify **REST** product webhook payload (numeric ids, inline variants/images, comma-string tags) into the same `NormalizedProduct` shape as the bulk import (T041), converting REST ids to **gid form** so webhook and bulk sources reconcile.

## Files changed

- **Added:** `packages/connectors/src/shopify/webhooks.ts`, `tests/shopify-webhooks.test.mjs`, `reports/T042-completion-report.md`.
- **Modified:** `packages/connectors/src/shopify/index.ts` (exports), `.github/workflows/ci.yml` (test list), `WORKSTREAM_REGISTRY.md` (T042 → In Review).

No new dependency, no new environment variable, no schema/migration (reuses T032 `webhook_receipts`), no boundary/architecture change.

## Domain / schema / API / event changes

None new. The inbound webhook HTTP route (raw-body capture, verify → dedup via `createWebhookReceipt`/`decideWebhookReceipt` → enqueue) lives in `apps/web`/`apps/worker` (a later wiring task); this task provides the pure logic it calls.

## Tests and exact results

Full CI gate **locally**: `node --test` over all 28 test files → **253 pass, 0 fail**; `tsc -b` clean; ESLint clean (0 errors); `check:traceability` 100/100; `check:backup-restore` passes. Repo-owned files are Prettier-clean (see note).

`tests/shopify-webhooks.test.mjs` (4): topic → event-kind classification; **base64 body HMAC** verify (case-insensitive header, tamper/wrong-secret/missing → false, cross-checked with `node:crypto`); header envelope parsing + required-header/shop-domain validation; REST product mapping to gid-based `NormalizedProduct` (comma tags, price/compare-at, `availableForSale` from inventory, required-field errors).

**Note on `prettier --check .`:** the two untracked spec-overlay directories are still the only source of `prettier --check .` warnings; **not part of T042, not committed** (staged explicitly). Repo-owned files are clean; CI (committed tree) is unaffected.

## Security & privacy analysis

- **Authenticity** — Shopify body HMAC (base64) verified in constant time before any processing; forged/unsigned deliveries fail closed.
- **Shop-domain binding** — `X-Shopify-Shop-Domain` is validated to `*.myshopify.com` (rejects hostile values), tying the event to a real tenant.
- **Deduplication** — the `X-Shopify-Webhook-Id` is surfaced as the dedup key for T032's unique `(connector, external_id)`, so redeliveries are processed once.
- Pure transformation — no secrets or bodies persisted here; the token/transport stay in the app.

## Accessibility / performance / cost analysis

N/A UI. Cost $0. One HMAC per delivery; header/payload parsing is O(size).

## External credentials or approvals

The app's Shopify client secret (`SHOPIFY_CLIENT_SECRET`) is used to sign/verify; webhook subscriptions are registered per install (a wiring task). None required for CI.

## Rollback procedure

Revert the PR merge commit, or delete `packages/connectors/src/shopify/webhooks.ts` + `tests/shopify-webhooks.test.mjs`, remove their exports from `shopify/index.ts`, drop the ci.yml entry, and set the T042 registry row to `Not Started`. Non-destructive.

## Known limitations / follow-ups

1. **Route wiring** — the `POST /shopify/webhooks` endpoint (raw-body capture, `verifyShopifyWebhook` → `parseShopifyWebhookHeaders` → T032 dedup → enqueue a T025 operation / T022 outbox) is an app task.
2. **Webhook registration** — subscribing the topics on install (and re-registering on API-version change) is a follow-up using the Admin API.
3. **More topics** (inventory levels, product media) can be added to `SHOPIFY_WEBHOOK_TOPICS`/`classifyShopifyTopic` when diagnostics need them.

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T042 → `In Review`.
- `packages/connectors/src/shopify/webhooks.ts` traces to `shopify-webhooks.md`, `webhook-security.md`, and the T032/T040/T041 framework.
- `tests/shopify-webhooks.test.mjs` provides classification, HMAC, header-envelope, and REST-mapping evidence.
