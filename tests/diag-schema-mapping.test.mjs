/**
 * Schema mapping + import preview tests (task T072).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REQUIRED_FEED_ATTRIBUTES,
  inferMapping,
  applyMapping,
  buildImportPreview,
  DiagnosticsError,
} from "../packages/diagnostics/dist/index.js";

test("inferMapping: aliases map headers to canonical attributes", () => {
  const mapping = inferMapping([
    "SKU",
    "Product Name",
    "Body (HTML)",
    "Price",
    "Image Src",
    "Barcode",
    "Vendor",
  ]);
  assert.equal(mapping["SKU"], "id");
  assert.equal(mapping["Product Name"], "title");
  assert.equal(mapping["Body (HTML)"], "description");
  assert.equal(mapping["Price"], "price");
  assert.equal(mapping["Image Src"], "image_link");
  assert.equal(mapping["Barcode"], "gtin");
  assert.equal(mapping["Vendor"], "brand");
});

test("inferMapping: an attribute is claimed at most once", () => {
  // two id-like columns; only the first wins the 'id' attribute
  const mapping = inferMapping(["id", "sku"]);
  assert.equal(mapping["id"], "id");
  assert.equal(mapping["sku"], undefined);
});

test("applyMapping: keys records by canonical attribute, drops empties", () => {
  const mapping = { SKU: "id", "Product Name": "title", Barcode: "gtin" };
  const out = applyMapping({ SKU: "W-1", "Product Name": "Widget", Barcode: "" }, mapping);
  assert.deepEqual(out, { id: "W-1", title: "Widget" }); // empty barcode dropped
});

test("buildImportPreview: coverage, readiness, sample, unmapped", () => {
  const records = [
    {
      id: "1",
      title: "A",
      description: "d",
      link: "https://x/1",
      "image link": "https://cdn/1",
      price: "9.99",
      availability: "in stock",
      junk: "z",
    },
    {
      id: "2",
      title: "B",
      description: "d",
      link: "https://x/2",
      "image link": "https://cdn/2",
      price: "5.00",
      availability: "in stock",
      junk: "y",
    },
  ];
  const preview = buildImportPreview(records, { sampleSize: 1 });
  assert.equal(preview.totalRecords, 2);
  assert.equal(preview.ready, true); // all required covered
  for (const attr of REQUIRED_FEED_ATTRIBUTES) assert.equal(preview.requiredCoverage[attr], true);
  assert.deepEqual([...preview.unmappedColumns], ["junk"]);
  assert.equal(preview.sample.length, 1);
  assert.equal(preview.sample[0].id, "1");

  // missing required -> not ready
  const partial = buildImportPreview([{ title: "A", price: "1" }]);
  assert.equal(partial.ready, false);
  assert.equal(partial.requiredCoverage.id, false);
  assert.throws(() => buildImportPreview("nope"), DiagnosticsError);
});
