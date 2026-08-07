/**
 * Shopify incremental reconciliation tests (task T043).
 *
 * Imports the built @fixmyfeed/connectors `shopify` namespace. Pure — no
 * network. Builds on the T034 reconcile + T041 NormalizedProduct.
 *
 * Traceability: docs/05-integrations/shopify/Shopify-integration-blueprint.md,
 * docs/04-system-architecture/consistency-and-reconciliation.md,
 * docs/07-data-architecture/data-reconciliation.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { shopify, ConnectorError } from "../packages/connectors/dist/index.js";

const {
  shopifyProductFingerprint,
  reconcileShopifyCatalog,
  buildIncrementalProductsQuery,
  maxUpdatedAt,
} = shopify;

const product = (overrides = {}) => ({
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
  variants: [
    {
      externalId: "gid://shopify/ProductVariant/11",
      sku: "W-1",
      barcode: "111",
      title: "Default",
      price: "9.99",
      compareAtPrice: null,
      availableForSale: true,
      inventoryQuantity: 3,
    },
  ],
  ...overrides,
});

// ---------------------------------------------------------------------------
// fingerprint
// ---------------------------------------------------------------------------

test("shopifyProductFingerprint: stable, order-independent for tags/variants, change-sensitive", () => {
  const a = shopifyProductFingerprint(product());
  assert.equal(a.length, 64); // sha256 hex
  // identical product -> identical fingerprint
  assert.equal(shopifyProductFingerprint(product()), a);
  // tag order does not matter
  assert.equal(
    shopifyProductFingerprint(product({ tags: ["x", "y"] })),
    shopifyProductFingerprint(product({ tags: ["y", "x"] })),
  );
  // a meaningful change (price) alters the fingerprint
  const changed = product({
    variants: [{ ...product().variants[0], price: "19.99" }],
  });
  assert.notEqual(shopifyProductFingerprint(changed), a);
});

// ---------------------------------------------------------------------------
// reconcile
// ---------------------------------------------------------------------------

test("reconcileShopifyCatalog: added / updated / removed / unchanged by fingerprint", () => {
  const local = [
    product({ externalId: "gid://shopify/Product/1" }), // unchanged
    product({ externalId: "gid://shopify/Product/2" }), // updated remotely
    product({ externalId: "gid://shopify/Product/3" }), // removed remotely
  ];
  const remote = [
    product({ externalId: "gid://shopify/Product/1" }),
    product({
      externalId: "gid://shopify/Product/2",
      variants: [{ ...product().variants[0], price: "5.00" }],
    }),
    product({ externalId: "gid://shopify/Product/4" }), // added
  ];
  const r = reconcileShopifyCatalog(local, remote);
  assert.deepEqual(
    r.added.map((p) => p.externalId),
    ["gid://shopify/Product/4"],
  );
  assert.deepEqual(
    r.updated.map((p) => p.externalId),
    ["gid://shopify/Product/2"],
  );
  assert.deepEqual(
    r.removed.map((p) => p.externalId),
    ["gid://shopify/Product/3"],
  );
  assert.deepEqual(
    r.unchanged.map((p) => p.externalId),
    ["gid://shopify/Product/1"],
  );
  assert.deepEqual(r.summary, { added: 1, updated: 1, removed: 1, unchanged: 1, total: 4 });
});

// ---------------------------------------------------------------------------
// incremental query
// ---------------------------------------------------------------------------

test("buildIncrementalProductsQuery: filters by updated_at, sorts UPDATED_AT, paginates", () => {
  const q = buildIncrementalProductsQuery("2026-08-07T00:00:00Z");
  assert.match(q, /sortKey: UPDATED_AT/);
  assert.match(q, /updated_at:>='2026-08-07T00:00:00Z'/);
  assert.match(q, /updatedAt/);
  assert.match(q, /pageInfo \{ hasNextPage endCursor \}/);
  // pagination cursor
  const q2 = buildIncrementalProductsQuery("2026-08-07T00:00:00Z", { pageSize: 50, after: "abc" });
  assert.match(q2, /first: 50/);
  assert.match(q2, /after: "abc"/);
  // invalid timestamp rejected
  assert.throws(() => buildIncrementalProductsQuery("not-a-date"), ConnectorError);
});

// ---------------------------------------------------------------------------
// watermark advancement
// ---------------------------------------------------------------------------

test("maxUpdatedAt: monotonic watermark, ignores invalid/older, never regresses", () => {
  assert.equal(
    maxUpdatedAt(null, ["2026-08-07T00:00:00Z", "2026-08-07T02:00:00Z", "2026-08-07T01:00:00Z"]),
    "2026-08-07T02:00:00.000Z",
  );
  // current wins when all candidates are older
  assert.equal(
    maxUpdatedAt("2026-08-07T05:00:00Z", ["2026-08-07T01:00:00Z"]),
    "2026-08-07T05:00:00.000Z",
  );
  // invalid candidates ignored
  assert.equal(
    maxUpdatedAt("2026-08-07T05:00:00Z", ["nope", null, undefined]),
    "2026-08-07T05:00:00.000Z",
  );
  assert.equal(maxUpdatedAt(null, []), null);
});
