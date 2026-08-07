/**
 * Product identity + variant matching tests (task T074).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGtin,
  normalizeSku,
  productIdentityKeys,
  matchProducts,
  matchVariants,
} from "../packages/diagnostics/dist/index.js";

const variant = (o = {}) => ({
  externalId: "v",
  sku: null,
  gtin: null,
  title: null,
  price: null,
  compareAtPrice: null,
  availableForSale: true,
  inventoryQuantity: null,
  ...o,
});
const product = (externalId, variants) => ({
  externalId,
  handle: null,
  title: "P",
  description: null,
  productType: null,
  vendor: null,
  status: "active",
  tags: [],
  onlineStoreUrl: null,
  images: [],
  variants,
});

test("normalizeGtin/normalizeSku", () => {
  assert.equal(normalizeGtin("0-1234-56789-012"), "0123456789012"); // 13 digits
  assert.equal(normalizeGtin("123"), null); // wrong length
  assert.equal(normalizeGtin(null), null);
  assert.equal(normalizeSku("  W-1 "), "w-1");
  assert.equal(normalizeSku(""), null);
});

test("productIdentityKeys: gtin/sku from variants + external id", () => {
  const keys = productIdentityKeys(
    product("ext-1", [variant({ gtin: "0123456789012", sku: "W-1" })]),
  );
  assert.ok(keys.includes("gtin:0123456789012"));
  assert.ok(keys.includes("sku:w-1"));
  assert.ok(keys.includes("id:ext-1"));
});

test("matchProducts: matches by gtin > sku > id; reports unmatched", () => {
  const local = [
    product("L1", [variant({ gtin: "0123456789012", sku: "A" })]), // matches remote by gtin
    product("shared-id", [variant({ sku: "only-local" })]), // matches remote by id
    product("L3", [variant({ sku: "gone" })]), // only local
  ];
  const remote = [
    product("R1", [variant({ gtin: "0123456789012", sku: "different" })]),
    product("shared-id", [variant({ sku: "only-remote" })]),
    product("R3", [variant({ sku: "new" })]), // only remote
  ];
  const result = matchProducts(local, remote);
  assert.equal(result.matched.length, 2);
  assert.equal(result.matched[0].on, "gtin");
  assert.equal(result.matched[1].on, "id");
  assert.deepEqual(
    result.onlyLocal.map((p) => p.externalId),
    ["L3"],
  );
  assert.deepEqual(
    result.onlyRemote.map((p) => p.externalId),
    ["R3"],
  );
});

test("matchVariants: by gtin then sku", () => {
  const a = product("A", [
    variant({ externalId: "a1", gtin: "0123456789012" }),
    variant({ externalId: "a2", sku: "S2" }),
  ]);
  const b = product("B", [
    variant({ externalId: "b1", gtin: "0123456789012" }),
    variant({ externalId: "b2", sku: "s2" }),
    variant({ externalId: "b3", sku: "extra" }),
  ]);
  const r = matchVariants(a, b);
  assert.equal(r.matched.length, 2);
  assert.equal(r.matched[0].on, "gtin");
  assert.equal(r.matched[1].on, "sku");
  assert.deepEqual(
    r.onlyRemote.map((v) => v.externalId),
    ["b3"],
  );
});
