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
