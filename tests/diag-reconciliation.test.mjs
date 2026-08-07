/**
 * Full reconciliation + discrepancy record tests (task T076).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogDiscrepancies, DISCREPANCY_KINDS } from "../packages/database/dist/index.js";
import { reconcileCatalogs, toCatalogDiscrepancyRow } from "../packages/diagnostics/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");

const variant = (o = {}) => ({
  externalId: "v1",
  sku: null,
  gtin: null,
  title: null,
  price: "9.99",
  compareAtPrice: null,
  availableForSale: true,
  inventoryQuantity: null,
  ...o,
});
const product = (externalId, o = {}) => ({
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
  variants: [variant()],
  ...o,
});

test("reconcileCatalogs: missing / extra / field_mismatch + inSync", () => {
  const source = [
    product("s1", { variants: [variant({ gtin: "0123456789012" })] }), // matches downstream by gtin, drifted title
    product("s2", { title: "Only Source" }), // missing downstream
    product("s3", { title: "Same" }), // matched, identical
  ];
  const downstream = [
    product("d1", {
      title: "Drifted",
      variants: [variant({ gtin: "0123456789012", price: "5.00" })],
    }),
    product("s3", { title: "Same" }),
    product("d9", { title: "Only Downstream" }), // extra downstream
  ];

  const result = reconcileCatalogs(source, downstream);
  assert.equal(result.inSync, false);
  assert.equal(result.summary.missingDownstream, 1);
  assert.equal(result.summary.extraDownstream, 1);
  assert.equal(result.summary.fieldMismatch, 1);

  const mismatch = result.discrepancies.find((d) => d.kind === "field_mismatch");
  assert.equal(mismatch.matchedOn, "gtin");
  assert.ok(mismatch.fields.includes("title"));
  assert.ok(mismatch.fields.includes("variant:v1.price"));

  const missing = result.discrepancies.find((d) => d.kind === "missing_downstream");
  assert.equal(missing.externalId, "s2");
  const extra = result.discrepancies.find((d) => d.kind === "extra_downstream");
  assert.equal(extra.externalId, "d9");
});

test("reconcileCatalogs: identical catalogs are inSync", () => {
  const cat = [product("a"), product("b", { title: "B" })];
  const result = reconcileCatalogs(
    cat,
    cat.map((p) => ({ ...p })),
  );
  assert.equal(result.inSync, true);
  assert.equal(result.discrepancies.length, 0);
  assert.equal(result.summary.matched, 2);
});

test("toCatalogDiscrepancyRow: maps to insert row", () => {
  const row = toCatalogDiscrepancyRow(
    "org-1",
    "cat-1",
    "run-1",
    { kind: "field_mismatch", externalId: "s1", matchedOn: "gtin", fields: ["title"] },
    new Date("2026-08-07T00:00:00Z"),
  );
  assert.equal(row.organizationId, "org-1");
  assert.equal(row.catalogId, "cat-1");
  assert.equal(row.runId, "run-1");
  assert.equal(row.kind, "field_mismatch");
  assert.equal(row.externalId, "s1");
  assert.equal(row.matchedOn, "gtin");
  assert.deepEqual(row.fields, ["title"]);
});

test("schema + migration: catalog_discrepancies and migration 0012", () => {
  assert.deepEqual(DISCREPANCY_KINDS, ["missing_downstream", "extra_downstream", "field_mismatch"]);
  const cols = new Set(getTableConfig(catalogDiscrepancies).columns.map((c) => c.name));
  for (const c of ["catalog_id", "run_id", "kind", "external_id", "matched_on", "fields"]) {
    assert.ok(cols.has(c), `catalog_discrepancies missing ${c}`);
  }
  // append-only: no updated_at / version
  assert.equal(cols.has("updated_at"), false);
  assert.equal(cols.has("version"), false);

  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0012_t076_catalog_discrepancies.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "catalog_discrepancies"/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[12].tag, "0012_t076_catalog_discrepancies");
});
