/**
 * Rollback planning + execution tests (task T096).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRollbackInstructions,
  reversibleItems,
  executeRollback,
  toRollbackExecutionRow,
} from "../packages/repairs/dist/index.js";

const item = (o = {}) => ({
  productExternalId: "p1",
  variantExternalId: null,
  field: "onlineStoreUrl",
  afterValue: "https://x",
  beforeValue: "http://x",
  status: "verified",
  ...o,
});

test("buildRollbackInstructions: inverts verified items with a known prior value", () => {
  const instructions = buildRollbackInstructions([
    item({ productExternalId: "a" }),
    item({ productExternalId: "notapplied", status: "failed" }),
    item({ productExternalId: "noprior", beforeValue: null }),
  ]);
  assert.equal(instructions.length, 1);
  assert.equal(instructions[0].productExternalId, "a");
  // restore the original value
  assert.equal(instructions[0].after, "http://x");
  assert.equal(instructions[0].before, "https://x");
});

test("reversibleItems: only verified with a prior value", () => {
  const rev = reversibleItems([
    item({ productExternalId: "a" }),
    item({ productExternalId: "b", status: "failed" }),
    item({ productExternalId: "c", beforeValue: null }),
  ]);
  assert.deepEqual(
    rev.map((i) => i.productExternalId),
    ["a"],
  );
});

test("executeRollback: restores prior values through the port", async () => {
  const applied = [];
  const port = {
    async apply(instruction) {
      applied.push(instruction.after);
      return { ok: true, error: null };
    },
  };
  const instructions = buildRollbackInstructions([
    item(),
    item({ productExternalId: "b", beforeValue: "http://b", afterValue: "https://b" }),
  ]);
  const outcome = await executeRollback(instructions, port);
  assert.equal(outcome.status, "completed");
  assert.equal(outcome.succeeded, 2);
  assert.deepEqual(applied.sort(), ["http://b", "http://x"]);
});

test("toRollbackExecutionRow: kind rollback", () => {
  const row = toRollbackExecutionRow("org-1", "plan-1", 3);
  assert.equal(row.kind, "rollback");
  assert.equal(row.planId, "plan-1");
  assert.equal(row.totalItems, 3);
});
