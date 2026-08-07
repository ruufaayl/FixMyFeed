/**
 * Validator registry + execution framework tests (task T080).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ISSUE_SEVERITIES,
  issue,
  productValidator,
  ValidatorRegistry,
  runValidators,
} from "../packages/diagnostics/dist/index.js";

const product = (externalId) => ({
  externalId,
  handle: null,
  title: externalId === "bad" ? "" : "P",
  description: null,
  productType: null,
  vendor: null,
  status: "active",
  tags: [],
  onlineStoreUrl: null,
  images: [],
  variants: [],
});

test("issue: fills null defaults, keeps evidence only when given", () => {
  const a = issue("missing_title", "error", "Title is empty");
  assert.equal(a.productExternalId, null);
  assert.equal(a.variantExternalId, null);
  assert.equal(a.field, null);
  assert.equal("evidence" in a, false);

  const b = issue("x", "warning", "m", {
    productExternalId: "p1",
    field: "title",
    evidence: { value: "" },
  });
  assert.equal(b.productExternalId, "p1");
  assert.equal(b.field, "title");
  assert.deepEqual(b.evidence, { value: "" });
});

test("ISSUE_SEVERITIES: ordered critical..info", () => {
  assert.deepEqual(ISSUE_SEVERITIES, ["critical", "error", "warning", "info"]);
});

test("ValidatorRegistry: register, dedupe by id, ordered list", () => {
  const reg = new ValidatorRegistry();
  const v1 = productValidator("v1", "One", () => []);
  const v2 = productValidator("v2", "Two", () => []);
  reg.registerAll([v1, v2]);
  assert.equal(reg.size, 2);
  assert.equal(reg.has("v1"), true);
  assert.equal(reg.get("v2").title, "Two");
  assert.deepEqual(
    reg.list().map((v) => v.id),
    ["v1", "v2"],
  );
  assert.throws(() => reg.register(v1), /already registered/);
});

test("productValidator: flattens per-product issues in order", () => {
  const titleCheck = productValidator("title", "Title", (p) =>
    p.title.trim() === ""
      ? [
          issue("missing_title", "error", "empty", {
            productExternalId: p.externalId,
            field: "title",
          }),
        ]
      : [],
  );
  const found = titleCheck.run({ products: [product("a"), product("bad"), product("c")] });
  assert.equal(found.length, 1);
  assert.equal(found[0].productExternalId, "bad");
});

test("runValidators: aggregates issues, isolates a thrower into failed", () => {
  const good = productValidator("good", "Good", (p) => [
    issue("ok", "info", "ok", { productExternalId: p.externalId }),
  ]);
  const boom = {
    id: "boom",
    title: "Boom",
    run() {
      throw new Error("kaboom");
    },
  };
  const also = productValidator("also", "Also", () => [issue("ok2", "info", "ok2")]);

  const result = runValidators([good, boom, also], { products: [product("a")] });
  assert.equal(result.issues.length, 2); // good(1) + also(1); boom contributes none
  assert.deepEqual(result.failed, ["boom"]);
  const boomRun = result.runs.find((r) => r.validatorId === "boom");
  assert.equal(boomRun.error, "kaboom");
  assert.equal(boomRun.issues.length, 0);
  // order preserved: good ran before also
  assert.deepEqual(
    result.runs.map((r) => r.validatorId),
    ["good", "boom", "also"],
  );
});
