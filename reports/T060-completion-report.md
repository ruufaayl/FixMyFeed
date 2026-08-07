# T060 — Completion Report

**Task:** T060 — Implement Google OAuth and account discovery (Epic E06)
**Branch:** `task/T060-T065-google-merchant-connector` → PR into `develop` (E06 built as one PR spanning T060–T065).
**State transition:** `Not Started` → `In Review`

## Specifications read

- `implementation/tasks/T060-implement-google-oauth-and-account-discovery.md`
- `docs/05-integrations/google-merchant-center/{oauth-authorization,account-discovery,merchant-account-linking,oauth-revocation}.md`
- `packages/config/src/schema.ts` (`GOOGLE_CLIENT_ID/SECRET/OAUTH_REDIRECT_URI`), `packages/connectors/src/oauth.ts` (T031)

## What was built

`packages/connectors/src/google/oauth.ts` — Google OAuth 2.0 on the **T031 framework** with Google endpoints + the Content API scope, plus Merchant Center account discovery. Pure; the app performs HTTP and stores the token in the T015 vault (`oauth_connections`, `connector_id="google"`).

- `buildGoogleAuthorizationRequest` — authorization URL with `content` scope, **`access_type=offline` + `prompt=consent`** (to obtain a refresh token), PKCE, and CSRF `state`.
- `buildGoogleTokenExchange` / `buildGoogleRefreshRequest` — the `authorization_code` and `refresh_token` grant POST requests (no network).
- `buildAccountsListRequest` + `parseGoogleAccounts` — list and normalize the merchant's Merchant Center accounts (accountId from the resource name).

## Files changed

Added `google/oauth.ts` (+ `google/index.ts`, `tests/google-oauth.test.mjs`, this report), wired `connectors/index.ts` (`google` namespace) + `ci.yml`. No dependency, env var, schema/migration, or boundary change (token in the vault; connection reuses `oauth_connections`).

## Tests

`tests/google-oauth.test.mjs` (3): authorization request (offline/consent/PKCE/scope), token-exchange + refresh grants, account discovery request + parser. Part of the full local gate.

## Security & privacy

Standard OAuth with PKCE + CSRF state (T031); offline access for refresh; token never persisted by this module. Content scope only.

## Rollback / limitations

Revert the E06 PR or remove `google/oauth.ts`. **Follow-up:** the install/callback routes + token persistence are app wiring; account linking selection is a UI task.

## Traceability

`WORKSTREAM_REGISTRY.md` T060 → In Review; `google/oauth.ts` ↔ `oauth-authorization.md`, `account-discovery.md`, T031.
