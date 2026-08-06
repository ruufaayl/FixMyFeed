/**
 * Deterministic permission evaluation (task T013).
 *
 * Pure function: given the roles already resolved for a principal within a
 * tenant, a permission verb, and a context, return an allow/deny decision with
 * a stable machine-readable code. It does NOT read the database — role
 * resolution (membership lookup) is the caller's responsibility (organizations
 * and memberships are owned by T012), which keeps authorization logic pure,
 * side-effect-free, and trivially testable.
 *
 * Deny by default: unknown permissions, missing tenant scope, insufficient
 * role, and unmet conditions all deny.
 */
import {
  PERMISSION_MATRIX,
  ROLE_RANK,
  type Permission,
  type PermissionCondition,
  type PermissionRequirement,
  type Role,
} from "./roles.js";

export const PERMISSION_DECISION_CODE = {
  ALLOWED: "RBAC_ALLOWED",
  UNKNOWN_PERMISSION: "RBAC_UNKNOWN_PERMISSION",
  TENANT_SCOPE_REQUIRED: "RBAC_TENANT_SCOPE_REQUIRED",
  INSUFFICIENT_ROLE: "RBAC_INSUFFICIENT_ROLE",
  CONDITION_NOT_MET: "RBAC_CONDITION_NOT_MET",
} as const;

export type PermissionDecisionCode =
  (typeof PERMISSION_DECISION_CODE)[keyof typeof PERMISSION_DECISION_CODE];

export interface PermissionContext {
  /** Tenant scope must be established; every matrix row requires it. */
  readonly tenantScoped: boolean;
  /** Whether an approved change-set plan exists (writeback:execute). */
  readonly approvedPlan?: boolean;
  /** Whether the principal recently re-authenticated (rollback:execute). */
  readonly recentAuthentication?: boolean;
  /** Whether policy requires proposer/approver separation for this action. */
  readonly requireProposerSeparation?: boolean;
  /** Whether proposer/approver separation is satisfied (approver != proposer). */
  readonly proposerSeparationSatisfied?: boolean;
}

export interface PermissionRequest {
  readonly roles: readonly Role[];
  readonly permission: string;
  readonly context: PermissionContext;
}

export interface PermissionDecision {
  readonly allowed: boolean;
  readonly code: PermissionDecisionCode;
  readonly reason: string;
}

const deny = (code: PermissionDecisionCode, reason: string): PermissionDecision => ({
  allowed: false,
  code,
  reason,
});

function roleSatisfies(roles: readonly Role[], requirement: PermissionRequirement): boolean {
  const byRank =
    requirement.minRank !== undefined &&
    roles.some((role) => (ROLE_RANK[role] ?? 0) >= requirement.minRank!);
  const byRole = requirement.roles?.some((allowed) => roles.includes(allowed)) ?? false;
  return byRank || byRole;
}

function conditionUnmet(
  condition: PermissionCondition,
  context: PermissionContext,
): string | undefined {
  switch (condition) {
    case "approved_plan":
      return context.approvedPlan === true ? undefined : "an approved plan is required";
    case "recent_authentication":
      return context.recentAuthentication === true
        ? undefined
        : "recent re-authentication is required";
    case "proposer_separation":
      // Only enforced when policy requires it (authorization-matrix: "when policy requires").
      if (!context.requireProposerSeparation) return undefined;
      return context.proposerSeparationSatisfied === true
        ? undefined
        : "proposer and approver must be different principals";
    default:
      return undefined;
  }
}

/**
 * Evaluates whether the principal's roles grant the permission in context.
 * Never throws; always returns a decision.
 */
export function evaluatePermission(request: PermissionRequest): PermissionDecision {
  const requirement = (PERMISSION_MATRIX as Record<string, PermissionRequirement | undefined>)[
    request.permission
  ];
  if (requirement === undefined) {
    return deny(
      PERMISSION_DECISION_CODE.UNKNOWN_PERMISSION,
      `unknown permission "${request.permission}"`,
    );
  }

  if (request.context.tenantScoped !== true) {
    return deny(PERMISSION_DECISION_CODE.TENANT_SCOPE_REQUIRED, "tenant scope is required");
  }

  if (!roleSatisfies(request.roles, requirement)) {
    return deny(
      PERMISSION_DECISION_CODE.INSUFFICIENT_ROLE,
      `roles [${request.roles.join(", ") || "none"}] do not satisfy ${request.permission}`,
    );
  }

  for (const condition of requirement.conditions ?? []) {
    const unmet = conditionUnmet(condition, request.context);
    if (unmet !== undefined) {
      return deny(PERMISSION_DECISION_CODE.CONDITION_NOT_MET, unmet);
    }
  }

  return { allowed: true, code: PERMISSION_DECISION_CODE.ALLOWED, reason: "granted" };
}

/** Convenience boolean wrapper around {@link evaluatePermission}. */
export function can(
  roles: readonly Role[],
  permission: Permission,
  context: PermissionContext,
): boolean {
  return evaluatePermission({ roles, permission, context }).allowed;
}
