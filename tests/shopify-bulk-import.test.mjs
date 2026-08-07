/**
 * Shopify bulk catalog import tests (task T041).
 *
 * Imports the built @fixmyfeed/connectors `shopify` namespace. Pure — no
 * network. Exercises the bulk-operation lifecycle helpers, the JSONL tree
 * reconstruction, and Shopify→normalized product mapping.
 *
 * Traceability: docs/05-integrations/shopify/{shopify-bulk-operations,
 * shopify-product-model,shopify-source-mapping,shopify-product-status-model}.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { shopify, ConnectorError } from "../packages/connectors/dist/index.js";

const {
  SHOPIFY_BULK_STATUSES,
  SHOPIFY_PRODUCT_BULK_QUERY,
  isBulkTerminal,
  isBulkComplete,
  buildProductBulkRunMutation,
  mapShopifyProduct,
  parseBulkJsonl,
} = shopify;

// ---------------------------------------------------------------------------
// bulk operation lifecycle
// ---------------------------------------------------------------------------

test("bulk lifecycle: statuses, terminal and complete classification", () => {
  assert.ok(SHOPIFY_BULK_STATUSES.includes("COMPLETED"));
  assert.equal(isBulkComplete("COMPLETED"), true);
  assert.equal(isBulkComplete("RUNNING"), false);
  assert.equal(isBulkTerminal("COMPLETED"), true);
  assert.equal(isBulkTerminal("FAILED"), true);
  assert.equal(isBulkTerminal("EXPIRED"), true);
  assert.equal(isBulkTerminal("RUNNING"), false);
  assert.equal(isBulkTerminal("CREATED"), false);
});

test("buildProductBulkRunMutation: wraps the product query in bulkOperationRunQuery", () => {
  const mutation = buildProductBulkRunMutation();
  assert.match(mutation, /bulkOperationRunQuery\(query:/);
  assert.match(mutation, /bulkOperation \{ id status \}/);
  assert.match(mutation, /userErrors/);
  // The default query asks for products with variants and media.
  assert.match(SHOPIFY_PRODUCT_BULK_QUERY, /products/);
  assert.match(SHOPIFY_PRODUCT_BULK_QUERY, /variants/);
  assert.match(SHOPIFY_PRODUCT_BULK_QUERY, /barcode/);
});

// ---------------------------------------------------------------------------
// mapShopifyProduct
// ---------------------------------------------------------------------------

test("mapShopifyProduct: normalizes fields, status, and children", () => {
  const p = mapShopifyProduct({
    id: "gid://shopify/Product/1",
    handle: "widget",
    title: "Widget",
    descriptionHtml: "<p>hi</p>",
    productType: "Gadgets",
    vendor: "Acme",
    status: "ACTIVE",
    tags: ["a", "b"],
    onlineStoreUrl: "https://store.myshopify.com/products/widget",
    variants: [
      {
        id: "gid://shopify/ProductVariant/11",
        sku: "W-1",
        barcode: "0123456789012",
        title: "Default",
        price: "9.99",
        compareAtPrice: null,
        availableForSale: true,
        inventoryQuantity: 5,
      },
    ],
    images: [{ id: "gid://shopify/MediaImage/21", url: "https://cdn/x.jpg", altText: "alt" }],
  });
  assert.equal(p.externalId, "gid://shopify/Product/1");
  assert.equal(p.status, "active");
  assert.deepEqual([...p.tags], ["a", "b"]);
  assert.equal(p.variants[0].barcode, "0123456789012");
  assert.equal(p.variants[0].price, "9.99");
  assert.equal(p.variants[0].availableForSale, true);
  assert.equal(p.images[0].url, "https://cdn/x.jpg");

  // status mapping
  assert.equal(
    mapShopifyProduct({ id: "gid://shopify/Product/2", title: "X", status: "ARCHIVED" }).status,
    "archived",
  );
  assert.equal(
    mapShopifyProduct({ id: "gid://shopify/Product/3", title: "X", status: "DRAFT" }).status,
    "draft",
  );
  assert.equal(mapShopifyProduct({ id: "gid://shopify/Product/4", title: "X" }).status, "active");

  // required fields
  assert.throws(() => mapShopifyProduct({ id: "", title: "X" }), ConnectorError);
  assert.throws(() => mapShopifyProduct({ id: "gid://shopify/Product/5" }), ConnectorError);
});

// ---------------------------------------------------------------------------
// parseBulkJsonl
// ---------------------------------------------------------------------------

test("parseBulkJsonl: reconstructs products with variants and images via __parentId", () => {
  const jsonl = [
    JSON.stringify({
      id: "gid://shopify/Product/1",
      title: "Widget",
      status: "ACTIVE",
      handle: "widget",
    }),
    JSON.stringify({
      id: "gid://shopify/ProductVariant/11",
      sku: "W-1",
      barcode: "111",
      price: "9.99",
      availableForSale: true,
      __parentId: "gid://shopify/Product/1",
    }),
    JSON.stringify({
      id: "gid://shopify/MediaImage/21",
      image: { url: "https://cdn/1.jpg", altText: null },
      __parentId: "gid://shopify/Product/1",
    }),
    JSON.stringify({ id: "gid://shopify/Product/2", title: "Gadget", status: "DRAFT" }),
    JSON.stringify({
      id: "gid://shopify/ProductVariant/12",
      sku: "G-1",
      __parentId: "gid://shopify/Product/2",
    }),
    "", // blank line ignored
    JSON.stringify({
      id: "gid://shopify/ProductVariant/99",
      sku: "orphan",
      __parentId: "gid://shopify/Product/404",
    }), // orphan -> skipped
  ].join("\n");

  const products = parseBulkJsonl(jsonl);
  assert.equal(products.length, 2);
  assert.equal(products[0].externalId, "gid://shopify/Product/1");
  assert.equal(products[0].title, "Widget");
  assert.equal(products[0].variants.length, 1);
  assert.equal(products[0].variants[0].barcode, "111");
  assert.equal(products[0].images.length, 1);
  assert.equal(products[0].images[0].url, "https://cdn/1.jpg");
  assert.equal(products[1].externalId, "gid://shopify/Product/2");
  assert.equal(products[1].status, "draft");
  assert.equal(products[1].variants.length, 1);
  assert.equal(products[1].images.length, 0);
});

test("parseBulkJsonl: empty input yields no products; malformed line throws", () => {
  assert.deepEqual(parseBulkJsonl(""), []);
  assert.deepEqual(parseBulkJsonl("\n  \n"), []);
  assert.throws(() => parseBulkJsonl("{not json}"), ConnectorError);
});
