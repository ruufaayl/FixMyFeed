/**
 * Verification + partial-success tests (task T095).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verifyExecution,
  isFullyVerified,
  unresolvedItems,
} from "../packages/repairs/dist/index.js";

const instruction = (id, after) => ({
  productExternalId: id,
  variantExternalId: null,
  field: "onlineStoreUrl",
  before: "http://x",
  after,
});
const outcome = (items) => ({
  items,
  total: items.length,
  succeeded: items.filter((i) => i.status === "succeeded").length,
  failed: items.filter((i) => i.status === "failed").length,
  status: "completed",
});

test("verifyExecution: verified when observed matches the written value", () => {
  const result = verifyExecution(
    outcome([
      { instruction: instruction("a", "https://a"), status: "succeeded", error: null },
      { instruction: instruction("b", "https://b"), status: "succeeded", error: null },
    ]),
    (i) => i.after, // everything observed as written
  );
  assert.equal(result.verified, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.status, "completed");
  assert.equal(isFullyVerified(result), true);
});

test("verifyExecution: unstuck writes and write failures downgrade to failed (partial)", () => {
  const result = verifyExecution(
    outcome([
      { instruction: instruction("ok", "https://ok"), status: "succeeded", error: null },
      { instruction: instruction("unstuck", "https://want"), status: "succeeded", error: null },
      { instruction: instruction("wf", "https://wf"), status: "failed", error: "rejected" },
    ]),
    (i) => (i.productExternalId === "unstuck" ? "http://still-old" : i.after),
  );
  assert.equal(result.verified, 1);
  assert.equal(result.failed, 2);
  assert.equal(result.status, "partially_completed");
  assert.equal(isFullyVerified(result), false);

  const unresolved = unresolvedItems(result)
    .map((i) => i.instruction.productExternalId)
    .sort();
  assert.deepEqual(unresolved, ["unstuck", "wf"]);
  const unstuck = result.items.find((i) => i.instruction.productExternalId === "unstuck");
  assert.equal(unstuck.status, "failed");
  assert.equal(unstuck.error, "not_verified");
  assert.equal(unstuck.observed, "http://still-old");
});

test("verifyExecution: nothing verified -> failed", () => {
  const result = verifyExecution(
    outcome([{ instruction: instruction("a", "https://a"), status: "failed", error: "x" }]),
    (i) => i.after,
  );
  assert.equal(result.status, "failed");
});
