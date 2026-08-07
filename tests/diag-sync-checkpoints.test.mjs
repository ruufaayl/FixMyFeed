/**
 * Incremental synchronization checkpoint tests (task T075).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogProductFingerprint } from "../packages/database/dist/index.js";
import {
  fingerprintIndex,
  computeCatalogDelta,
  deltaHasChanges,
  buildSyncCheckpoint,
} from "../packages/diagnostics/dist/index.js";

const product = (externalId, title = "P") => ({
  externalId,
  handle: null,
  title,
  description: null,
  productType: null,
  vendor: null,
  status: "active",
  tags: [],
  onlineStoreUrl: null,
  images: [],
  variants: [],
});

test("computeCatalogDelta: classifies added / updated / unchanged / removed", () => {
  const a = product("a", "A");
  const b = product("b", "B");
  const c = product("c", "C");
  const baseline = fingerprintIndex([
    { externalId: "a", fingerprint: catalogProductFingerprint(a) },
    { externalId: "b", fingerprint: catalogProductFingerprint(b) },
    { externalId: "gone", fingerprint: "deadbeef" },
  ]);

  const incoming = [
    a, // unchanged
    product("b", "B renamed"), // updated (fingerprint differs)
    c, // added
  ];
  const delta = computeCatalogDelta(baseline, incoming);

  assert.deepEqual(
    delta.unchanged.map((p) => p.externalId),
    ["a"],
  );
  assert.deepEqual(
    delta.updated.map((p) => p.externalId),
    ["b"],
  );
  assert.deepEqual(
    delta.added.map((p) => p.externalId),
    ["c"],
  );
  assert.deepEqual(delta.removedExternalIds, ["gone"]);
});

test("deltaHasChanges: false only when nothing added/updated/removed", () => {
  const a = product("a");
  const baseline = fingerprintIndex([
    { externalId: "a", fingerprint: catalogProductFingerprint(a) },
  ]);
  const noChange = computeCatalogDelta(baseline, [a]);
  assert.equal(deltaHasChanges(noChange), false);

  const withChange = computeCatalogDelta(baseline, [a, product("b")]);
  assert.equal(deltaHasChanges(withChange), true);
});

test("buildSyncCheckpoint: full-state hash + delta counts + cursor + ISO time", () => {
  const products = [product("a"), product("b")];
  const delta = computeCatalogDelta(new Map(), products); // both added
  const checkpoint = buildSyncCheckpoint(products, delta, {
    cursor: "2026-08-07T00:00:00Z",
    capturedAt: new Date("2026-08-07T12:00:00Z"),
  });

  assert.equal(checkpoint.productCount, 2);
  assert.equal(checkpoint.snapshotHash.length, 64);
  assert.equal(checkpoint.cursor, "2026-08-07T00:00:00Z");
  assert.equal(checkpoint.capturedAt, "2026-08-07T12:00:00.000Z");
  assert.deepEqual(checkpoint.counts, { added: 2, updated: 0, unchanged: 0, removed: 0 });

  // order-independent full-state hash, and cursor defaults to null
  const reversed = buildSyncCheckpoint([products[1], products[0]], delta);
  assert.equal(reversed.snapshotHash, checkpoint.snapshotHash);
  assert.equal(reversed.cursor, null);
});
