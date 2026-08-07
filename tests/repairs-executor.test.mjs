/**
 * Connector writeback executor tests (task T094).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  repairExecutions,
  repairExecutionItems,
  REPAIR_EXECUTION_STATUSES,
} from "../packages/database/dist/index.js";
import {
  buildWritebackInstructions,
  executeWriteback,
  resolveExecutionStatus,
  toRepairExecutionRow,
  toRepairExecutionItemRow,
} from "../packages/repairs/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");

const change = (o = {}) => ({
  issueCode: "insecure_link_url",
  productExternalId: "p1",
  variantExternalId: null,
  field: "onlineStoreUrl",
  safetyClass: "automatic",
  riskLevel: "low",
  currentValue: "http://x",
  proposedValue: "https://x",
  requiresInput: false,
  ...o,
});

test("buildWritebackInstructions: only ready computed changes", () => {
  const instructions = buildWritebackInstructions([
    change(),
    change({ productExternalId: "p2", requiresInput: true, proposedValue: null }),
    change({ productExternalId: "p3", proposedValue: null }),
  ]);
  assert.equal(instructions.length, 1);
  assert.equal(instructions[0].productExternalId, "p1");
  assert.equal(instructions[0].before, "http://x");
  assert.equal(instructions[0].after, "https://x");
});

test("resolveExecutionStatus: completed / failed / partial", () => {
  assert.equal(resolveExecutionStatus(3, 0), "completed");
  assert.equal(resolveExecutionStatus(0, 3), "failed");
  assert.equal(resolveExecutionStatus(2, 1), "partially_completed");
});

test("executeWriteback: aggregates partial success; a thrower is a failed item", async () => {
  const instructions = buildWritebackInstructions([
    change({ productExternalId: "ok" }),
    change({ productExternalId: "bad" }),
    change({ productExternalId: "boom" }),
  ]);
  const port = {
    async apply(instruction) {
      if (instruction.productExternalId === "bad") return { ok: false, error: "rejected" };
      if (instruction.productExternalId === "boom") throw new Error("kaboom");
      return { ok: true, error: null };
    },
  };
  const outcome = await executeWriteback(instructions, port);
  assert.equal(outcome.total, 3);
  assert.equal(outcome.succeeded, 1);
  assert.equal(outcome.failed, 2);
  assert.equal(outcome.status, "partially_completed");
  const boom = outcome.items.find((i) => i.instruction.productExternalId === "boom");
  assert.equal(boom.status, "failed");
  assert.equal(boom.error, "kaboom");
});

test("row builders: execution + item inserts", () => {
  const exec = toRepairExecutionRow("org-1", "plan-1", "apply", 5);
  assert.equal(exec.planId, "plan-1");
  assert.equal(exec.kind, "apply");
  assert.equal(exec.status, "queued");
  assert.equal(exec.totalItems, 5);

  const item = toRepairExecutionItemRow("org-1", "exec-1", {
    instruction: {
      productExternalId: "p1",
      variantExternalId: null,
      field: "onlineStoreUrl",
      before: "http://x",
      after: "https://x",
    },
    status: "succeeded",
    error: null,
  });
  assert.equal(item.executionId, "exec-1");
  assert.equal(item.field, "onlineStoreUrl");
  assert.equal(item.beforeValue, "http://x");
  assert.equal(item.afterValue, "https://x");
  assert.equal(item.status, "succeeded");
});

test("schema + migration: repair execution tables and migration 0015", () => {
  assert.ok(REPAIR_EXECUTION_STATUSES.includes("partially_completed"));
  const execCols = new Set(getTableConfig(repairExecutions).columns.map((c) => c.name));
  for (const c of ["plan_id", "kind", "status", "total_items", "succeeded_items", "failed_items"]) {
    assert.ok(execCols.has(c), `repair_executions missing ${c}`);
  }
  const itemCols = new Set(getTableConfig(repairExecutionItems).columns.map((c) => c.name));
  for (const c of [
    "execution_id",
    "product_external_id",
    "field",
    "before_value",
    "after_value",
    "status",
  ]) {
    assert.ok(itemCols.has(c), `repair_execution_items missing ${c}`);
  }
  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0015_t094_repair_executions.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "repair_executions"/);
  assert.match(sql, /CREATE TABLE "repair_execution_items"/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[15].tag, "0015_t094_repair_executions");
});
