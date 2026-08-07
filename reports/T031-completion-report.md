# T031 — Completion Report

**Task:** T031 — Implement OAuth state callback and credential lifecycle framework (Epic E03)
**Branch:** `task/T031-implement-oauth-state-callback-and-credential-lifecycle-framework` → PR into `develop`
**Depends on:** T015 (credential vault), T030 (connector contract) — merged.
**State transition:** `Not Started` → `In Review`

## Specifications read

- `implementation/tasks/T031-implement-oauth-state-callback-and-credential-lifecycle-framework.md` (authority)
- `docs/06-security-privacy-and-compliance/oauth-token-security.md`
- `docs/05-integrations/common/connector-authentication-model.md`
- `docs/07-data-architecture/tables/stores-and-integrations/oauth-connections.md`
- `packages/database/src/{columns,credential-vault-schema,schema}.ts` (conventions + the vault table to reference)

## What was built

A provider-neutral **OAuth 2.0 authorization-code framework** (pure flow logic) plus the **connection lifecycle record** that references vault-stored tokens.

- **OAuth flow (`packages/connectors/src/oauth.ts`, pure)** — the security-critical parts that must be correct everywhere: `generateState` (CSRF), `generatePkcePair` (S256), `createAuthorizationRequest` (builds the authorization URL with `state` + PKCE + scopes, returns the state/verifier to persist), `verifyCallback` (surfaces a provider `error`, enforces a **constant-time** state match against CSRF, requires the `code`), and `parseTokenResponse` / `isTokenExpired` / `tokenNeedsRefresh` (normalize a raw token response into a `TokenSet` and decide refresh with a clock skew). No network, no persistence — the caller performs the token-exchange HTTP request and stores tokens in the T015 vault.
- **Connection record (`packages/database/src/oauth-connection-schema.ts`, migration `0008`)** — `oauth_connections`: tenant + `connector_id` + `external_account_id` (unique together), `status` (`pending → active ⇄ expired → revoked`), granted `scopes`, a **`credential_id` FK to `encrypted_credentials`** (`ON DELETE restrict`) so tokens live encrypted in the vault and are **never stored here in the clear**, plus `expires_at` / `last_refreshed_at` / `revoked_at`, audit timestamps, and optimistic `version`.
- **Connection lifecycle (`packages/database/src/oauth-connection.ts`, pure)** — `canTransitionConnection` / `assertConnectionTransition` over the status graph (`revoked` terminal), and `deriveConnectionStatus` (flips `active`/`expired` from token expiry).

## Files changed

- **Added:** `packages/connectors/src/oauth.ts`, `packages/database/src/{oauth-connection-schema,oauth-connection}.ts`, `tests/oauth.test.mjs`, `reports/T031-completion-report.md`.
- **Generated:** `drizzle/0008_t031_oauth_connections.sql`, `meta/0008_snapshot.json`, `meta/_journal.json` (entry `idx: 8`).
- **Modified:** `packages/connectors/src/index.ts` + `packages/database/src/{schema,index}.ts` (exports), `tests/auth.test.mjs` + `tests/tenancy.test.mjs` (schema-key lists += `oauthConnections`), `tools/db-smoke.mjs` (`EXPECTED_TABLES` += `oauth_connections`; comment `0000–0008`), `.github/workflows/ci.yml` (test list), `WORKSTREAM_REGISTRY.md` (T031 → In Review).

No new dependency (Node built-ins only), no new environment variable, no boundary/architecture change.

## Domain / schema / API / event changes

One new table (`oauth_connections`) via migration `0008`. No API routes (the install/callback HTTP routes are per-provider E04 tasks — e.g. T040 Shopify — that consume this framework).

## Tests and exact results

Full CI gate **locally**: `node --test` over all 22 test files → **219 pass, 0 fail**; `tsc -b` clean; `prettier --check .` clean; `eslint .` clean (0 errors); `check:traceability` 100/100; `check:backup-restore` passes.

`tests/oauth.test.mjs` (7): authorization request builds `state`+PKCE+scopes and validates input; **PKCE challenge = base64url(S256(verifier))**; `verifyCallback` enforces state match / surfaces errors / requires code; token parsing + expiry/refresh with skew; connection transition graph + terminal `revoked`; `deriveConnectionStatus` expiry flip; `oauth_connections` shape + migration `0008` (unique index, FK to `encrypted_credentials`, no DROP, journal `entries[8]`).

## Security & privacy analysis

- **CSRF** — every authorization request carries a high-entropy `state`; `verifyCallback` compares it in **constant time**.
- **PKCE (S256)** on by default hardens the code exchange against interception.
- **Tokens never stored in the clear** — `oauth_connections.credential_id` references the T015 encrypted vault; the restrictive FK prevents orphaning a live token.
- **No provider objects escape** — `parseTokenResponse` takes primitives and returns a normalized `TokenSet`; failures are canonical `ConnectorError`s.
- Tenant isolation via `organization_id` and the per-tenant uniqueness of `(connector, external account)`.

## Accessibility / performance / cost analysis

N/A UI (backend). Cost $0. Pure crypto/string work; the connection table is indexed for tenant status lookups.

## External credentials or approvals

Per-provider client id/secret and endpoints are supplied by the concrete provider tasks (e.g. Shopify T040); none needed for this framework or CI.

## Rollback procedure

Revert the PR merge commit, or delete the three `src` files + `tests/oauth.test.mjs`, the `0008` migration/snapshot + journal entry, revert the barrels/exports, the two schema-key lists, the `db-smoke.mjs` addition, and the ci.yml entry, and set the T031 registry row to `Not Started`. `0008` is expand-only. Non-destructive.

## Known limitations / follow-ups

1. **Token-exchange/refresh HTTP** and the install/callback routes are per-provider (E04) tasks that wire this framework to a real IdP and the vault.
2. **DB-backed integration** (insert + unique-constraint race + FK behavior) — deferred to the CI Postgres run (which applies `0008` and the smoke test now asserts `oauth_connections`).
3. Registry column counts for `oauth_connections` are templated; implemented columns follow the documented vocabulary — reconcile with the doc owner if desired.

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T031 → `In Review`.
- `packages/connectors/src/oauth.ts` and `packages/database/src/oauth-connection*.ts` trace to `oauth-token-security.md`, `connector-authentication-model.md`, and `oauth-connections.md`.
- `tests/oauth.test.mjs` provides flow, lifecycle, schema, and migration evidence.
