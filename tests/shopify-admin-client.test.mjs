/**
 * Shopify Admin API client tests (task T160).
 *
 * Imports the built @fixmyfeed/connectors `shopify` namespace. The transport is a
 * fake (no network). Verifies request shaping, that the access token never leaks
 * into thrown errors, and that HTTP/GraphQL failures map to canonical categories
 * (throttling → rate_limit).
 *
 * Traceability: docs/05-integrations/shopify/shopify-writeback.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { shopify, ConnectorError } from "../packages/connectors/dist/index.js";

const { createShopifyAdminClient } = shopify;
const TOKEN = "shpat_supersecret_token";

function fakeTransport(handler) {
  const calls = [];
  return {
    calls,
    send(request) {
      calls.push(request);
      return Promise.resolve(handler(request));
    },
  };
}

function jsonResponse(status, body, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    header: (name) => headers[name.toLowerCase()] ?? null,
    json: () => Promise.resolve(body),
  };
}

test("sends an authenticated POST to the versioned GraphQL endpoint", async () => {
  const transport = fakeTransport(() => jsonResponse(200, { data: { shop: { name: "Acme" } } }));
  const client = createShopifyAdminClient({
    shop: "acme.myshopify.com",
    accessToken: TOKEN,
    transport,
    apiVersion: "2025-07",
  });
  const data = await client.graphql("query { shop { name } }");
  assert.deepEqual(data, { shop: { name: "Acme" } });
  const [req] = transport.calls;
  assert.equal(req.url, "https://acme.myshopify.com/admin/api/2025-07/graphql.json");
  assert.equal(req.method, "POST");
  assert.equal(req.headers["X-Shopify-Access-Token"], TOKEN);
  assert.match(req.body, /shop \{ name \}/);
});

test("never leaks the access token in a thrown error", async () => {
  const transport = fakeTransport(() => {
    throw new Error(`network blew up with header X-Shopify-Access-Token: ${TOKEN}`);
  });
  const client = createShopifyAdminClient({
    shop: "acme.myshopify.com",
    accessToken: TOKEN,
    transport,
  });
  await assert.rejects(
    () => client.graphql("query { shop { id } }"),
    (error) => {
      assert.ok(error instanceof ConnectorError);
      assert.equal(error.category, "network");
      assert.ok(!String(error.message).includes(TOKEN), "token must not appear in the error");
      return true;
    },
  );
});

test("maps HTTP 429 to rate_limit and captures retry-after", async () => {
  const transport = fakeTransport(() => jsonResponse(429, {}, { "retry-after": "2" }));
  const client = createShopifyAdminClient({
    shop: "acme.myshopify.com",
    accessToken: TOKEN,
    transport,
  });
  await assert.rejects(
    () => client.graphql("query { shop { id } }"),
    (error) => {
      assert.equal(error.category, "rate_limit");
      assert.equal(error.retryable, true);
      assert.equal(error.retryAfterMs, 2000);
      return true;
    },
  );
});

test("maps HTTP 401 to authentication", async () => {
  const transport = fakeTransport(() => jsonResponse(401, {}));
  const client = createShopifyAdminClient({
    shop: "acme.myshopify.com",
    accessToken: TOKEN,
    transport,
  });
  await assert.rejects(
    () => client.graphql("query { shop { id } }"),
    (error) => {
      assert.equal(error.category, "authentication");
      return true;
    },
  );
});

test("maps a GraphQL THROTTLED extension to rate_limit", async () => {
  const transport = fakeTransport(() =>
    jsonResponse(200, { errors: [{ message: "Throttled", extensions: { code: "THROTTLED" } }] }),
  );
  const client = createShopifyAdminClient({
    shop: "acme.myshopify.com",
    accessToken: TOKEN,
    transport,
  });
  await assert.rejects(
    () => client.graphql("query { shop { id } }"),
    (error) => {
      assert.equal(error.category, "rate_limit");
      return true;
    },
  );
});

test("surfaces other GraphQL errors as upstream without the token", async () => {
  const transport = fakeTransport(() =>
    jsonResponse(200, { errors: [{ message: "Field 'bogus' doesn't exist" }] }),
  );
  const client = createShopifyAdminClient({
    shop: "acme.myshopify.com",
    accessToken: TOKEN,
    transport,
  });
  await assert.rejects(
    () => client.graphql("query { bogus }"),
    (error) => {
      assert.equal(error.category, "upstream");
      assert.match(error.message, /bogus/);
      assert.ok(!error.message.includes(TOKEN));
      return true;
    },
  );
});

test("rejects an empty access token", () => {
  assert.throws(
    () =>
      createShopifyAdminClient({
        shop: "acme.myshopify.com",
        accessToken: "",
        transport: fakeTransport(() => {}),
      }),
    (error) => error instanceof ConnectorError && error.category === "authentication",
  );
});
