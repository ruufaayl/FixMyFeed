/**
 * Approval, four-eyes, and plan lifecycle tests (task T093).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  repairPlans,
  repairApprovals,
  REPAIR_PLAN_STATUSES,
} from "../packages/database/dist/index.js";
import {
  canTransitionPlan,
  isTerminalPlanStatus,
  planRiskLevel,
  evaluateApproval,
  resolvePlanApprovalStatus,
  toRepairPlanRow,
  toRepairApprovalRow,
} from "../packages/repairs/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");

const change = (o = {}) => ({
  issueCode: "x",
  productExternalId: "p1",
  variantExternalId: null,
  field: "title",
  safetyClass: "manual",
  riskLevel: "low",
  currentValue: null,
  proposedValue: "v",
  requiresInput: false,
  ...o,
});
const plan = (changes) => ({
  changes,
  summary: { total: changes.length, automatic: 0, assisted: 0, manual: 0, requiresInput: 0 },
});

test("plan lifecycle: transitions + terminals", () => {
  assert.ok(canTransitionPlan("draft", "pending_approval"));
  assert.ok(canTransitionPlan("pending_approval", "approved"));
  assert.ok(canTransitionPlan("approved", "executing"));
  assert.ok(!canTransitionPlan("draft", "completed"));
  assert.ok(isTerminalPlanStatus("rejected"));
  assert.ok(isTerminalPlanStatus("rolled_back"));
  assert.ok(!isTerminalPlanStatus("executing"));
});

test("planRiskLevel: max over changes", () => {
  assert.equal(
    planRiskLevel(plan([change({ riskLevel: "low" }), change({ riskLevel: "high" })])),
    "high",
  );
  assert.equal(planRiskLevel(plan([change({ riskLevel: "low" })])), "low");
});

test("evaluateApproval: four-eyes, proposer excluded, high-risk needs two", () => {
  // proposer's own approval never counts
  const selfOnly = evaluateApproval({
    proposerId: "u1",
    riskLevel: "low",
    approvals: [{ approverId: "u1", decision: "approved" }],
  });
  assert.equal(selfOnly.authorized, false);
  assert.ok(selfOnly.reasons.includes("proposer_self_approval_ignored"));

  // one distinct approver authorizes a low-risk plan
  const oneApprover = evaluateApproval({
    proposerId: "u1",
    riskLevel: "low",
    approvals: [{ approverId: "u2", decision: "approved" }],
  });
  assert.equal(oneApprover.authorized, true);

  // high-risk needs two distinct approvers
  const highOne = evaluateApproval({
    proposerId: "u1",
    riskLevel: "high",
    approvals: [{ approverId: "u2", decision: "approved" }],
  });
  assert.equal(highOne.authorized, false);
  assert.equal(highOne.requiredApprovals, 2);
  const highTwo = evaluateApproval({
    proposerId: "u1",
    riskLevel: "high",
    approvals: [
      { approverId: "u2", decision: "approved" },
      { approverId: "u3", decision: "approved" },
    ],
  });
  assert.equal(highTwo.authorized, true);

  // any rejection blocks
  const rejected = evaluateApproval({
    proposerId: "u1",
    riskLevel: "low",
    approvals: [
      { approverId: "u2", decision: "approved" },
      { approverId: "u3", decision: "rejected" },
    ],
  });
  assert.equal(rejected.authorized, false);
  assert.equal(resolvePlanApprovalStatus(rejected), "rejected");
  assert.equal(resolvePlanApprovalStatus(oneApprover), "approved");
  assert.equal(resolvePlanApprovalStatus(highOne), "pending_approval");
});

test("row builders: repair_plans + repair_approvals inserts", () => {
  const row = toRepairPlanRow("org-1", "cat-1", plan([change({ riskLevel: "high" })]), {
    proposerId: "u1",
    baselineFingerprints: { p1: "fp" },
  });
  assert.equal(row.organizationId, "org-1");
  assert.equal(row.catalogId, "cat-1");
  assert.equal(row.status, "draft");
  assert.equal(row.riskLevel, "high");
  assert.equal(row.proposerId, "u1");
  assert.deepEqual(row.baselineFingerprints, { p1: "fp" });

  const approval = toRepairApprovalRow("org-1", "plan-1", "u2", "approved", "looks good");
  assert.equal(approval.planId, "plan-1");
  assert.equal(approval.decision, "approved");
  assert.equal(approval.note, "looks good");
});

test("schema + migration: repair tables and migration 0014", () => {
  assert.equal(REPAIR_PLAN_STATUSES.length, 9);
  const planCols = new Set(getTableConfig(repairPlans).columns.map((c) => c.name));
  for (const c of ["catalog_id", "status", "change_set", "proposer_id", "risk_level"]) {
    assert.ok(planCols.has(c), `repair_plans missing ${c}`);
  }
  const apprCols = new Set(getTableConfig(repairApprovals).columns.map((c) => c.name));
  for (const c of ["plan_id", "approver_id", "decision"]) {
    assert.ok(apprCols.has(c), `repair_approvals missing ${c}`);
  }
  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0014_t093_repair_plans.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "repair_plans"/);
  assert.match(sql, /CREATE TABLE "repair_approvals"/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[14].tag, "0014_t093_repair_plans");
});
