# T050 — Completion Report

**Task:** T050 — Implement WooCommerce credential connection (Epic E05)
**Branch:** `task/T050-T054-woocommerce-source-connector` → PR into `develop` (E05 built as one reviewable PR spanning T050–T054).
**State transition:** `Not Started` → `In Review`

## Specifications read

- `implementation/tasks/T050-implement-woocommerce-credential-connection.md` (authority)
- `docs/05-integrations/woocommerce/{woocommerce-authentication,woocommerce-rest-api,wordpress-hosting-constraints,wordpress-plugin-security}.md`
- `packages/config/src/schema.ts` (`WOOCOMMERCE_CONNECTOR_ENABLED` + `woocommerce` flag)

## What was built

`packages/connectors/src/woocommerce/auth.ts` — the WooCommerce **credential-connection** primitives. WooCommerce uses a per-store **consumer key/secret** over HTTPS Basic auth (no OAuth redirect); credentials are validated and stored in the T015 vault (referenced by an `oauth_connections` row, `connector_id="woocommerce"`).

- **`normalizeStoreUrl`** — validates the merchant-supplied store URL: **HTTPS only**, and rejects internal/private hosts (`localhost`, `127.*`, `10.*`, `192.168.*`, `172.16–31.*`, `169.254.*` cloud-metadata, `.local`) as a first-line **SSRF guard**; returns the origin.
- **`validateWooCredentials`** — store URL valid + non-empty consumer key/secret.
- **`buildWooAuthHeader`** — HTTP Basic `Authorization` from `ck:cs`.
- **`buildWooApiUrl`** — `{store}/wp-json/wc/v3/{path}?…`.
- **`buildWooCredentialTestRequest`** — a single-product GET the app uses to verify credentials (URL + method + auth header; no network here).

## Files changed

- **Added:** `packages/connectors/src/woocommerce/auth.ts` (+ shared `woocommerce/index.ts`, `tests/woocommerce.test.mjs`). No new dependency, env var, schema/migration, or boundary change (per-store creds live in the T015 vault; connection state reuses `oauth_connections`).

## Tests and results

Covered by `tests/woocommerce.test.mjs` (T050 section): store-URL https-only + private-host rejection (SSRF), credential validation, Basic auth header, API URL building, and the credential-test request. Part of the full local gate — **278/278 tests**, `tsc -b` clean, ESLint 0 errors, traceability 100/100.

## Security & privacy

- **SSRF guard** on the untrusted store URL (https-only + private-host deny); deep SSRF hardening is the app fetch layer's job (T122).
- Consumer key/secret are never persisted by this module; they flow to the vault via the app. Basic-auth header is built on demand.

## Rollback / limitations

Revert the E05 PR, or remove `woocommerce/auth.ts` + its exports/tests and reset the T050 registry row. **Follow-up:** the connect flow (store the vault credential + create the `oauth_connections` row after a successful `buildWooCredentialTestRequest`) is app wiring.

## Traceability

`WORKSTREAM_REGISTRY.md` T050 → In Review; `woocommerce/auth.ts` ↔ `woocommerce-authentication.md`, `woocommerce-rest-api.md`, `wordpress-plugin-security.md`.
