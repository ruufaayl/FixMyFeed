/**
 * Change-set preview + conflict detection tests (task T092).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogProductFingerprint } from "../packages/database/dist/index.js";
import {
  generateRepairPlan,
  buildChangeSetPreview,
  readyChanges,
} from "../packages/repairs/dist/index.js";

const product = (externalId, o = {}) => ({
  externalId,
  handle: null,
  title: "Widget",
  description: null,
  productType: null,
  vendor: null,
  status: "active",
  tags: [],
  onlineStoreUrl: "http://shop.example/p",
  images: [],
  variants: [],
  ...o,
});
const issue = (code, o = {}) => ({
  code,
  severity: "warning",
  productExternalId: "p1",
  variantExternalId: null,
  field: null,
  message: "m",
  ...o,
});

const linkPlan = (p) =>
  generateRepairPlan({
    issues: [issue("insecure_link_url", { field: "onlineStoreUrl" })],
    products: [p],
  });

test("preview: ready change on a clean product", () => {
  const p = product("p1");
  const preview = buildChangeSetPreview({ plan: linkPlan(p), products: [p] });
  assert.equal(preview.hasConflicts, false);
  assert.equal(preview.summary.ready, 1);
  assert.equal(preview.entries[0].status, "ready");
  assert.deepEqual(
    readyChanges(preview).map((c) => c.issueCode),
    ["insecure_link_url"],
  );
});

test("preview: noop when the field already holds the proposed value", () => {
  const p = product("p1");
  const plan = linkPlan(p);
  // product now already on https -> proposed equals live
  const updated = product("p1", { onlineStoreUrl: "https://shop.example/p" });
  const preview = buildChangeSetPreview({ plan, products: [updated] });
  // live value differs from the recorded currentValue (http) -> concurrent_edit conflict
  assert.equal(preview.entries[0].status, "conflict");
  assert.equal(preview.entries[0].conflictReason, "concurrent_edit");
});

test("preview: needs_input for manual changes", () => {
  const p = product("p1", { title: "" });
  const plan = generateRepairPlan({
    issues: [issue("missing_title", { field: "title" })],
    products: [p],
  });
  const preview = buildChangeSetPreview({ plan, products: [p] });
  assert.equal(preview.entries[0].status, "needs_input");
});

test("preview: missing product is a conflict", () => {
  const p = product("p1");
  const preview = buildChangeSetPreview({ plan: linkPlan(p), products: [] });
  assert.equal(preview.entries[0].status, "conflict");
  assert.equal(preview.entries[0].conflictReason, "missing_product");
});

test("preview: baseline fingerprint mismatch flags product_changed", () => {
  const p = product("p1");
  const plan = linkPlan(p);
  const baseline = new Map([["p1", "stale-fingerprint"]]);
  const preview = buildChangeSetPreview({ plan, products: [p], baselineFingerprints: baseline });
  assert.equal(preview.entries[0].status, "conflict");
  assert.equal(preview.entries[0].conflictReason, "product_changed");

  // matching fingerprint -> no conflict
  const good = new Map([["p1", catalogProductFingerprint(p)]]);
  const ok = buildChangeSetPreview({ plan, products: [p], baselineFingerprints: good });
  assert.equal(ok.entries[0].status, "ready");
});
