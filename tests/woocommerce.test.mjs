/**
 * WooCommerce connector tests (tasks T050–T054).
 *
 * Imports the built @fixmyfeed/connectors `woocommerce` namespace. Pure — no
 * network. Covers credential connection, catalog mapping, webhook ingestion,
 * reconciliation + hosting-fault handling, and controlled writeback.
 *
 * Traceability: docs/05-integrations/woocommerce/{woocommerce-authentication,
 * woocommerce-rest-api,woocommerce-product-model,woocommerce-source-mapping,
 * woocommerce-webhooks,woocommerce-rate-limit-handling,woocommerce-writeback,
 * woocommerce-writeback-conflicts,wordpress-hosting-constraints}.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { woocommerce, ConnectorError } from "../packages/connectors/dist/index.js";

const {
  // T050
  normalizeStoreUrl,
  validateWooCredentials,
  buildWooAuthHeader,
  buildWooApiUrl,
  buildWooCredentialTestRequest,
  // T051
  buildWooProductsUrl,
  mapWooProduct,
  wooProductGid,
  wooModifiedAt,
  // T052
  classifyWooTopic,
  verifyWooWebhook,
  parseWooWebhookHeaders,
  WOO_WEBHOOK_HEADERS,
  // T053
  wooProductFingerprint,
  reconcileWooCatalog,
  maxModifiedAt,
  looksLikeHtml,
  classifyWooResponse,
  // T054
  WOO_WRITEBACK_ALLOWED_FIELDS,
  validateWooWriteback,
  assertWooWritebackAuthorized,
  detectWooWritebackConflict,
  buildWooProductUpdateRequest,
} = woocommerce;

const STORE = "https://shop.example.com";
const creds = { storeUrl: STORE, consumerKey: "ck_abc", consumerSecret: "cs_xyz" };

// ===========================================================================
// T050 — credential connection
// ===========================================================================

test("T050 normalizeStoreUrl: https only, rejects internal/private hosts", () => {
  assert.equal(normalizeStoreUrl("https://shop.example.com/"), "https://shop.example.com");
  assert.equal(normalizeStoreUrl("https://shop.example.com/wp-json"), "https://shop.example.com");
  for (const bad of [
    "",
    "http://shop.example.com", // not https
    "https://localhost",
    "https://127.0.0.1",
    "https://10.0.0.5",
    "https://192.168.1.10",
    "https://169.254.169.254", // cloud metadata
    "not a url",
  ]) {
    assert.throws(
      () => normalizeStoreUrl(bad),
      (e) => e instanceof ConnectorError && e.category === "validation",
      `expected "${bad}" rejected`,
    );
  }
});

test("T050 credentials + auth header + api url + test request", () => {
  assert.doesNotThrow(() => validateWooCredentials(creds));
  assert.throws(() => validateWooCredentials({ ...creds, consumerKey: "" }), ConnectorError);
  const header = buildWooAuthHeader(creds);
  assert.equal(header, `Basic ${Buffer.from("ck_abc:cs_xyz").toString("base64")}`);
  assert.equal(
    buildWooApiUrl(STORE, "products", { per_page: 1 }),
    "https://shop.example.com/wp-json/wc/v3/products?per_page=1",
  );
  const req = buildWooCredentialTestRequest(creds);
  assert.equal(req.method, "GET");
  assert.match(req.url, /\/wp-json\/wc\/v3\/products\?per_page=1$/);
  assert.match(req.headers.Authorization, /^Basic /);
});

// ===========================================================================
// T051 — catalog synchronization
// ===========================================================================

test("T051 buildWooProductsUrl: paginated, ordered by modified, incremental filter", () => {
  assert.match(
    buildWooProductsUrl(STORE, { page: 2, perPage: 50 }),
    /products\?page=2&per_page=50&orderby=modified&order=asc$/,
  );
  assert.match(
    buildWooProductsUrl(STORE, { modifiedAfter: "2026-08-07T00:00:00Z" }),
    /modified_after=2026-08-07/,
  );
  assert.throws(() => buildWooProductsUrl(STORE, { modifiedAfter: "nope" }), ConnectorError);
});

test("T051 mapWooProduct: simple product -> one synthetic variant; status + fields", () => {
  const p = mapWooProduct({
    id: 42,
    name: "Widget",
    slug: "widget",
    permalink: "https://shop.example.com/product/widget",
    description: "desc",
    type: "simple",
    status: "publish",
    sku: "W-1",
    global_unique_id: "0123456789012",
    regular_price: "9.99",
    sale_price: "7.99",
    stock_status: "instock",
    stock_quantity: 5,
    categories: [{ name: "Gadgets" }],
    tags: [{ name: "featured" }],
    images: [{ id: 7, src: "https://cdn/x.jpg", alt: "alt" }],
  });
  assert.equal(p.externalId, wooProductGid(42));
  assert.equal(p.status, "active");
  assert.equal(p.productType, "Gadgets");
  assert.deepEqual([...p.tags], ["featured"]);
  assert.equal(p.variants.length, 1);
  assert.equal(p.variants[0].sku, "W-1");
  assert.equal(p.variants[0].barcode, "0123456789012"); // GTIN via global_unique_id
  assert.equal(p.variants[0].price, "9.99");
  assert.equal(p.variants[0].availableForSale, true);

  // variable product with variations
  const v = mapWooProduct({ id: 43, name: "Shirt", type: "variable", status: "draft" }, [
    { id: 101, sku: "S-1", regular_price: "20.00", stock_status: "outofstock" },
  ]);
  assert.equal(v.status, "draft");
  assert.equal(v.variants[0].externalId, "woocommerce://variation/101");
  assert.equal(v.variants[0].availableForSale, false);

  assert.equal(
    wooModifiedAt({
      date_modified_gmt: "2026-08-07T01:00:00",
      date_modified: "2026-08-07T02:00:00",
    }),
    "2026-08-07T01:00:00",
  );
  assert.throws(() => mapWooProduct({ id: 1 }), ConnectorError); // no name
});

// ===========================================================================
// T052 — webhook ingestion
// ===========================================================================

test("T052 webhook: classify, base64 HMAC verify, header envelope", () => {
  assert.equal(classifyWooTopic("product.updated"), "product.upserted");
  assert.equal(classifyWooTopic("product.deleted"), "product.deleted");
  assert.equal(classifyWooTopic("order.created"), "unknown");

  const secret = "whsec";
  const body = '{"id":42,"name":"Widget"}';
  const sig = createHmac("sha256", secret).update(body).digest("base64");
  assert.equal(verifyWooWebhook(body, { "X-WC-Webhook-Signature": sig }, secret), true);
  assert.equal(verifyWooWebhook(body + "x", { "x-wc-webhook-signature": sig }, secret), false);
  assert.equal(verifyWooWebhook(body, {}, secret), false);

  const env = parseWooWebhookHeaders({
    "X-WC-Webhook-Topic": "product.updated",
    "X-WC-Webhook-Source": "https://shop.example.com",
    "X-WC-Webhook-Delivery-ID": "del-99",
    "X-WC-Webhook-ID": "wh-1",
    "X-WC-Webhook-Resource": "product",
  });
  assert.equal(env.eventKind, "product.upserted");
  assert.equal(env.storeUrl, "https://shop.example.com");
  assert.equal(env.deliveryId, "del-99"); // dedup key
  assert.throws(
    () => parseWooWebhookHeaders({ [WOO_WEBHOOK_HEADERS.topic]: "product.updated" }),
    ConnectorError, // missing delivery id
  );
});

// ===========================================================================
// T053 — reconciliation + hosting fault handling
// ===========================================================================

test("T053 fingerprint + reconcile + monotonic watermark", () => {
  const base = mapWooProduct({
    id: 1,
    name: "A",
    status: "publish",
    sku: "A",
    regular_price: "1.00",
    stock_status: "instock",
  });
  const changed = mapWooProduct({
    id: 1,
    name: "A",
    status: "publish",
    sku: "A",
    regular_price: "2.00",
    stock_status: "instock",
  });
  assert.notEqual(wooProductFingerprint(base), wooProductFingerprint(changed));

  const local = [base, mapWooProduct({ id: 2, name: "B", status: "publish" })];
  const remote = [changed, mapWooProduct({ id: 3, name: "C", status: "publish" })];
  const r = reconcileWooCatalog(local, remote);
  assert.deepEqual(
    r.updated.map((p) => p.externalId),
    [wooProductGid(1)],
  );
  assert.deepEqual(
    r.added.map((p) => p.externalId),
    [wooProductGid(3)],
  );
  assert.deepEqual(
    r.removed.map((p) => p.externalId),
    [wooProductGid(2)],
  );

  assert.equal(
    maxModifiedAt("2026-08-07T00:00:00Z", ["2026-08-07T02:00:00Z", "nope"]),
    "2026-08-07T02:00:00.000Z",
  );
  assert.equal(
    maxModifiedAt("2026-08-07T05:00:00Z", ["2026-08-07T01:00:00Z"]),
    "2026-08-07T05:00:00.000Z",
  );
});

test("T053 classifyWooResponse: hosting faults (HTML page, 5xx, network) vs healthy JSON", () => {
  // healthy JSON -> null
  assert.equal(
    classifyWooResponse({ status: 200, contentType: "application/json", bodyText: "[]" }),
    null,
  );
  // HTML page even on 200 -> retryable upstream
  const html = classifyWooResponse({
    status: 200,
    contentType: "text/html",
    bodyText: "<!DOCTYPE html>...",
  });
  assert.ok(html instanceof ConnectorError);
  assert.equal(html.category, "upstream");
  assert.equal(html.retryable, true);
  assert.equal(looksLikeHtml(undefined, "<html><body>maintenance"), true);
  // 503 -> upstream retryable
  assert.equal(classifyWooResponse({ status: 503 }).category, "upstream");
  // 401 -> authentication (not retryable)
  const auth = classifyWooResponse({ status: 401 });
  assert.equal(auth.category, "authentication");
  assert.equal(auth.retryable, false);
  // network error -> retryable network
  const net = classifyWooResponse({ networkError: true });
  assert.equal(net.category, "network");
  assert.equal(net.retryable, true);
});

// ===========================================================================
// T054 — controlled writeback
// ===========================================================================

const approvedPlan = (change) => ({
  change,
  baselineFingerprint: "bf",
  idempotencyKey: "idem-1",
  approval: { approved: true, approvalId: "appr-1" },
});

test("T054 writeback: allow-list, consent gate, conflict, PUT request", () => {
  assert.ok(WOO_WRITEBACK_ALLOWED_FIELDS.includes("regular_price"));
  assert.doesNotThrow(() => validateWooWriteback({ productId: 42, fields: { name: "Fixed" } }));
  assert.throws(
    () => validateWooWriteback({ productId: 42, fields: { price_html: "x" } }),
    ConnectorError,
  );
  assert.throws(() => validateWooWriteback({ productId: 42, fields: {} }), ConnectorError);

  // consent gate
  assert.doesNotThrow(() =>
    assertWooWritebackAuthorized(approvedPlan({ productId: 42, fields: { name: "x" } })),
  );
  assert.throws(
    () => assertWooWritebackAuthorized({ ...approvedPlan({}), approval: { approved: false } }),
    (e) => e instanceof ConnectorError && e.category === "authorization",
  );

  // conflict
  const p = mapWooProduct({ id: 1, name: "A", status: "publish" });
  const baseline = wooProductFingerprint(p);
  assert.equal(detectWooWritebackConflict(baseline, p), false);
  assert.equal(
    detectWooWritebackConflict(baseline, mapWooProduct({ id: 1, name: "B", status: "publish" })),
    true,
  );

  // PUT request only for authorized+validated plan
  const req = buildWooProductUpdateRequest(
    STORE,
    approvedPlan({ productId: 42, fields: { name: "Fixed", regular_price: "9.99" } }),
  );
  assert.equal(req.method, "PUT");
  assert.match(req.url, /\/wp-json\/wc\/v3\/products\/42$/);
  assert.deepEqual(req.body, { name: "Fixed", regular_price: "9.99" });
  assert.throws(
    () =>
      buildWooProductUpdateRequest(STORE, {
        ...approvedPlan({ productId: 42, fields: { name: "x" } }),
        approval: { approved: false },
      }),
    ConnectorError,
  );
});
