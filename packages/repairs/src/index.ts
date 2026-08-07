/**
 * @fixmyfeed/repairs
 *
 * The repair engine (E09): remediation registry + safety classes (T090), repair
 * option selection and plan generation (T091), change-set preview and conflict
 * detection (T092), approval and four-eyes policy (T093), connector writeback
 * execution (T094), verification and partial-success handling (T095), rollback
 * planning and execution (T096), and rule builder + simulation (T097).
 *
 * Deterministic and deny-by-default: no repair is auto-applied without an
 * eligible safety class AND explicit approval; consent is never inferred.
 */
export const workspaceName = "@fixmyfeed/repairs" as const;
export const workspaceKind = "package" as const;

// T090 remediation registry + safety classes.
export {
  SAFETY_CLASSES,
  RISK_LEVELS,
  BUILTIN_REMEDIATIONS,
  RemediationRegistry,
  canAutoApply,
  defaultRemediationRegistry,
} from "./registry.js";
export type { SafetyClass, RiskLevel, Remediation } from "./registry.js";

// T091 repair option selection + plan generation.
export { generateRepairPlan, selectAutoApplicableChanges } from "./plan.js";
export type { RepairChange, RepairPlan, RepairPlanInput } from "./plan.js";

// T092 change-set preview + conflict detection.
export { PREVIEW_STATUSES, buildChangeSetPreview, readyChanges } from "./preview.js";
export type {
  PreviewStatus,
  PreviewEntry,
  ChangeSetPreview,
  ChangeSetPreviewInput,
} from "./preview.js";

// T093 approval, four-eyes policy, and plan lifecycle.
export {
  REPAIR_PLAN_TRANSITIONS,
  DEFAULT_APPROVAL_POLICY,
  isTerminalPlanStatus,
  canTransitionPlan,
  planRiskLevel,
  evaluateApproval,
  evaluatePlanApproval,
  resolvePlanApprovalStatus,
  toRepairPlanRow,
  toRepairApprovalRow,
} from "./approval.js";
export type {
  ApprovalRecord,
  ApprovalPolicy,
  ApprovalEvaluation,
  ApprovalContext,
} from "./approval.js";

// T094 connector writeback executor.
export {
  buildWritebackInstructions,
  executeWriteback,
  resolveExecutionStatus,
  toRepairExecutionRow,
  toRepairExecutionItemRow,
} from "./executor.js";
export type {
  WritebackInstruction,
  WritebackResult,
  WritebackPort,
  ExecutionItemOutcome,
  ExecutionOutcome,
} from "./executor.js";

// T095 verification + partial-success handling.
export { verifyExecution, isFullyVerified, unresolvedItems } from "./verification.js";
export type { ObserveValue, VerifiedItem, VerificationOutcome } from "./verification.js";

// T096 rollback planning + execution.
export {
  buildRollbackInstructions,
  reversibleItems,
  executeRollback,
  toRollbackExecutionRow,
} from "./rollback.js";
export type { RollbackSource } from "./rollback.js";
