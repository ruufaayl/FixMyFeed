/**
 * RBAC permission-evaluation tests (task T013).
 *
 * Imports the built domain package (`tsc -b` emits dist/ before tests run in
 * the check/pre-push/CI flows). Pure Node.js (node:test).
 *
 * Traceability: authorization-matrix.md (Minimum Permission Matrix + role
 * principles) and rbac-model.md (deny-by-default authorization).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluatePermission,
  can,
  PERMISSION_DECISION_CODE,
  PERMISSIONS,
  PERMISSION_MATRIX,
  ROLES,
} from "../packages/domain/dist/index.js";

const TENANT = { tenantScoped: true };
const allow = (roles, permission, context = TENANT) =>
  evaluatePermission({ roles, permission, context });

test("catalog is closed: 22 permissions, 8 roles, matrix covers every permission", () => {
  assert.equal(PERMISSIONS.length, 22);
  assert.equal(ROLES.length, 8);
  for (const p of PERMISSIONS) {
    assert.ok(PERMISSION_MATRIX[p], `matrix missing ${p}`);
  }
});

test("deny by default: unknown permission and missing tenant scope", () => {
  assert.equal(
    allow(["administrator"], "does:notexist").code,
    PERMISSION_DECISION_CODE.UNKNOWN_PERMISSION,
  );
  const noTenant = evaluatePermission({
    roles: ["administrator"],
    permission: "store:read",
    context: { tenantScoped: false },
  });
  assert.equal(noTenant.allowed, false);
  assert.equal(noTenant.code, PERMISSION_DECISION_CODE.TENANT_SCOPE_REQUIRED);
});

test("deny by default: no roles grants nothing", () => {
  for (const p of PERMISSIONS) {
    assert.equal(allow([], p).allowed, false, `empty roles unexpectedly allowed ${p}`);
  }
});

test("graded hierarchy: higher ranks inherit lower-rank permissions", () => {
  assert.ok(can(["viewer"], "store:read", TENANT));
  assert.ok(can(["viewer"], "catalog:read", TENANT));
  assert.ok(!can(["viewer"], "scan:execute", TENANT)); // needs operator+
  assert.ok(can(["operator"], "scan:execute", TENANT));
  assert.ok(can(["operator"], "store:read", TENANT)); // inherits viewer
  assert.ok(!can(["operator"], "store:manage", TENANT)); // needs manager+
  assert.ok(can(["manager"], "store:manage", TENANT));
  assert.ok(can(["administrator"], "catalog:read", TENANT)); // top of the ladder
});

test("writeback:execute requires an approved plan (condition)", () => {
  assert.equal(
    allow(["manager"], "writeback:execute").code,
    PERMISSION_DECISION_CODE.CONDITION_NOT_MET,
  );
  assert.ok(can(["manager"], "writeback:execute", { tenantScoped: true, approvedPlan: true }));
});

test("rollback:execute requires recent authentication (condition)", () => {
  assert.equal(
    allow(["manager"], "rollback:execute").code,
    PERMISSION_DECISION_CODE.CONDITION_NOT_MET,
  );
  assert.ok(
    can(["manager"], "rollback:execute", { tenantScoped: true, recentAuthentication: true }),
  );
});

test("repair:approve-high-risk requires approver+ and enforces proposer separation only when policy requires it", () => {
  // Manager (rank 3) is below approver (rank 4): denied by role.
  assert.equal(
    allow(["manager"], "repair:approve-high-risk").code,
    PERMISSION_DECISION_CODE.INSUFFICIENT_ROLE,
  );
  // Approver, no separation policy in force: allowed.
  assert.ok(can(["approver"], "repair:approve-high-risk", { tenantScoped: true }));
  // Approver, separation required but not satisfied: denied.
  assert.equal(
    allow(["approver"], "repair:approve-high-risk", {
      tenantScoped: true,
      requireProposerSeparation: true,
      proposerSeparationSatisfied: false,
    }).code,
    PERMISSION_DECISION_CODE.CONDITION_NOT_MET,
  );
  // Approver, separation required and satisfied: allowed.
  assert.ok(
    can(["approver"], "repair:approve-high-risk", {
      tenantScoped: true,
      requireProposerSeparation: true,
      proposerSeparationSatisfied: true,
    }),
  );
});

test("separation of duties: security administrator inspects security/audit but not catalog or repairs", () => {
  assert.ok(can(["security_administrator"], "organization:read", TENANT));
  assert.ok(can(["security_administrator"], "audit:read", TENANT));
  assert.ok(!can(["security_administrator"], "catalog:read", TENANT));
  assert.ok(!can(["security_administrator"], "store:read", TENANT));
  assert.ok(!can(["security_administrator"], "repair:propose", TENANT));
});

test("separation of duties: billing administrator manages billing but cannot read product content", () => {
  assert.ok(can(["billing_administrator"], "billing:manage", TENANT));
  assert.ok(!can(["billing_administrator"], "catalog:read", TENANT));
  assert.ok(!can(["billing_administrator"], "store:read", TENANT));
});

test("separation of duties: organization administrators do NOT receive platform access", () => {
  assert.ok(can(["administrator"], "team:manage", TENANT));
  assert.ok(can(["administrator"], "billing:manage", TENANT));
  assert.ok(can(["administrator"], "support-access:grant", TENANT));
  assert.ok(!can(["administrator"], "platform-admin:operate", TENANT));
  // And the platform operator is not an organization role.
  assert.ok(can(["platform_operator"], "platform-admin:operate", TENANT));
  assert.ok(!can(["platform_operator"], "organization:read", TENANT));
  assert.ok(!can(["platform_operator"], "store:read", TENANT));
});

test("multiple roles are additive (union of grants)", () => {
  // A user who is both a viewer and a billing administrator can do both.
  assert.ok(can(["viewer", "billing_administrator"], "catalog:read", TENANT));
  assert.ok(can(["viewer", "billing_administrator"], "billing:manage", TENANT));
});
