/**
 * Remediation registry + safety class tests (task T090).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SAFETY_CLASSES,
  RemediationRegistry,
  canAutoApply,
  defaultRemediationRegistry,
  BUILTIN_REMEDIATIONS,
} from "../packages/repairs/dist/index.js";

test("SAFETY_CLASSES: automatic..blocked", () => {
  assert.deepEqual(SAFETY_CLASSES, ["automatic", "assisted", "manual", "blocked"]);
});

test("canAutoApply: only automatic + non-high risk", () => {
  assert.equal(canAutoApply({ safetyClass: "automatic", riskLevel: "low" }), true);
  assert.equal(canAutoApply({ safetyClass: "automatic", riskLevel: "high" }), false);
  assert.equal(canAutoApply({ safetyClass: "assisted", riskLevel: "low" }), false);
  assert.equal(canAutoApply({ safetyClass: "manual", riskLevel: "low" }), false);
});

test("RemediationRegistry: register, dedupe, deny-by-default manual", () => {
  const reg = new RemediationRegistry();
  const r = {
    issueCode: "x",
    title: "X",
    safetyClass: "automatic",
    riskLevel: "low",
    targetField: "title",
    variantScoped: false,
    description: "d",
  };
  reg.register(r);
  assert.equal(reg.has("x"), true);
  assert.equal(reg.get("x").title, "X");
  assert.throws(() => reg.register(r), /already registered/);
  // unknown code defaults to manual
  assert.equal(reg.safetyClassFor("unknown_code"), "manual");
  assert.equal(reg.get("unknown_code"), undefined);
});

test("defaultRemediationRegistry: built-ins loaded; http-upgrade is auto-appliable", () => {
  const reg = defaultRemediationRegistry();
  assert.equal(reg.size, BUILTIN_REMEDIATIONS.length);
  assert.equal(reg.safetyClassFor("insecure_image_url"), "automatic");
  assert.ok(canAutoApply(reg.get("insecure_image_url")));
  // missing_title cannot be auto-fixed (manual, high risk)
  assert.equal(reg.safetyClassFor("missing_title"), "manual");
  assert.equal(canAutoApply(reg.get("missing_title")), false);
  // invalid_gtin never auto-applied
  assert.equal(canAutoApply(reg.get("invalid_gtin")), false);
});
