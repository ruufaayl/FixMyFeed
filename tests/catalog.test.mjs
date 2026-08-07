/**
 * Normalized catalog + immutable snapshot tests (task T073).
 *
 * Traceability: docs/07-data-architecture/{large-catalog-storage,
 * historical-snapshot-storage}.md and the catalog table specs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATALOG_STATUSES,
  catalogs,
  catalogProducts,
  catalogSnapshots,
  catalogProductFingerprint,
  toCatalogProductRow,
  buildCatalogSnapshot,
  toCatalogSnapshotRow,
} from "../packages/database/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");

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
      externalId: "v1",
      sku: "W-1",
      gtin: "111",
      title: null,
      price: "9.99",
      compareAtPrice: null,
      availableForSale: true,
      inventoryQuantity: 5,
    },
  ],
  ...overrides,
});

test("catalogProductFingerprint: deterministic, change-sensitive", () => {
  const a = catalogProductFingerprint(product());
  assert.equal(a.length, 64);
  assert.equal(catalogProductFingerprint(product()), a);
  assert.notEqual(catalogProductFingerprint(product({ title: "Changed" })), a);
});

test("toCatalogProductRow: row carries externalId, fingerprint, payload", () => {
  const row = toCatalogProductRow("org-1", "cat-1", product());
  assert.equal(row.organizationId, "org-1");
  assert.equal(row.catalogId, "cat-1");
  assert.equal(row.externalId, "gid://shopify/Product/1");
  assert.equal(row.fingerprint.length, 64);
  assert.equal(row.payload.title, "Widget");
});

test("buildCatalogSnapshot: order-independent content hash + count", () => {
  const p1 = product({ externalId: "a" });
  const p2 = product({ externalId: "b", title: "Second" });
  const s1 = buildCatalogSnapshot([p1, p2]);
  const s2 = buildCatalogSnapshot([p2, p1]); // reversed order
  assert.equal(s1.snapshotHash, s2.snapshotHash); // order-independent
  assert.equal(s1.productCount, 2);
  // a changed product changes the snapshot hash
  const s3 = buildCatalogSnapshot([p1, product({ externalId: "b", title: "Different" })]);
  assert.notEqual(s3.snapshotHash, s1.snapshotHash);

  const snapRow = toCatalogSnapshotRow("org-1", "cat-1", s1, new Date("2026-08-07T00:00:00Z"));
  assert.equal(snapRow.productCount, 2);
  assert.equal(snapRow.snapshotHash, s1.snapshotHash);
});

test("schema + migration: catalog tables and migration 0011", () => {
  assert.deepEqual(CATALOG_STATUSES, ["active", "archived"]);
  assert.equal(getTableConfig(catalogs).name, "catalogs");
  const productCols = new Set(getTableConfig(catalogProducts).columns.map((c) => c.name));
  for (const c of ["catalog_id", "external_id", "fingerprint", "payload"]) {
    assert.ok(productCols.has(c), `catalog_products missing ${c}`);
  }
  const snapCols = new Set(getTableConfig(catalogSnapshots).columns.map((c) => c.name));
  for (const c of ["catalog_id", "snapshot_hash", "product_count", "captured_at"]) {
    assert.ok(snapCols.has(c), `catalog_snapshots missing ${c}`);
  }
  // snapshots are immutable: no updated_at / version column
  assert.equal(snapCols.has("updated_at"), false);
  assert.equal(snapCols.has("version"), false);

  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0011_t073_normalized_catalog.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "catalogs"/);
  assert.match(sql, /CREATE TABLE "catalog_products"/);
  assert.match(sql, /CREATE TABLE "catalog_snapshots"/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[11].tag, "0011_t073_normalized_catalog");
});
