/**
 * Landing-page + consistency validator tests (task T084).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  consistencyValidators,
  checkLandingPages,
  runValidators,
} from "../packages/diagnostics/dist/index.js";

const variant = (o = {}) => ({
  externalId: "v1",
  sku: null,
  gtin: null,
  title: null,
  price: "10.00",
  compareAtPrice: "15.00",
  availableForSale: true,
  inventoryQuantity: 5,
  ...o,
});
const product = (externalId, o = {}) => ({
  externalId,
  handle: null,
  title: "P",
  description: "d",
  productType: null,
  vendor: null,
  status: "active",
  tags: [],
  onlineStoreUrl: "https://shop.example/p",
  images: [],
  variants: [variant()],
  ...o,
});

const codes = (products) =>
  runValidators(consistencyValidators, { products }).issues.map((i) => i.code);

test("consistency: clean product yields no issues", () => {
  assert.deepEqual(codes([product("p1")]), []);
});

test("consistency: compare-at below price, availability/inventory, title length", () => {
  const p = product("p1", {
    title: "x".repeat(151),
    variants: [
      variant({ price: "20.00", compareAtPrice: "10.00" }), // compare-at below price
      variant({ externalId: "v2", availableForSale: true, inventoryQuantity: 0 }), // available w/o stock
      variant({ externalId: "v3", availableForSale: false, inventoryQuantity: 7 }), // unavailable w/ stock
    ],
  });
  const found = codes([p]).sort();
  assert.deepEqual(found, [
    "available_without_inventory",
    "invalid_compare_at_price",
    "title_too_long",
    "unavailable_with_inventory",
  ]);
});

test("checkLandingPages: unavailable, price mismatch, missing structured data", async () => {
  const probe = {
    async fetch(url) {
      if (url.includes("oos")) {
        return { available: false, price: "10.00", hasStructuredData: true };
      }
      if (url.includes("mismatch")) {
        return { available: true, price: "99.00", hasStructuredData: false };
      }
      return { available: true, price: "10.00", hasStructuredData: true };
    },
  };
  const products = [
    product("a", { onlineStoreUrl: "https://shop.example/oos" }),
    product("b", { onlineStoreUrl: "https://shop.example/mismatch" }),
    product("c", { onlineStoreUrl: "https://shop.example/ok" }),
  ];
  const issues = await checkLandingPages(products, probe);
  const found = issues.map((i) => i.code);
  assert.ok(found.includes("landing_page_unavailable"));
  assert.ok(found.includes("landing_page_price_mismatch"));
  assert.ok(found.includes("missing_structured_data"));
  assert.equal(issues.filter((i) => i.productExternalId === "c").length, 0);
});

test("checkLandingPages: null facts (unfetchable) are skipped", async () => {
  const probe = {
    async fetch() {
      return null;
    },
  };
  const issues = await checkLandingPages([product("a")], probe);
  assert.deepEqual(issues, []);
});
