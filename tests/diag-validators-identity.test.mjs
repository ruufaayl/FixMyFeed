/**
 * Identity + variant validator tests (task T082).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  identityValidators,
  isValidGtinChecksum,
  runValidators,
} from "../packages/diagnostics/dist/index.js";

const VALID_GTIN = "4006381333931"; // valid EAN-13
const BAD_CHECKSUM = "4006381333930"; // same body, wrong check digit

const variant = (o = {}) => ({
  externalId: "v1",
  sku: "SKU-1",
  gtin: VALID_GTIN,
  title: null,
  price: "9.99",
  compareAtPrice: null,
  availableForSale: true,
  inventoryQuantity: 1,
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

const codes = (products) =>
  runValidators(identityValidators, { products }).issues.map((i) => i.code);

test("isValidGtinChecksum: accepts valid, rejects wrong check digit", () => {
  assert.equal(isValidGtinChecksum(VALID_GTIN), true);
  assert.equal(isValidGtinChecksum(BAD_CHECKSUM), false);
});

test("identity: clean catalog yields no issues", () => {
  assert.deepEqual(codes([product("p1", [variant()])]), []);
});

test("identity.gtin_format: flags bad length and bad checksum", () => {
  const found = codes([
    product("a", [variant({ gtin: "123" })]),
    product("b", [variant({ externalId: "v2", sku: "S2", gtin: BAD_CHECKSUM })]),
  ]);
  assert.equal(found.filter((c) => c === "invalid_gtin").length, 2);
});

test("identity.missing_identifier: variant with neither gtin nor sku", () => {
  const found = codes([product("a", [variant({ gtin: null, sku: null })])]);
  assert.ok(found.includes("missing_identifier"));
});

test("identity: duplicate sku and gtin across different products", () => {
  const found = codes([
    product("a", [variant({ externalId: "va", sku: "DUP", gtin: VALID_GTIN })]),
    product("b", [variant({ externalId: "vb", sku: "dup", gtin: VALID_GTIN })]), // sku case-normalized dup
  ]);
  assert.ok(found.includes("duplicate_sku"));
  assert.ok(found.includes("duplicate_gtin"));
  // same sku within a single product is not a cross-product duplicate
  const single = codes([
    product("solo", [
      variant({ externalId: "v1", sku: "X", gtin: null }),
      variant({ externalId: "v2", sku: "X", gtin: null }),
    ]),
  ]);
  assert.equal(single.includes("duplicate_sku"), false);
});
