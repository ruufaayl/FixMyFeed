/**
 * @fixmyfeed/domain
 *
 * Framework-free domain model: entities, value objects, and pure business invariants. Imports no framework, database-driver, HTTP, or provider SDK code.
 *
 * Boundary established by task T000 (see /boundaries.json and
 * docs/04-system-architecture/monorepo-architecture.md). Implementation is added
 * by later tasks; this module is intentionally inert.
 */
export const workspaceName = "@fixmyfeed/domain" as const;
export const workspaceKind = "package" as const;

// RBAC role/permission model and evaluation (task T013).
export {
  ROLES,
  ROLE_RANK,
  PERMISSIONS,
  PERMISSION_MATRIX,
  PERMISSION_SET,
  isRole,
  isPermission,
} from "./rbac/roles.js";
export type { Role, Permission, PermissionCondition, PermissionRequirement } from "./rbac/roles.js";
export { evaluatePermission, can, PERMISSION_DECISION_CODE } from "./rbac/evaluate.js";
export type {
  PermissionRequest,
  PermissionDecision,
  PermissionDecisionCode,
  PermissionContext,
} from "./rbac/evaluate.js";

// Canonical normalized catalog shape (Epic E07).
export { CATALOG_PRODUCT_STATUSES } from "./catalog.js";
export type {
  CatalogProduct,
  CatalogVariant,
  CatalogImage,
  CatalogProductStatus,
} from "./catalog.js";
