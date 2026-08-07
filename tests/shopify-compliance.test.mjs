/**
 * Shopify privacy (GDPR) and uninstall callback tests (task T045).
 *
 * Imports the built @fixmyfeed/connectors `shopify` namespace. Pure — no
 * network. Covers payload parsing and the deletion/uninstall action plans.
 *
 * Traceability: docs/05-integrations/shopify/{shopify-uninstall-workflow,
 * shopify-customer-data-redaction,shopify-shop-redaction}.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { shopify, ConnectorError } from "../packages/connectors/dist/index.js";

const {
  SHOPIFY_COMPLIANCE_TOPICS,
  SHOPIFY_UNINSTALL_TOPIC,
  isShopifyComplianceTopic,
  parseShopifyCompliancePayload,
  planComplianceActions,
} = shopify;

// ---------------------------------------------------------------------------
// topic classification
// ---------------------------------------------------------------------------

test("compliance topics: identifies the mandatory GDPR topics", () => {
  assert.equal(isShopifyComplianceTopic("customers/data_request"), true);
  assert.equal(isShopifyComplianceTopic("customers/redact"), true);
  assert.equal(isShopifyComplianceTopic("shop/redact"), true);
  assert.equal(isShopifyComplianceTopic("app/uninstalled"), false); // uninstall, not GDPR
  assert.equal(isShopifyComplianceTopic("products/update"), false);
  assert.equal(SHOPIFY_UNINSTALL_TOPIC, "app/uninstalled");
  assert.equal(SHOPIFY_COMPLIANCE_TOPICS.length, 3);
});

// ---------------------------------------------------------------------------
// payload parsing
// ---------------------------------------------------------------------------

test("parseShopifyCompliancePayload: customers/data_request", () => {
  const cmd = parseShopifyCompliancePayload("customers/data_request", {
    shop_id: 901,
    shop_domain: "store.myshopify.com",
    customer: { id: 55, email: "a@b.com" },
    orders_requested: [1, 2],
    data_request: { id: 777 },
  });
  assert.equal(cmd.kind, "customer.data_request");
  assert.equal(cmd.shopDomain, "store.myshopify.com");
  assert.equal(cmd.shopId, 901);
  assert.equal(cmd.customerId, 55);
  assert.deepEqual([...cmd.ordersRequested], [1, 2]);
  assert.equal(cmd.dataRequestId, 777);
});

test("parseShopifyCompliancePayload: customers/redact and shop/redact", () => {
  const redact = parseShopifyCompliancePayload("customers/redact", {
    shop_domain: "store.myshopify.com",
    customer: { id: 55 },
    orders_to_redact: [9],
  });
  assert.equal(redact.kind, "customer.redact");
  assert.equal(redact.customerId, 55);
  assert.deepEqual([...redact.ordersToRedact], [9]);

  const shopRedact = parseShopifyCompliancePayload("shop/redact", {
    shop_id: 901,
    shop_domain: "store.myshopify.com",
  });
  assert.equal(shopRedact.kind, "shop.redact");
  assert.equal(shopRedact.shopId, 901);
});

test("parseShopifyCompliancePayload: app/uninstalled (myshopify_domain) and errors", () => {
  const uninstall = parseShopifyCompliancePayload("app/uninstalled", {
    id: 901,
    myshopify_domain: "store.myshopify.com",
  });
  assert.equal(uninstall.kind, "app.uninstalled");
  assert.equal(uninstall.shopDomain, "store.myshopify.com");

  // unknown topic
  assert.throws(
    () => parseShopifyCompliancePayload("orders/create", { shop_domain: "store.myshopify.com" }),
    (e) => e instanceof ConnectorError && e.category === "validation",
  );
  // invalid shop domain
  assert.throws(
    () => parseShopifyCompliancePayload("shop/redact", { shop_domain: "evil.com" }),
    (e) => e instanceof ConnectorError && e.category === "validation",
  );
});

// ---------------------------------------------------------------------------
// action plans
// ---------------------------------------------------------------------------

test("planComplianceActions: uninstall and shop redact are real deletions", () => {
  const uninstall = planComplianceActions({
    kind: "app.uninstalled",
    shopDomain: "store.myshopify.com",
    shopId: 1,
  });
  assert.deepEqual([...uninstall.actions], ["revoke_oauth_connection", "cancel_active_syncs"]);
  assert.equal(uninstall.immediate, true);
  assert.equal(uninstall.noopSafe, false);

  const shopRedact = planComplianceActions({
    kind: "shop.redact",
    shopDomain: "store.myshopify.com",
    shopId: 1,
  });
  assert.deepEqual(
    [...shopRedact.actions],
    ["delete_shop_catalog", "delete_shop_snapshots", "purge_shop_records"],
  );
  assert.equal(shopRedact.noopSafe, false);
});

test("planComplianceActions: customer callbacks are safe no-ops (no PII stored) but still actioned", () => {
  const redact = planComplianceActions({
    kind: "customer.redact",
    shopDomain: "store.myshopify.com",
    shopId: 1,
    customerId: 5,
    ordersToRedact: [],
  });
  assert.deepEqual([...redact.actions], ["delete_customer_data"]);
  assert.equal(redact.noopSafe, true);

  const request = planComplianceActions({
    kind: "customer.data_request",
    shopDomain: "store.myshopify.com",
    shopId: 1,
    customerId: 5,
    ordersRequested: [],
    dataRequestId: null,
  });
  assert.deepEqual([...request.actions], ["export_customer_data"]);
  assert.equal(request.noopSafe, true);
});
