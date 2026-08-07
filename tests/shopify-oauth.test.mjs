/**
 * Shopify installation and OAuth tests (task T040).
 *
 * Imports the built @fixmyfeed/connectors package (the `shopify` namespace).
 * All pure — no network. HMAC values are cross-checked with node:crypto.
 *
 * Traceability: docs/05-integrations/shopify/{shopify-oauth,shopify-app-installation}.md,
 * docs/06-security-privacy-and-compliance/oauth-token-security.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  shopify,
  ConnectorError,
  validateConnectorContract,
} from "../packages/connectors/dist/index.js";

const {
  shopifyConnectorContract,
  SHOPIFY_DEFAULT_API_VERSION,
  isValidShopDomain,
  normalizeShopDomain,
  buildShopifyInstallUrl,
  verifyShopifyOAuthHmac,
  verifyShopifyInstallCallback,
  buildShopifyTokenExchange,
  parseShopifyTokenResponse,
} = shopify;

const SECRET = "shpss_test_secret";
/** Signs params the way Shopify does: sorted key=value&…, HMAC-SHA256 hex. */
const signQuery = (params) => {
  const message = Object.keys(params)
    .filter((k) => k !== "hmac" && k !== "signature")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHmac("sha256", SECRET).update(message).digest("hex");
};

// ---------------------------------------------------------------------------
// contract
// ---------------------------------------------------------------------------

test("shopifyConnectorContract: is a valid connector contract", () => {
  assert.equal(shopifyConnectorContract.connectorId, "shopify");
  assert.equal(shopifyConnectorContract.webhooks.verification, "hmac");
  assert.equal(shopifyConnectorContract.apiVersions.default, SHOPIFY_DEFAULT_API_VERSION);
  // Re-validating is a no-op that must not throw.
  assert.doesNotThrow(() => validateConnectorContract(shopifyConnectorContract));
});

// ---------------------------------------------------------------------------
// shop domain validation
// ---------------------------------------------------------------------------

test("shop domain: validates and normalizes; rejects hostile values", () => {
  assert.equal(isValidShopDomain("store.myshopify.com"), true);
  assert.equal(isValidShopDomain("evil.com"), false);
  assert.equal(isValidShopDomain("store.myshopify.com.evil.com"), false);
  assert.equal(normalizeShopDomain("Store"), "store.myshopify.com");
  assert.equal(normalizeShopDomain("https://store.myshopify.com/admin"), "store.myshopify.com");
  for (const bad of [
    "",
    "evil.com",
    "a b.myshopify.com",
    "store.myshopify.com.evil.com",
    "-store.myshopify.com",
  ]) {
    assert.throws(
      () => normalizeShopDomain(bad),
      (e) => e instanceof ConnectorError && e.category === "validation",
      `expected "${bad}" to be rejected`,
    );
  }
});

// ---------------------------------------------------------------------------
// install URL
// ---------------------------------------------------------------------------

test("buildShopifyInstallUrl: builds the authorize URL with comma-scopes and state", () => {
  const { url, shop } = buildShopifyInstallUrl({
    shop: "store",
    clientId: "key-1",
    scopes: ["read_products", "write_products"],
    redirectUri: "https://app.fixmyfeed.com/shopify/callback",
    state: "nonce-1",
  });
  assert.equal(shop, "store.myshopify.com");
  const u = new URL(url);
  assert.equal(u.origin + u.pathname, "https://store.myshopify.com/admin/oauth/authorize");
  assert.equal(u.searchParams.get("client_id"), "key-1");
  assert.equal(u.searchParams.get("scope"), "read_products,write_products");
  assert.equal(u.searchParams.get("state"), "nonce-1");
  assert.equal(u.searchParams.get("grant_options[]"), ""); // offline
  const online = buildShopifyInstallUrl({
    shop: "store",
    clientId: "k",
    scopes: ["read_products"],
    redirectUri: "https://x",
    state: "s",
    online: true,
  });
  assert.equal(new URL(online.url).searchParams.get("grant_options[]"), "per-user");
  assert.throws(
    () =>
      buildShopifyInstallUrl({
        shop: "evil.com",
        clientId: "k",
        scopes: ["s"],
        redirectUri: "https://x",
        state: "s",
      }),
    ConnectorError,
  );
});

// ---------------------------------------------------------------------------
// query-string HMAC + callback verification
// ---------------------------------------------------------------------------

test("verifyShopifyOAuthHmac: accepts a correct signature, rejects tampering", () => {
  const params = {
    shop: "store.myshopify.com",
    code: "abc",
    state: "nonce-1",
    timestamp: "1700000000",
  };
  const hmac = signQuery(params);
  assert.equal(verifyShopifyOAuthHmac({ ...params, hmac }, SECRET), true);
  // tamper with a param -> false
  assert.equal(verifyShopifyOAuthHmac({ ...params, code: "xyz", hmac }, SECRET), false);
  // wrong secret -> false
  assert.equal(verifyShopifyOAuthHmac({ ...params, hmac }, "other"), false);
  // missing hmac -> false
  assert.equal(verifyShopifyOAuthHmac(params, SECRET), false);
});

test("verifyShopifyInstallCallback: returns shop+code on valid callback; enforces all checks", () => {
  const base = {
    shop: "store.myshopify.com",
    code: "the-code",
    state: "nonce-1",
    timestamp: "1700000000",
  };
  const good = { ...base, hmac: signQuery(base) };
  assert.deepEqual(
    verifyShopifyInstallCallback({ params: good, expectedState: "nonce-1", clientSecret: SECRET }),
    {
      shop: "store.myshopify.com",
      code: "the-code",
    },
  );

  // bad HMAC (tampered code, stale hmac)
  assert.throws(
    () =>
      verifyShopifyInstallCallback({
        params: { ...good, code: "evil" },
        expectedState: "nonce-1",
        clientSecret: SECRET,
      }),
    (e) => e instanceof ConnectorError && e.category === "authentication",
  );
  // state mismatch
  const other = { ...base, state: "attacker" };
  assert.throws(
    () =>
      verifyShopifyInstallCallback({
        params: { ...other, hmac: signQuery(other) },
        expectedState: "nonce-1",
        clientSecret: SECRET,
      }),
    (e) => e instanceof ConnectorError && e.category === "authorization",
  );
  // invalid shop
  assert.throws(
    () =>
      verifyShopifyInstallCallback({
        params: { ...good, shop: "evil.com" },
        expectedState: "nonce-1",
        clientSecret: SECRET,
      }),
    (e) => e instanceof ConnectorError && e.category === "validation",
  );
});

// ---------------------------------------------------------------------------
// token exchange + parsing
// ---------------------------------------------------------------------------

test("buildShopifyTokenExchange + parseShopifyTokenResponse", () => {
  const req = buildShopifyTokenExchange({
    shop: "store",
    clientId: "key-1",
    clientSecret: SECRET,
    code: "the-code",
  });
  assert.equal(req.url, "https://store.myshopify.com/admin/oauth/access_token");
  assert.equal(req.method, "POST");
  assert.deepEqual(req.body, { client_id: "key-1", client_secret: SECRET, code: "the-code" });

  // offline token: comma-separated scopes, no expiry
  const offline = parseShopifyTokenResponse({
    access_token: "tok",
    scope: "read_products,write_products",
  });
  assert.equal(offline.accessToken, "tok");
  assert.deepEqual([...offline.scopes], ["read_products", "write_products"]);
  assert.equal(offline.online, false);
  assert.equal(offline.expiresAt, undefined);

  // online token: has expires_in
  const online = parseShopifyTokenResponse(
    { access_token: "tok2", scope: "read_products", expires_in: 3600 },
    () => new Date("2026-08-07T00:00:00Z"),
  );
  assert.equal(online.online, true);
  assert.equal(online.expiresAt.toISOString(), "2026-08-07T01:00:00.000Z");

  assert.throws(() => parseShopifyTokenResponse({}), ConnectorError);
});
