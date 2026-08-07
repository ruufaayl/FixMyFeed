# T045 — Completion Report

**Task:** T045 — Implement Shopify privacy and uninstall callbacks (Epic E04)
**Branch:** `task/T045-implement-shopify-privacy-and-uninstall-callbacks` → PR into `develop`
**Depends on:** T042 (webhook verification/ingestion), T040 (shop-domain) — merged.
**State transition:** `Not Started` → `In Review`

## Specifications read

- `implementation/tasks/T045-implement-shopify-privacy-and-uninstall-callbacks.md` (authority)
- `docs/05-integrations/shopify/{shopify-uninstall-workflow,shopify-customer-data-redaction,shopify-shop-redaction}.md`
- `packages/connectors/src/shopify/{webhooks,oauth}.ts` (T042/T040)

## What was built

The **pure handlers for Shopify's mandatory GDPR compliance webhooks and the uninstall webhook** (`packages/connectors/src/shopify/compliance.ts`) — every Shopify app must register and handle these. Transport is authenticated by the T042 body-HMAC path; this module parses the payloads and computes the deletion/uninstall **action plan** the worker executes.

- **Topics** — `customers/data_request`, `customers/redact`, `shop/redact` (the three mandatory GDPR topics) + `app/uninstalled`. `isShopifyComplianceTopic` identifies the GDPR set.
- **`parseShopifyCompliancePayload`** — normalizes each payload into a typed command (`customer.data_request` / `customer.redact` / `shop.redact` / `app.uninstalled`), reading the shop domain (from `shop_domain`/`myshopify_domain`, validated via T040 `normalizeShopDomain`), shop/customer ids, and affected order ids. Unknown topic or invalid shop → `ConnectorError`.
- **`planComplianceActions`** — the auditable action plan:
  - `app.uninstalled` → **revoke the OAuth connection + cancel active syncs** (immediate);
  - `shop.redact` → **delete shop catalog + snapshots + purge records** (immediate);
  - `customers/redact` and `customers/data_request` → a recorded but **safe no-op** (`noopSafe: true`), because FixMyFeed stores product/feed data, not customer PII — the callbacks are still parsed and actioned so the app responds correctly.

## Files changed

- **Added:** `packages/connectors/src/shopify/compliance.ts`, `tests/shopify-compliance.test.mjs`, `reports/T045-completion-report.md`.
- **Modified:** `packages/connectors/src/shopify/index.ts` (exports), `.github/workflows/ci.yml` (test list), `WORKSTREAM_REGISTRY.md` (T045 → In Review).

No new dependency, no new environment variable, no schema/migration, no boundary/architecture change.

## Tests and exact results

Full CI gate **locally**: `node --test` over all 31 test files → **270 pass, 0 fail**; `tsc -b` clean; ESLint 0 errors; `check:traceability` 100/100; `check:backup-restore` passes. Repo-owned files are Prettier-clean (the only `prettier --check .` warnings are the still-uncommitted overlay dirs).

`tests/shopify-compliance.test.mjs` (6): GDPR topic identification; parse `customers/data_request` (customer id, orders, data-request id); parse `customers/redact` + `shop/redact`; parse `app/uninstalled` (myshopify_domain) + unknown-topic / invalid-shop errors; **uninstall & shop-redact produce real deletion plans**; **customer callbacks are safe no-ops (no PII stored) but still actioned**.

## Security & privacy analysis

- **Regulatory compliance** — the three mandatory GDPR callbacks + uninstall are handled, satisfying a hard Shopify App Store requirement.
- **Data minimization pays off** — because no customer PII is stored, customer redact/data-request are safe no-ops (recorded for audit), and the real deletion surface is the shop's product/feed data on `shop/redact`.
- **Shop-domain validation** ties every command to a real `*.myshopify.com` tenant; transport HMAC is enforced upstream (T042).
- Uninstall immediately revokes the OAuth connection (stops all access) and cancels syncs.

## Accessibility / performance / cost analysis

N/A UI. Cost $0. O(payload) parsing; plans are constant-size.

## Rollback procedure

Revert the PR merge commit, or delete `packages/connectors/src/shopify/compliance.ts` + `tests/shopify-compliance.test.mjs`, remove their exports from `shopify/index.ts`, drop the ci.yml entry, and set the T045 registry row to `Not Started`. Non-destructive.

## Known limitations / follow-ups

1. **Route wiring** — the `POST /shopify/webhooks` handler dispatches these topics: verify (T042) → `parseShopifyCompliancePayload` → `planComplianceActions` → execute (revoke `oauth_connections`, delete catalog/snapshots) as a T025 operation, recording an immutable audit event (T016). App/worker task.
2. **Uninstall vs shop/redact timing** — Shopify sends `shop/redact` ~48h after uninstall; the worker schedules the shop deletion on that callback while uninstall handles immediate revocation.
3. **Data export format** for `customers/data_request` (empty here) is finalized when/if any customer-adjacent data is ever stored.

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T045 → `In Review`.
- `packages/connectors/src/shopify/compliance.ts` traces to `shopify-uninstall-workflow.md`, `shopify-customer-data-redaction.md`, `shopify-shop-redaction.md`.
- `tests/shopify-compliance.test.mjs` provides topic, parsing, and action-plan evidence.
