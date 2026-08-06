/**
 * RBAC role and permission catalog (task T013).
 *
 * A closed, deterministic model of the roles, permission verbs, and the
 * minimum-permission matrix from
 * docs/06-security-privacy-and-compliance/authorization-matrix.md and
 * rbac-model.md. Pure data — no framework, database, HTTP, or provider code —
 * so it lives in the domain layer and is importable everywhere without pulling
 * infrastructure dependencies. Deny by default (authorization-matrix FR).
 *
 * No permission verb or role outside this catalog may be introduced without a
 * documentation change (AGENTS.md AC-002).
 */

/** All roles. The first five form a graded hierarchy; the last three are specialized. */
export const ROLES = [
  "viewer",
  "operator",
  "manager",
  "approver",
  "administrator",
  "security_administrator",
  "billing_administrator",
  "platform_operator",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Graded rank for the general track (viewer < operator < manager < approver <
 * administrator). Specialized roles carry no rank and receive only their
 * explicit grants — so, e.g., a security administrator does not inherit
 * catalog access.
 */
export const ROLE_RANK: Readonly<Partial<Record<Role, number>>> = Object.freeze({
  viewer: 1,
  operator: 2,
  manager: 3,
  approver: 4,
  administrator: 5,
});

/** Explicit resource:action permission verbs. */
export const PERMISSIONS = [
  "organization:read",
  "workspace:manage",
  "store:read",
  "store:manage",
  "connection:manage",
  "catalog:read",
  "scan:execute",
  "issue:acknowledge",
  "issue:suppress",
  "repair:propose",
  "repair:approve-low-risk",
  "repair:approve-high-risk",
  "writeback:execute",
  "rollback:execute",
  "rule:manage",
  "monitor:manage",
  "report:export",
  "audit:read",
  "billing:manage",
  "team:manage",
  "support-access:grant",
  "platform-admin:operate",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Runtime conditions some permissions require in addition to a sufficient role. */
export type PermissionCondition = "approved_plan" | "recent_authentication" | "proposer_separation";

export interface PermissionRequirement {
  /** Minimum graded rank; any role at or above this rank satisfies it. */
  readonly minRank?: number;
  /** Explicit roles that satisfy this permission regardless of rank. */
  readonly roles?: readonly Role[];
  /** Additional runtime conditions that must also hold. */
  readonly conditions?: readonly PermissionCondition[];
}

/**
 * The minimum-permission matrix. Every entry is deny-by-default: a principal is
 * granted the permission only if it satisfies `minRank` OR holds one of `roles`,
 * AND all `conditions` are met. Mirrors authorization-matrix.md exactly.
 */
export const PERMISSION_MATRIX: Readonly<Record<Permission, PermissionRequirement>> = Object.freeze(
  {
    "organization:read": { roles: ["administrator", "security_administrator"] },
    "workspace:manage": { roles: ["administrator"] },
    "store:read": { minRank: 1 },
    "store:manage": { minRank: 3 },
    "connection:manage": { roles: ["administrator"] },
    "catalog:read": { minRank: 1 },
    "scan:execute": { minRank: 2 },
    "issue:acknowledge": { minRank: 2 },
    "issue:suppress": { minRank: 3 },
    "repair:propose": { minRank: 2 },
    "repair:approve-low-risk": { minRank: 3 },
    "repair:approve-high-risk": { minRank: 4, conditions: ["proposer_separation"] },
    "writeback:execute": { minRank: 3, conditions: ["approved_plan"] },
    "rollback:execute": { minRank: 3, conditions: ["recent_authentication"] },
    "rule:manage": { minRank: 3 },
    "monitor:manage": { minRank: 3 },
    "report:export": { minRank: 2 },
    "audit:read": { roles: ["administrator", "security_administrator"] },
    "billing:manage": { roles: ["billing_administrator", "administrator"] },
    "team:manage": { roles: ["administrator"] },
    "support-access:grant": { roles: ["administrator"] },
    "platform-admin:operate": { roles: ["platform_operator"] },
  },
);

export const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSIONS);

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value);
}
