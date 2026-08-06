/**
 * Organization, workspace, and membership tests (task T012).
 *
 * Traceability: organization-and-workspace-domain.md,
 * tenant-isolation-model.md, ADR-013, organizations.md, workspaces.md,
 * memberships.md, F005, and F006.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const database = await import("../packages/database/dist/index.js");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");

const tableName = (table) => table?.[Symbol.for("drizzle:Name")];
const tableColumns = (table) => table?.[Symbol.for("drizzle:Columns")];

test("schema: memberships use the canonical T013 role identifiers", () => {
  assert.deepEqual(database.MEMBERSHIP_ROLE, [
    "viewer",
    "operator",
    "manager",
    "approver",
    "administrator",
    "security_administrator",
    "billing_administrator",
    "platform_operator",
  ]);
});

test("schema: tenancy tables expose the documented physical columns", () => {
  assert.equal(tableName(database.organizations), "organizations");
  assert.equal(tableName(database.workspaces), "workspaces");
  assert.equal(tableName(database.memberships), "memberships");

  assert.deepEqual(Object.keys(tableColumns(database.organizations) ?? {}), [
    "id",
    "name",
    "slug",
    "status",
    "idempotencyKey",
    "createdByUserId",
    "createdAt",
    "updatedAt",
    "version",
    "deletedAt",
  ]);
  assert.deepEqual(Object.keys(tableColumns(database.workspaces) ?? {}), [
    "id",
    "organizationId",
    "name",
    "slug",
    "status",
    "idempotencyKey",
    "createdByUserId",
    "createdAt",
    "updatedAt",
    "version",
    "deletedAt",
  ]);
  assert.deepEqual(Object.keys(tableColumns(database.memberships) ?? {}), [
    "id",
    "organizationId",
    "workspaceId",
    "userId",
    "role",
    "status",
    "idempotencyKey",
    "createdByUserId",
    "createdAt",
    "updatedAt",
    "version",
    "deletedAt",
  ]);
});

test("schema: tenancy identities and optimistic versions have safe defaults", () => {
  for (const table of [database.organizations, database.workspaces, database.memberships]) {
    assert.ok(table, "tenancy table export must exist");
    assert.equal(table.id.hasDefault, true);
    assert.equal(database.isUuidV7(table.id.defaultFn()), true);
    assert.equal(table.version.default, 1);
    assert.equal(table.version.notNull, true);
  }

  assert.equal(database.workspaces.organizationId.notNull, true);
  assert.equal(database.memberships.organizationId.notNull, true);
  assert.equal(database.memberships.workspaceId.notNull, false);
});

test("schema: lifecycle catalogs are closed and schema aggregation is complete", () => {
  assert.deepEqual(database.ORGANIZATION_STATUS, ["active", "archived"]);
  assert.deepEqual(database.WORKSPACE_STATUS, ["active", "archived"]);
  assert.deepEqual(database.MEMBERSHIP_STATUS, ["active", "suspended", "revoked"]);
  assert.deepEqual(Object.keys(database.schema).sort(), [
    "authenticationVerifications",
    "memberships",
    "organizations",
    "sessions",
    "userIdentities",
    "users",
    "workspaces",
  ]);
});

test("schema: tenant ownership, restrictive references, and lookup indexes are enforced", () => {
  assert.ok(database.organizations, "organizations table export must exist");
  assert.ok(database.workspaces, "workspaces table export must exist");
  assert.ok(database.memberships, "memberships table export must exist");

  const organizationConfig = getTableConfig(database.organizations);
  const workspaceConfig = getTableConfig(database.workspaces);
  const membershipConfig = getTableConfig(database.memberships);
  const names = (items) => items.map((item) => item.config?.name ?? item.name).sort();

  assert.deepEqual(names(organizationConfig.indexes), [
    "organizations_created_at_id_idx",
    "organizations_creator_idempotency_unique",
    "organizations_slug_unique",
  ]);
  assert.deepEqual(names(workspaceConfig.indexes), [
    "workspaces_creator_idempotency_unique",
    "workspaces_organization_created_at_id_idx",
    "workspaces_organization_slug_unique",
  ]);
  assert.deepEqual(names(membershipConfig.indexes), [
    "memberships_creator_idempotency_unique",
    "memberships_organization_created_at_id_idx",
    "memberships_organization_user_unique",
    "memberships_workspace_user_unique",
  ]);

  assert.deepEqual(workspaceConfig.foreignKeys.map((foreignKey) => foreignKey.getName()).sort(), [
    "workspaces_created_by_user_id_users_id_fk",
    "workspaces_organization_id_organizations_id_fk",
  ]);
  assert.deepEqual(membershipConfig.foreignKeys.map((foreignKey) => foreignKey.getName()).sort(), [
    "memberships_created_by_user_id_users_id_fk",
    "memberships_organization_id_organizations_id_fk",
    "memberships_organization_id_workspace_id_workspaces_organization_id_id_fk",
    "memberships_user_id_users_id_fk",
  ]);
  assert.ok(
    [...workspaceConfig.foreignKeys, ...membershipConfig.foreignKeys].every(
      (foreignKey) => foreignKey.onDelete === "restrict",
    ),
  );
  assert.equal(organizationConfig.checks.length, 5);
  assert.equal(workspaceConfig.checks.length, 5);
  assert.equal(membershipConfig.checks.length, 4);
});

test("validation: tenant context requires explicit UUID scope and bounded correlation", () => {
  assert.equal(typeof database.validateTenantContext, "function");
  const organizationId = database.createUuidV7();
  const actorUserId = database.createUuidV7();

  assert.deepEqual(
    database.validateTenantContext({
      organizationId,
      actorUserId,
      correlationId: " request-123 ",
    }),
    { organizationId, actorUserId, correlationId: "request-123" },
  );

  for (const invalidContext of [
    undefined,
    {},
    { organizationId: "wrong", actorUserId, correlationId: "request-123" },
    { organizationId, actorUserId: "wrong", correlationId: "request-123" },
    { organizationId, actorUserId, correlationId: "" },
    { organizationId, actorUserId, correlationId: "x".repeat(201) },
  ]) {
    assert.throws(
      () => database.validateTenantContext(invalidContext),
      (error) =>
        error instanceof database.TenancyError &&
        error.code === database.TENANCY_ERROR_CODE.TENANT_SCOPE_REQUIRED,
    );
  }
});

test("validation: names, slugs, idempotency keys, versions, roles, and pages are bounded", () => {
  assert.equal(typeof database.normalizeTenancyName, "function");
  assert.equal(database.normalizeTenancyName("  Acme Feed Team  "), "Acme Feed Team");
  assert.equal(database.validateTenancySlug("acme-feed-team"), "acme-feed-team");
  assert.equal(database.validateIdempotencyKey(" create-42 "), "create-42");
  assert.equal(database.validateExpectedVersion(7), 7);
  assert.equal(database.validateMembershipRole("security_administrator"), "security_administrator");
  assert.deepEqual(database.validateTenancyListInput({ limit: 100 }), { limit: 100 });

  for (const invalidName of ["", " ", "x".repeat(201)]) {
    assert.throws(() => database.normalizeTenancyName(invalidName), {
      code: "TENANCY_INVALID_INPUT",
    });
  }
  for (const invalidSlug of ["Acme", "acme feed", "-acme", "acme-", "x".repeat(101)]) {
    assert.throws(() => database.validateTenancySlug(invalidSlug), {
      code: "TENANCY_INVALID_INPUT",
    });
  }
  for (const invalidKey of ["", " ", "x".repeat(201)]) {
    assert.throws(() => database.validateIdempotencyKey(invalidKey), {
      code: "TENANCY_INVALID_INPUT",
    });
  }
  for (const invalidVersion of [0, -1, 1.5, Number.NaN]) {
    assert.throws(() => database.validateExpectedVersion(invalidVersion), {
      code: "TENANCY_INVALID_INPUT",
    });
  }
  assert.throws(() => database.validateMembershipRole("owner"), {
    code: "TENANCY_INVALID_INPUT",
  });
  for (const invalidList of [{ limit: 0 }, { limit: 101 }, { limit: 1.5 }]) {
    assert.throws(() => database.validateTenancyListInput(invalidList), {
      code: "TENANCY_INVALID_INPUT",
    });
  }
});

test("redaction: tenancy errors expose stable codes without persistence details", () => {
  assert.equal(typeof database.TenancyError, "function");
  const visibleSecret = "database-password-must-not-leak";
  const error = new database.TenancyError(database.TENANCY_ERROR_CODE.PERSISTENCE_FAILED, {
    cause: new Error(`driver failed with ${visibleSecret}`),
  });

  assert.equal(error.name, "TenancyError");
  assert.equal(error.code, "TENANCY_PERSISTENCE_FAILED");
  assert.equal(error.message, "Tenancy persistence failed");
  assert.doesNotMatch(JSON.stringify(error), new RegExp(visibleSecret));
  assert.doesNotMatch(error.stack ?? "", new RegExp(visibleSecret));
});

test("event: observer failure cannot change the tenancy operation outcome", () => {
  assert.equal(typeof database.reportTenancyEvent, "function");
  const event = {
    type: "organization.created.v1",
    outcome: "succeeded",
    actorUserId: database.createUuidV7(),
    organizationId: database.createUuidV7(),
    resourceType: "organization",
    resourceId: database.createUuidV7(),
    version: 1,
    correlationId: "request-123",
  };
  let observed;

  assert.doesNotThrow(() =>
    database.reportTenancyEvent((value) => {
      observed = value;
      throw new Error("telemetry unavailable");
    }, event),
  );
  assert.deepEqual(observed, event);
  assert.equal(Object.isFrozen(observed), true);
});
