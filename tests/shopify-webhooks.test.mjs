/**
 * Shopify webhook ingestion tests (task T042).
 *
 * Imports the built @fixmyfeed/connectors `shopify` namespace. Pure — no
 * network. HMAC values are cross-checked with node:crypto.
 *
 * Traceability: docs/05-integrations/shopify/shopify-webhooks.md,
 * docs/06-security-privacy-and-compliance/webhook-security.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { shopify, ConnectorError } from "../packages/connectors/dist/index.js";

const {
  SHOPIFY_WEBHOOK_HEADERS,
  SHOPIFY_EVENT_KINDS,
  classifyShopifyTopic,
  verifyShopifyWebhook,
  parseShopifyWebhookHeaders,
  mapShopifyRestProduct,
} = shopify;

const SECRET = "shpss_webhook_secret";
const sign = (body) => createHmac("sha256", SECRET).update(body).digest("base64");

// ---------------------------------------------------------------------------
// topic classification
// ---------------------------------------------------------------------------

test("classifyShopifyTopic: maps topics to normalized event kinds", () => {
  assert.equal(classifyShopifyTopic("products/create"), "product.upserted");
  assert.equal(classifyShopifyTopic("products/update"), "product.upserted");
  assert.equal(classifyShopifyTopic("products/delete"), "product.deleted");
  assert.equal(classifyShopifyTopic("app/uninstalled"), "app.uninstalled");
  assert.equal(classifyShopifyTopic("orders/create"), "unknown");
  assert.ok(SHOPIFY_EVENT_KINDS.includes("product.upserted"));
});

// ---------------------------------------------------------------------------
// signature verification (body HMAC, base64)
// ---------------------------------------------------------------------------

test("verifyShopifyWebhook: base64 body HMAC, case-insensitive header, tamper-safe", () => {
  const body = '{"id":123,"title":"Widget"}';
  const good = sign(body);
  // Header name case should not matter.
  assert.equal(verifyShopifyWebhook(body, { "X-Shopify-Hmac-Sha256": good }, SECRET), true);
  assert.equal(verifyShopifyWebhook(body, { "x-shopify-hmac-sha256": good }, SECRET), true);
  // tampered body / wrong secret / missing header -> false
  assert.equal(verifyShopifyWebhook(body + "x", { "x-shopify-hmac-sha256": good }, SECRET), false);
  assert.equal(verifyShopifyWebhook(body, { "x-shopify-hmac-sha256": good }, "other"), false);
  assert.equal(verifyShopifyWebhook(body, {}, SECRET), false);
});

// ---------------------------------------------------------------------------
// header parsing / envelope
// ---------------------------------------------------------------------------

test("parseShopifyWebhookHeaders: builds a validated envelope; enforces required headers", () => {
  const env = parseShopifyWebhookHeaders({
    "X-Shopify-Topic": "products/update",
    "X-Shopify-Shop-Domain": "store.myshopify.com",
    "X-Shopify-Webhook-Id": "wh-123",
    "X-Shopify-Api-Version": "2025-07",
    "X-Shopify-Triggered-At": "2026-08-07T00:00:00Z",
  });
  assert.equal(env.topic, "products/update");
  assert.equal(env.eventKind, "product.upserted");
  assert.equal(env.shopDomain, "store.myshopify.com");
  assert.equal(env.webhookId, "wh-123"); // dedup key
  assert.equal(env.apiVersion, "2025-07");

  const base = {
    [SHOPIFY_WEBHOOK_HEADERS.topic]: "products/update",
    [SHOPIFY_WEBHOOK_HEADERS.shopDomain]: "store.myshopify.com",
    [SHOPIFY_WEBHOOK_HEADERS.webhookId]: "wh-1",
  };
  assert.throws(
    () => parseShopifyWebhookHeaders({ ...base, [SHOPIFY_WEBHOOK_HEADERS.topic]: undefined }),
    ConnectorError,
  );
  assert.throws(
    () => parseShopifyWebhookHeaders({ ...base, [SHOPIFY_WEBHOOK_HEADERS.webhookId]: undefined }),
    ConnectorError,
  );
  assert.throws(
    () => parseShopifyWebhookHeaders({ ...base, [SHOPIFY_WEBHOOK_HEADERS.shopDomain]: "evil.com" }),
    ConnectorError,
  );
});

// ---------------------------------------------------------------------------
// REST product mapping
// ---------------------------------------------------------------------------

test("mapShopifyRestProduct: normalizes REST payload to gid-based NormalizedProduct", () => {
  const p = mapShopifyRestProduct({
    id: 123,
    handle: "widget",
    title: "Widget",
    body_html: "<p>hi</p>",
    product_type: "Gadgets",
    vendor: "Acme",
    status: "active",
    tags: "a, b , c",
    variants: [
      {
        id: 11,
        sku: "W-1",
        barcode: "111",
        price: 9.99,
        compare_at_price: "12.00",
        inventory_quantity: 3,
      },
      { id: 12, sku: "W-2", barcode: null, price: "5.00", inventory_quantity: 0 },
    ],
    images: [{ id: 21, src: "https://cdn/1.jpg", alt: "alt" }],
  });
  assert.equal(p.externalId, "gid://shopify/Product/123");
  assert.equal(p.variants[0].externalId, "gid://shopify/ProductVariant/11");
  assert.equal(p.images[0].externalId, "gid://shopify/ProductImage/21");
  assert.deepEqual([...p.tags], ["a", "b", "c"]);
  assert.equal(p.variants[0].price, "9.99");
  assert.equal(p.variants[0].compareAtPrice, "12.00");
  assert.equal(p.variants[0].availableForSale, true); // qty 3 > 0
  assert.equal(p.variants[1].availableForSale, false); // qty 0
  assert.equal(p.status, "active");

  assert.throws(() => mapShopifyRestProduct({ id: 1 }), ConnectorError); // no title
  assert.throws(() => mapShopifyRestProduct({ title: "X" }), ConnectorError); // no id
});
