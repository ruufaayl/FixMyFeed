/**
 * OAuth flow + connection lifecycle tests (task T031).
 *
 * The OAuth flow logic (@fixmyfeed/connectors) and the connection lifecycle +
 * schema (@fixmyfeed/database) are both pure — no network, no database.
 *
 * Traceability: docs/06-security-privacy-and-compliance/oauth-token-security.md,
 * docs/05-integrations/common/connector-authentication-model.md,
 * docs/07-data-architecture/tables/stores-and-integrations/oauth-connections.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAuthorizationRequest,
  verifyCallback,
  generatePkcePair,
  parseTokenResponse,
  isTokenExpired,
  tokenNeedsRefresh,
  ConnectorError,
} from "../packages/connectors/dist/index.js";
import {
  OAUTH_CONNECTION_STATUSES,
  OAuthConnectionError,
  canTransitionConnection,
  assertConnectionTransition,
  deriveConnectionStatus,
  isTerminalConnectionStatus,
  oauthConnections,
} from "../packages/database/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");
const at = (iso) => () => new Date(iso);

// ---------------------------------------------------------------------------
// OAuth flow (connectors)
// ---------------------------------------------------------------------------

test("createAuthorizationRequest: builds a URL with state + PKCE and validates input", () => {
  const req = createAuthorizationRequest(
    {
      authorizationEndpoint: "https://example.com/oauth/authorize",
      clientId: "client-1",
      redirectUri: "https://app.fixmyfeed.com/callback",
      scopes: ["read_products", "write_products"],
    },
    { state: () => "state-xyz", pkce: () => generatePkcePair(() => Buffer.alloc(32, 7)) },
  );
  const url = new URL(req.url);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("client_id"), "client-1");
  assert.equal(url.searchParams.get("scope"), "read_products write_products");
  assert.equal(url.searchParams.get("state"), "state-xyz");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok(url.searchParams.get("code_challenge"));
  assert.ok(req.codeVerifier);

  assert.throws(
    () =>
      createAuthorizationRequest({
        authorizationEndpoint: "not a url",
        clientId: "c",
        redirectUri: "https://x",
        scopes: ["a"],
      }),
    (e) => e instanceof ConnectorError && e.category === "validation",
  );
  assert.throws(
    () =>
      createAuthorizationRequest({
        authorizationEndpoint: "https://x/authorize",
        clientId: "c",
        redirectUri: "https://x",
        scopes: [],
      }),
    ConnectorError,
  );
});

test("generatePkcePair: challenge is base64url(S256(verifier))", () => {
  const pair = generatePkcePair(() => Buffer.alloc(32, 1));
  const expected = createHash("sha256").update(pair.codeVerifier).digest("base64url");
  assert.equal(pair.codeChallenge, expected);
  assert.equal(pair.codeChallengeMethod, "S256");
});

test("verifyCallback: enforces state match, surfaces errors, requires code", () => {
  assert.deepEqual(verifyCallback({ code: "abc", state: "s1" }, "s1"), { code: "abc" });

  // provider error
  assert.throws(
    () => verifyCallback({ error: "access_denied", error_description: "no" }, "s1"),
    (e) => e instanceof ConnectorError && e.category === "authorization",
  );
  // state mismatch (CSRF)
  assert.throws(
    () => verifyCallback({ code: "abc", state: "wrong" }, "s1"),
    (e) => e instanceof ConnectorError && e.category === "authorization",
  );
  // missing code
  assert.throws(
    () => verifyCallback({ state: "s1" }, "s1"),
    (e) => e instanceof ConnectorError && e.category === "validation",
  );
});

test("parseTokenResponse + expiry/refresh decisions", () => {
  const now = at("2026-08-07T00:00:00Z");
  const tokens = parseTokenResponse(
    {
      access_token: "at",
      refresh_token: "rt",
      expires_in: 3600,
      scope: "a b",
      token_type: "Bearer",
    },
    now,
  );
  assert.equal(tokens.accessToken, "at");
  assert.deepEqual([...tokens.scopes], ["a", "b"]);
  assert.equal(tokens.expiresAt.toISOString(), "2026-08-07T01:00:00.000Z");

  assert.equal(isTokenExpired(tokens, at("2026-08-07T00:30:00Z")), false);
  assert.equal(isTokenExpired(tokens, at("2026-08-07T01:00:00Z")), true); // at expiry (skew)
  assert.equal(tokenNeedsRefresh(tokens, at("2026-08-07T02:00:00Z")), true);
  // no expiry -> never expires
  const noExp = parseTokenResponse({ access_token: "at" }, now);
  assert.equal(isTokenExpired(noExp, at("2030-01-01T00:00:00Z")), false);

  assert.throws(
    () => parseTokenResponse({}, now),
    (e) => e instanceof ConnectorError,
  );
});

// ---------------------------------------------------------------------------
// Connection lifecycle (database)
// ---------------------------------------------------------------------------

test("connection lifecycle: allowed transitions and revoked is terminal", () => {
  assert.deepEqual(OAUTH_CONNECTION_STATUSES, ["pending", "active", "expired", "revoked"]);
  assert.equal(canTransitionConnection("pending", "active"), true);
  assert.equal(canTransitionConnection("active", "expired"), true);
  assert.equal(canTransitionConnection("expired", "active"), true);
  assert.equal(canTransitionConnection("active", "revoked"), true);
  assert.equal(canTransitionConnection("revoked", "active"), false);
  assert.ok(isTerminalConnectionStatus("revoked"));
  assert.equal(assertConnectionTransition("pending", "active"), "active");
  assert.throws(
    () => assertConnectionTransition("revoked", "active"),
    (e) => e instanceof OAuthConnectionError,
  );
});

test("deriveConnectionStatus: flips active/expired on token expiry", () => {
  const now = at("2026-08-07T00:00:00Z");
  assert.equal(deriveConnectionStatus("active", new Date("2026-08-07T01:00:00Z"), now), "active");
  assert.equal(deriveConnectionStatus("active", new Date("2026-08-06T23:00:00Z"), now), "expired");
  assert.equal(deriveConnectionStatus("expired", new Date("2026-08-07T01:00:00Z"), now), "active");
  assert.equal(deriveConnectionStatus("active", null, now), "active"); // unknown expiry
  // terminal/pending unchanged
  assert.equal(deriveConnectionStatus("revoked", new Date("2020-01-01T00:00:00Z"), now), "revoked");
  assert.equal(deriveConnectionStatus("pending", undefined, now), "pending");
});

test("schema + migration: oauth_connections shape and migration 0008", () => {
  const cfg = getTableConfig(oauthConnections);
  assert.equal(cfg.name, "oauth_connections");
  const cols = new Set(cfg.columns.map((c) => c.name));
  for (const c of [
    "connector_id",
    "external_account_id",
    "status",
    "scopes",
    "credential_id",
    "expires_at",
  ]) {
    assert.ok(cols.has(c), `oauth_connections missing ${c}`);
  }
  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0008_t031_oauth_connections.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "oauth_connections"/);
  assert.match(sql, /oauth_connections_org_connector_account_unique/);
  assert.match(sql, /encrypted_credentials/); // FK to the vault
  assert.doesNotMatch(sql, /DROP TABLE/i);
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[8].tag, "0008_t031_oauth_connections");
});
