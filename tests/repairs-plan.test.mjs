/**
 * Repair plan generation tests (task T091).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateRepairPlan, selectAutoApplicableChanges } from "../packages/repairs/dist/index.js";

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

test("generateRepairPlan: computes automatic https upgrades", () => {
  const plan = generateRepairPlan({
    issues: [
      issue("insecure_link_url", { field: "onlineStoreUrl" }),
      issue("insecure_image_url", {
        field: "images",
        evidence: { url: "http://cdn.example/i.jpg" },
      }),
    ],
    products: [product("p1")],
  });
  assert.equal(plan.summary.automatic, 2);
  const link = plan.changes.find((c) => c.issueCode === "insecure_link_url");
  assert.equal(link.proposedValue, "https://shop.example/p");
  assert.equal(link.requiresInput, false);
  const img = plan.changes.find((c) => c.issueCode === "insecure_image_url");
  assert.equal(img.proposedValue, "https://cdn.example/i.jpg");
});

test("generateRepairPlan: assisted title truncation + alt suggestion", () => {
  const longTitle = "x".repeat(200);
  const plan = generateRepairPlan({
    issues: [
      issue("title_too_long", { field: "title" }),
      issue("missing_image_alt", { field: "images" }),
    ],
    products: [product("p1", { title: longTitle })],
  });
  const title = plan.changes.find((c) => c.issueCode === "title_too_long");
  assert.equal(title.safetyClass, "assisted");
  assert.equal(title.proposedValue.length, 150);
  const alt = plan.changes.find((c) => c.issueCode === "missing_image_alt");
  assert.equal(alt.proposedValue, longTitle);
});

test("generateRepairPlan: manual issues require input; unknown codes skipped", () => {
  const plan = generateRepairPlan({
    issues: [
      issue("missing_title", { field: "title" }),
      issue("no_such_code", {}), // no remediation -> skipped
    ],
    products: [product("p1")],
  });
  assert.equal(plan.changes.length, 1);
  assert.equal(plan.changes[0].issueCode, "missing_title");
  assert.equal(plan.changes[0].requiresInput, true);
  assert.equal(plan.summary.manual, 1);
});

test("generateRepairPlan: includeManual=false drops requiresInput changes", () => {
  const plan = generateRepairPlan({
    issues: [issue("missing_title", { field: "title" })],
    products: [product("p1")],
    includeManual: false,
  });
  assert.equal(plan.changes.length, 0);
});

test("selectAutoApplicableChanges: only automatic non-high computed changes", () => {
  const plan = generateRepairPlan({
    issues: [
      issue("insecure_link_url", { field: "onlineStoreUrl" }),
      issue("title_too_long", { field: "title" }),
      issue("missing_title", { field: "title" }),
    ],
    products: [product("p1", { title: "x".repeat(200) })],
  });
  const auto = selectAutoApplicableChanges(plan);
  assert.deepEqual(
    auto.map((c) => c.issueCode),
    ["insecure_link_url"],
  );
});
