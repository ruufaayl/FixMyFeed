# T040 — Completion Report

**Task:** T040 — Implement Shopify installation and OAuth (Epic E04)
**Branch:** `task/T040-implement-shopify-installation-and-oauth` → PR into `develop`
**Depends on:** T030 (connector contract), T031 (OAuth framework + `oauth_connections`), T015 (vault) — merged.
**State transition:** `Not Started` → `In Review`

## Specifications read

- `implementation/tasks/T040-implement-shopify-installation-and-oauth.md` (authority)
- `docs/05-integrations/shopify/{shopify-oauth,shopify-app-installation,shopify-app-review-compliance}.md`
- `docs/06-security-privacy-and-compliance/oauth-token-security.md`
- `packages/config/src/{schema,load}.ts` (`SHOPIFY_CLIENT_ID/SECRET/APP_URL` + `shopify` feature flag)
- `packages/connectors/src/{capabilities,oauth,errors}.ts` (the T030/T031 framework this builds on)

## What was built

The first concrete provider adapter — the Shopify installation/OAuth flow — in a new `packages/connectors/src/shopify/` folder (the home for the T04x Shopify series). All pure; the app performs the HTTP calls and persists the token in the T015 vault via a T031 `oauth_connections` row.

- **Shopify contract (`shopify/contract.ts`)** — the concrete `ConnectorContract` validated against T030: `oauth2`; product/variant/collection/inventory/price/image objects with scopes; Shopify's REST leaky-bucket rate limit (40 burst / ~2 per sec → 40 per 20s); HMAC webhooks; opaque cursor; supported Admin API versions.
- **Shop-domain security (`shopify/oauth.ts`)** — `isValidShopDomain` / `normalizeShopDomain` strictly bind `shop` to `*.myshopify.com` (accepting a bare handle or URL but rejecting anything else). An unchecked `shop` is an SSRF / open-redirect / token-exfiltration vector, so this is enforced before every URL is built.
- **Install URL (`buildShopifyInstallUrl`)** — `https://{shop}/admin/oauth/authorize` with comma-separated scopes (Shopify convention), `state` nonce, and offline/online `grant_options[]`.
- **Callback authentication (`verifyShopifyOAuthHmac` + `verifyShopifyInstallCallback`)** — Shopify's **query-string HMAC** (HMAC-SHA256 hex over the sorted `key=value&…` params, excluding `hmac`/`signature`), compared in **constant time**; plus a **constant-time `state` match** (CSRF) and shop-domain revalidation. Returns the validated `{ shop, code }`.
- **Token exchange (`buildShopifyTokenExchange` + `parseShopifyTokenResponse`)** — builds the POST request for the caller (no network in the package) and normalizes the Shopify token (comma-separated scopes; offline vs online session with expiry).

## Files changed

- **Added:** `packages/connectors/src/shopify/{contract,oauth,index}.ts`, `tests/shopify-oauth.test.mjs`, `reports/T040-completion-report.md`.
- **Modified:** `packages/connectors/src/index.ts` (re-exports the `shopify` namespace), `.github/workflows/ci.yml` (test list), `WORKSTREAM_REGISTRY.md` (T040 → In Review).

No new dependency (Node built-ins only), no new environment variable (the `SHOPIFY_*` vars already exist), no schema/migration (reuses T031's `oauth_connections`), no boundary/architecture change.

## Domain / schema / API / event changes

None new. The install-start and callback HTTP routes live in `apps/web` (a later app-wiring task); this task provides the pure, testable flow logic they call.

## Tests and exact results

Full CI gate **locally**: `node --test` over all 26 test files → **244 pass, 0 fail**; `tsc -b` clean; ESLint clean (0 errors); `check:traceability` 100/100; `check:backup-restore` passes. Repository-owned files are Prettier-clean (see note).

`tests/shopify-oauth.test.mjs` (6): the Shopify contract validates; **shop-domain validation/normalization rejects hostile values** (`evil.com`, `store.myshopify.com.evil.com`, leading-hyphen, spaces); install URL (comma scopes, state, offline/online); **query-string HMAC** accept/tamper/wrong-secret/missing (cross-checked with `node:crypto`); full callback verification (valid → `{shop, code}`; bad HMAC → `authentication`; state mismatch → `authorization`; bad shop → `validation`); token-exchange request + offline/online token parsing.

**Note on `prettier --check .`:** the two untracked spec-overlay directories from the prior task are still in the working tree and are the only source of `prettier --check .` warnings; they are **not part of T040 and are not committed** (staged explicitly). Repo-owned files are clean and CI (which runs on the committed tree) is unaffected.

## Security & privacy analysis

- **Shop-domain binding** — the single most important Shopify OAuth check; strictly `*.myshopify.com`, enforced before building any authorize/token URL, closing SSRF/open-redirect/token-exfiltration.
- **Callback authenticity** — Shopify query-string HMAC verified in constant time; **CSRF** via a constant-time `state` match. Tampered params or a wrong secret fail closed.
- **No secrets in transport here** — the token-exchange request is built for the app to POST; the resulting token is stored encrypted in the T015 vault (T031), never in the clear.
- No provider objects escape — inputs/outputs are primitives; failures are canonical `ConnectorError`s.

## Accessibility / performance / cost analysis

N/A UI (adapter logic). Cost $0. All operations are O(params); one HMAC per callback.

## External credentials or approvals

A Shopify Partner app (Client ID/Secret, configured via `SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET`) and an approved redirect URL are owner-supplied to run a live install; none required for CI or the disabled state.

## Rollback procedure

Revert the PR merge commit, or delete `packages/connectors/src/shopify/` + `tests/shopify-oauth.test.mjs`, remove the `shopify` re-export from `index.ts`, drop the ci.yml entry, and set the T040 registry row to `Not Started`. Non-destructive: no schema, no data, no boundary change.

## Known limitations / follow-ups

1. **App wiring** — the `/shopify/install` and `/shopify/callback` HTTP routes (raw-body capture for later webhooks, the token-exchange POST, and persisting the `oauth_connections` row + vault credential) are an `apps/web` task.
2. **Bulk catalog import, webhook ingestion, reconciliation, writeback, uninstall** are the subsequent T041–T045 tasks that use this connector.
3. Online (per-user) token session handling beyond expiry (associated-user scope/id) is captured minimally; extend when the online flow is wired.

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T040 → `In Review`.
- `packages/connectors/src/shopify/*` trace to `shopify-oauth.md`, `shopify-app-installation.md`, `oauth-token-security.md`, and the T030/T031 framework.
- `tests/shopify-oauth.test.mjs` provides contract, shop-domain, install-URL, HMAC/callback, and token evidence.
