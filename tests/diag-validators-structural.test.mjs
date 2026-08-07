/**
 * Structural + required-attribute validator tests (task T081).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  requiredAttributeValidators,
  structuralValidators,
  runValidators,
} from "../packages/diagnostics/dist/index.js";

const variant = (o = {}) => ({
  externalId: "v1",
  sku: null,
  gtin: null,
  title: null,
  price: "9.99",
  compareAtPrice: null,
  availableForSale: true,
  inventoryQuantity: 3,
  ...o,
});
const product = (o = {}) => ({
  externalId: "p1",
  handle: "p",
  title: "Widget",
  description: "A widget",
  productType: null,
  vendor: null,
  status: "active",
  tags: [],
  onlineStoreUrl: "https://shop.example/p",
  images: [{ externalId: "i1", url: "https://cdn.example/i.jpg", altText: null }],
  variants: [variant()],
  ...o,
});

const codes = (validators, products) =>
  runValidators(validators, { products }).issues.map((i) => i.code);

test("required attributes: a complete product yields no issues", () => {
  assert.deepEqual(codes(requiredAttributeValidators, [product()]), []);
});

test("required attributes: flags missing title/description/link/image/price", () => {
  const bad = product({
    title: "  ",
    description: null,
    onlineStoreUrl: null,
    images: [],
    variants: [variant({ price: null })],
  });
  const found = codes(requiredAttributeValidators, [bad]).sort();
  assert.deepEqual(found, [
    "missing_description",
    "missing_image",
    "missing_link",
    "missing_price",
    "missing_title",
  ]);
});

test("required.price: satisfied when any variant has a valid price", () => {
  const p = product({
    variants: [variant({ price: null }), variant({ externalId: "v2", price: "5.00" })],
  });
  assert.equal(codes(requiredAttributeValidators, [p]).includes("missing_price"), false);
});

test("structural: clean product yields no issues", () => {
  assert.deepEqual(codes(structuralValidators, [product()]), []);
});

test("structural: no_variants, duplicate ids, bad price, negative inventory", () => {
  const noVariants = product({ externalId: "nv", variants: [] });
  const dup = product({
    externalId: "dup",
    variants: [variant({ externalId: "x" }), variant({ externalId: "x" })],
  });
  const badPrice = product({
    externalId: "bp",
    variants: [variant({ price: "1,99" })],
  });
  const negInv = product({
    externalId: "ni",
    variants: [variant({ inventoryQuantity: -4 })],
  });
  const found = codes(structuralValidators, [noVariants, dup, badPrice, negInv]).sort();
  assert.deepEqual(found, [
    "duplicate_variant_id",
    "invalid_price_format",
    "negative_inventory",
    "no_variants",
  ]);
});
