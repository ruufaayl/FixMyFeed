/**
 * Shopify controlled writeback tests (task T044).
 *
 * Imports the built @fixmyfeed/connectors `shopify` namespace. Pure — no
 * network. Focuses on the safety gates: allow-list, consent, and conflict.
 *
 * Traceability: docs/05-integrations/shopify/{shopify-writeback,
 * shopify-writeback-conflicts}.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { shopify, ConnectorError } from "../packages/connectors/dist/index.js";

const {
  WRITEBACK_ALLOWED_PRODUCT_FIELDS,
  validateProductWriteback,
  validateVariantWriteback,
  assertWritebackAuthorized,
  detectWritebackConflict,
  assertNoWritebackConflict,
  buildProductUpdateMutation,
  buildVariantUpdateMutation,
  userErrorsToConnectorError,
  shopifyProductFingerprint,
} = shopify;

const product = () => ({
  externalId: "gid://shopify/Product/1",
  handle: "widget",
  title: "Widget",
  description: null,
  productType: null,
  vendor: null,
  status: "active",
  tags: [],
  onlineStoreUrl: null,
  images: [],
  variants: [],
});

const approvedPlan = (change) => ({
  change,
  baselineFingerprint: "bf",
  idempotencyKey: "idem-1",
  approval: { approved: true, approvalId: "appr-1", approvedBy: "user-7" },
});

// ---------------------------------------------------------------------------
// allow-list validation (deny by default)
// ---------------------------------------------------------------------------

test("validateProductWriteback: allow-listed fields only; valid gid; non-empty", () => {
  assert.ok(WRITEBACK_ALLOWED_PRODUCT_FIELDS.includes("title"));
  assert.doesNotThrow(() =>
    validateProductWriteback({ externalId: "gid://shopify/Product/1", fields: { title: "Fixed" } }),
  );
  // non-allow-listed field rejected
  assert.throws(
    () =>
      validateProductWriteback({
        externalId: "gid://shopify/Product/1",
        fields: { status: "ARCHIVED" },
      }),
    (e) => e instanceof ConnectorError && e.category === "validation",
  );
  // empty change set rejected
  assert.throws(
    () => validateProductWriteback({ externalId: "gid://shopify/Product/1", fields: {} }),
    ConnectorError,
  );
  // bad gid rejected
  assert.throws(
    () => validateProductWriteback({ externalId: "123", fields: { title: "x" } }),
    ConnectorError,
  );
});

test("validateVariantWriteback: barcode/sku/price allowed; ids validated", () => {
  assert.doesNotThrow(() =>
    validateVariantWriteback({
      productExternalId: "gid://shopify/Product/1",
      externalId: "gid://shopify/ProductVariant/11",
      fields: { barcode: "0123456789012", price: "9.99" },
    }),
  );
  assert.throws(
    () =>
      validateVariantWriteback({
        productExternalId: "gid://shopify/Product/1",
        externalId: "gid://shopify/ProductVariant/11",
        fields: { weight: "1kg" },
      }),
    ConnectorError,
  );
  assert.throws(
    () =>
      validateVariantWriteback({
        productExternalId: "gid://shopify/Product/1",
        externalId: "not-a-variant",
        fields: { barcode: "1" },
      }),
    ConnectorError,
  );
});

// ---------------------------------------------------------------------------
// consent gate (never inferred)
// ---------------------------------------------------------------------------

test("assertWritebackAuthorized: requires approved + approvalId + idempotencyKey", () => {
  assert.doesNotThrow(() =>
    assertWritebackAuthorized(
      approvedPlan({ externalId: "gid://shopify/Product/1", fields: { title: "x" } }),
    ),
  );
  // not approved
  assert.throws(
    () => assertWritebackAuthorized({ ...approvedPlan({}), approval: { approved: false } }),
    (e) => e instanceof ConnectorError && e.category === "authorization",
  );
  // approved but no approvalId
  assert.throws(
    () => assertWritebackAuthorized({ ...approvedPlan({}), approval: { approved: true } }),
    (e) => e instanceof ConnectorError && e.category === "authorization",
  );
  // missing idempotency key
  assert.throws(
    () => assertWritebackAuthorized({ ...approvedPlan({}), idempotencyKey: "" }),
    (e) => e instanceof ConnectorError && e.category === "validation",
  );
});

// ---------------------------------------------------------------------------
// conflict detection
// ---------------------------------------------------------------------------

test("detectWritebackConflict / assertNoWritebackConflict: baseline vs current", () => {
  const p = product();
  const baseline = shopifyProductFingerprint(p);
  assert.equal(detectWritebackConflict(baseline, p), false);
  assert.doesNotThrow(() => assertNoWritebackConflict(baseline, p));

  const changed = { ...p, title: "Merchant Edited It" };
  assert.equal(detectWritebackConflict(baseline, changed), true);
  assert.throws(
    () => assertNoWritebackConflict(baseline, changed),
    (e) => e instanceof ConnectorError && e.category === "conflict" && e.retryable === false,
  );
});

// ---------------------------------------------------------------------------
// mutation building (only for authorized + validated plans)
// ---------------------------------------------------------------------------

test("buildProductUpdateMutation: builds productUpdate for an authorized plan", () => {
  const mutation = buildProductUpdateMutation(
    approvedPlan({
      externalId: "gid://shopify/Product/1",
      fields: { title: "Fixed Title", tags: ["a", "b"] },
    }),
  );
  assert.match(mutation, /productUpdate\(input: \{/);
  assert.match(mutation, /id: "gid:\/\/shopify\/Product\/1"/);
  assert.match(mutation, /title: "Fixed Title"/);
  assert.match(mutation, /tags: \["a","b"\]/);
  assert.match(mutation, /userErrors \{ field message \}/);
  // an unauthorized plan cannot build a mutation
  assert.throws(
    () =>
      buildProductUpdateMutation({
        ...approvedPlan({ externalId: "gid://shopify/Product/1", fields: { title: "x" } }),
        approval: { approved: false },
      }),
    ConnectorError,
  );
});

test("buildVariantUpdateMutation: productVariantsBulkUpdate with the variant input", () => {
  const mutation = buildVariantUpdateMutation(
    approvedPlan({
      productExternalId: "gid://shopify/Product/1",
      externalId: "gid://shopify/ProductVariant/11",
      fields: { barcode: "0123456789012", price: "9.99" },
    }),
  );
  assert.match(mutation, /productVariantsBulkUpdate\(productId: "gid:\/\/shopify\/Product\/1"/);
  assert.match(mutation, /id: "gid:\/\/shopify\/ProductVariant\/11"/);
  assert.match(mutation, /barcode: "0123456789012"/);
});

// ---------------------------------------------------------------------------
// userErrors mapping
// ---------------------------------------------------------------------------

test("userErrorsToConnectorError: maps Shopify userErrors, null when none", () => {
  assert.equal(userErrorsToConnectorError([]), null);
  assert.equal(userErrorsToConnectorError(undefined), null);
  const err = userErrorsToConnectorError([{ field: ["title"], message: "is too long" }]);
  assert.ok(err instanceof ConnectorError);
  assert.equal(err.category, "validation");
  assert.match(err.message, /title: is too long/);
});
