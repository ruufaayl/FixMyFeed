/**
 * Diagnostic scan orchestration tests (task T087).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runDiagnosticScan,
  defaultValidators,
  defaultValidatorRegistry,
} from "../packages/diagnostics/dist/index.js";

const variant = (o = {}) => ({
  externalId: "v1",
  sku: "S1",
  gtin: null,
  title: null,
  price: "9.99",
  compareAtPrice: null,
  availableForSale: true,
  inventoryQuantity: 3,
  ...o,
});
const product = (externalId, o = {}) => ({
  externalId,
  handle: null,
  title: "Widget",
  description: "A widget",
  productType: null,
  vendor: null,
  status: "active",
  tags: [],
  onlineStoreUrl: "https://shop.example/p",
  images: [{ externalId: "i1", url: "https://cdn.example/i.jpg", altText: "alt" }],
  variants: [variant()],
  ...o,
});

test("defaultValidatorRegistry: registers all built-in validators uniquely", () => {
  const reg = defaultValidatorRegistry();
  assert.equal(reg.size, defaultValidators().length);
  assert.ok(reg.has("required.title"));
  assert.ok(reg.has("identity.duplicate_sku"));
  assert.ok(reg.has("consistency.compare_at_price"));
});

test("runDiagnosticScan: clean catalog yields no issues", async () => {
  const result = await runDiagnosticScan({ products: [product("p1")] });
  assert.equal(result.summary.total, 0);
  assert.equal(result.scored.length, 0);
  assert.deepEqual(result.failedValidators, []);
});

test("runDiagnosticScan: finds issues, prioritizes, computes lifecycle", async () => {
  const bad = product("bad", {
    title: "",
    onlineStoreUrl: null,
    images: [],
    variants: [variant({ price: null })],
  });
  const result = await runDiagnosticScan({ products: [bad] });
  const codes = result.scored.map((i) => i.code);
  assert.ok(codes.includes("missing_title"));
  assert.ok(codes.includes("missing_image"));
  assert.ok(codes.includes("missing_price"));
  // critical, blocking issues sort to the top
  assert.equal(result.scored[0].severity, "critical");
  // all findings are new when there is no prior state
  assert.equal(result.lifecycle.opened.length, result.summary.total);
  assert.equal(result.lifecycle.persisting.length, 0);
});

test("runDiagnosticScan: runs injected probes and merges their issues", async () => {
  const urlProbe = {
    async probe(url) {
      return url.includes("dead")
        ? { ok: false, status: 404, contentType: null }
        : { ok: true, status: 200, contentType: "image/jpeg" };
    },
  };
  const landingPageProbe = {
    async fetch() {
      return { available: false, price: null, hasStructuredData: true };
    },
  };
  const p = product("p1", {
    images: [{ externalId: "i", url: "https://cdn.example/dead.jpg", altText: "a" }],
  });
  const result = await runDiagnosticScan({ products: [p], urlProbe, landingPageProbe });
  const codes = result.scored.map((i) => i.code);
  assert.ok(codes.includes("image_unreachable"));
  assert.ok(codes.includes("landing_page_unavailable"));
});

test("runDiagnosticScan: lifecycle resolves a prior issue that is now gone", async () => {
  const result = await runDiagnosticScan({
    products: [product("p1")], // clean now
    prior: [{ fingerprint: "old-fp", status: "open", firstSeenAt: new Date("2026-01-01") }],
  });
  assert.deepEqual(result.lifecycle.resolvedFingerprints, ["old-fp"]);
});
