/**
 * Google OAuth + account discovery tests (task T060).
 *
 * Imports the built @fixmyfeed/connectors `google` namespace. Pure — no network.
 *
 * Traceability: docs/05-integrations/google-merchant-center/{oauth-authorization,
 * account-discovery,merchant-account-linking}.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { google, ConnectorError } from "../packages/connectors/dist/index.js";

const {
  GOOGLE_AUTH_ENDPOINT,
  GOOGLE_CONTENT_SCOPE,
  buildGoogleAuthorizationRequest,
  buildGoogleTokenExchange,
  buildGoogleRefreshRequest,
  buildAccountsListRequest,
  parseGoogleAccounts,
} = google;

test("buildGoogleAuthorizationRequest: content scope, offline access + consent, PKCE", () => {
  const req = buildGoogleAuthorizationRequest(
    { clientId: "gid", redirectUri: "https://app.fixmyfeed.com/google/callback", state: "nonce-1" },
    { pkce: () => ({ codeVerifier: "ver", codeChallenge: "chal", codeChallengeMethod: "S256" }) },
  );
  const url = new URL(req.url);
  assert.equal(url.origin + url.pathname, GOOGLE_AUTH_ENDPOINT);
  assert.equal(url.searchParams.get("scope"), GOOGLE_CONTENT_SCOPE);
  assert.equal(url.searchParams.get("state"), "nonce-1");
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("prompt"), "consent");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(req.codeVerifier, "ver");
});

test("buildGoogleTokenExchange + refresh: authorization_code and refresh_token grants", () => {
  const ex = buildGoogleTokenExchange({
    clientId: "gid",
    clientSecret: "secret",
    code: "the-code",
    redirectUri: "https://app/cb",
    codeVerifier: "ver",
  });
  assert.equal(ex.method, "POST");
  assert.match(ex.url, /oauth2\.googleapis\.com\/token$/);
  assert.equal(ex.body.grant_type, "authorization_code");
  assert.equal(ex.body.code_verifier, "ver");

  const rf = buildGoogleRefreshRequest({ clientId: "gid", clientSecret: "s", refreshToken: "rt" });
  assert.equal(rf.body.grant_type, "refresh_token");
  assert.equal(rf.body.refresh_token, "rt");

  assert.throws(
    () =>
      buildGoogleTokenExchange({ clientId: "", clientSecret: "s", code: "c", redirectUri: "r" }),
    ConnectorError,
  );
});

test("account discovery: request builder + parser", () => {
  const req = buildAccountsListRequest("access-tok", "page-2");
  assert.equal(req.method, "GET");
  assert.match(req.url, /\/accounts\/v1beta\/accounts\?pageToken=page-2$/);
  assert.equal(req.headers.Authorization, "Bearer access-tok");
  assert.throws(() => buildAccountsListRequest(""), ConnectorError);

  const accounts = parseGoogleAccounts({
    accounts: [
      { name: "accounts/12345", accountName: "My Store", adultContent: false },
      { accountId: 678, accountName: "Second" },
    ],
  });
  assert.equal(accounts.length, 2);
  assert.equal(accounts[0].accountId, "12345");
  assert.equal(accounts[0].accountName, "My Store");
  assert.equal(accounts[1].accountId, "678");
  assert.deepEqual(parseGoogleAccounts({}), []);
});
