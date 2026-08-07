/**
 * Approval, four-eyes policy, and plan lifecycle (task T093).
 *
 * The governance layer over a repair plan (T091). The plan-status lifecycle is an
 * explicit transition graph; approval is deterministic four-eyes — the proposer
 * can never approve their own plan, high-risk plans need two distinct approvers,
 * and any single rejection blocks the plan. Pure; approval records are inputs
 * (persisted/audited by the caller). Complements the RBAC proposer-separation
 * condition (T013). Row builders map to the T093 `repair_plans` / `repair_approvals`
 * tables.
 */
import type {
  NewRepairApprovalRow,
  NewRepairPlanRow,
  RepairApprovalDecision,
  RepairPlanStatus,
} from "@fixmyfeed/database";
import type { RepairPlan } from "./plan.js";
import type { RiskLevel } from "./registry.js";

// ── Plan lifecycle ───────────────────────────────────────────────────────────

/** Allowed status transitions for a repair plan. */
export const REPAIR_PLAN_TRANSITIONS: Readonly<
  Record<RepairPlanStatus, readonly RepairPlanStatus[]>
> = {
  draft: ["pending_approval", "rejected"],
  pending_approval: ["approved", "rejected"],
  approved: ["executing", "rejected"],
  executing: ["completed", "partially_completed", "failed"],
  completed: ["rolled_back"],
  partially_completed: ["rolled_back", "executing"],
  failed: ["executing"],
  rejected: [],
  rolled_back: [],
};

export function isTerminalPlanStatus(status: RepairPlanStatus): boolean {
  return REPAIR_PLAN_TRANSITIONS[status].length === 0;
}

export function canTransitionPlan(from: RepairPlanStatus, to: RepairPlanStatus): boolean {
  return REPAIR_PLAN_TRANSITIONS[from].includes(to);
}

const RISK_RANK: Readonly<Record<RiskLevel, number>> = { low: 0, medium: 1, high: 2 };

/** The highest risk level across a plan's changes (defaults to `low` when empty). */
export function planRiskLevel(plan: RepairPlan): RiskLevel {
  let max: RiskLevel = "low";
  for (const change of plan.changes) {
    if (RISK_RANK[change.riskLevel] > RISK_RANK[max]) max = change.riskLevel;
  }
  return max;
}

// ── Four-eyes approval policy ────────────────────────────────────────────────

export interface ApprovalRecord {
  readonly approverId: string;
  readonly decision: RepairApprovalDecision;
}

export interface ApprovalPolicy {
  /** When true, the proposer's own approval never counts. */
  readonly requireFourEyes: boolean;
  readonly approvalsRequiredDefault: number;
  readonly approvalsRequiredHighRisk: number;
}

export const DEFAULT_APPROVAL_POLICY: ApprovalPolicy = {
  requireFourEyes: true,
  approvalsRequiredDefault: 1,
  approvalsRequiredHighRisk: 2,
};

export interface ApprovalEvaluation {
  readonly authorized: boolean;
  readonly requiredApprovals: number;
  /** Distinct approvers whose approval counts (proposer excluded under four-eyes). */
  readonly countedApprovers: number;
  /** Machine-readable reasons the plan is not (yet) authorized. */
  readonly reasons: readonly string[];
}

export interface ApprovalContext {
  readonly proposerId: string;
  readonly riskLevel: RiskLevel;
  readonly approvals: readonly ApprovalRecord[];
  readonly policy?: ApprovalPolicy;
}

/**
 * Evaluates whether a plan is authorized to execute. A single rejection blocks it;
 * otherwise it needs `requiredApprovals` distinct approvers (the proposer excluded
 * under four-eyes). Deterministic.
 */
export function evaluateApproval(context: ApprovalContext): ApprovalEvaluation {
  const policy = context.policy ?? DEFAULT_APPROVAL_POLICY;
  const requiredApprovals =
    context.riskLevel === "high"
      ? policy.approvalsRequiredHighRisk
      : policy.approvalsRequiredDefault;
  const reasons: string[] = [];

  const rejected = context.approvals.some((a) => a.decision === "rejected");
  if (rejected) reasons.push("rejection_present");

  const approvers = new Set<string>();
  let proposerSelfApproved = false;
  for (const approval of context.approvals) {
    if (approval.decision !== "approved") continue;
    if (policy.requireFourEyes && approval.approverId === context.proposerId) {
      proposerSelfApproved = true;
      continue;
    }
    approvers.add(approval.approverId);
  }
  if (proposerSelfApproved) reasons.push("proposer_self_approval_ignored");

  const countedApprovers = approvers.size;
  if (countedApprovers < requiredApprovals) reasons.push("insufficient_approvals");

  const authorized = !rejected && countedApprovers >= requiredApprovals;
  return { authorized, requiredApprovals, countedApprovers, reasons };
}

/** Convenience: evaluate approval for a whole plan, deriving its risk level. */
export function evaluatePlanApproval(
  plan: RepairPlan,
  proposerId: string,
  approvals: readonly ApprovalRecord[],
  policy?: ApprovalPolicy,
): ApprovalEvaluation {
  return evaluateApproval({ proposerId, riskLevel: planRiskLevel(plan), approvals, policy });
}

/**
 * The target plan status implied by an approval evaluation: `rejected` when a
 * rejection is present, `approved` when authorized, else `pending_approval`.
 */
export function resolvePlanApprovalStatus(evaluation: ApprovalEvaluation): RepairPlanStatus {
  if (evaluation.reasons.includes("rejection_present")) return "rejected";
  return evaluation.authorized ? "approved" : "pending_approval";
}

// ── Row builders ─────────────────────────────────────────────────────────────

/** Builds a `repair_plans` insert row (status `draft`) from a generated plan. */
export function toRepairPlanRow(
  organizationId: string,
  catalogId: string,
  plan: RepairPlan,
  options: { proposerId: string; baselineFingerprints?: Readonly<Record<string, string>> },
): NewRepairPlanRow {
  return {
    organizationId,
    catalogId,
    status: "draft",
    changeSet: plan.changes as unknown as NewRepairPlanRow["changeSet"],
    proposerId: options.proposerId,
    riskLevel: planRiskLevel(plan),
    baselineFingerprints: (options.baselineFingerprints ??
      {}) as unknown as NewRepairPlanRow["baselineFingerprints"],
  };
}

/** Builds a `repair_approvals` insert row. */
export function toRepairApprovalRow(
  organizationId: string,
  planId: string,
  approverId: string,
  decision: RepairApprovalDecision,
  note: string | null = null,
): NewRepairApprovalRow {
  return { organizationId, planId, approverId, decision, note };
}
