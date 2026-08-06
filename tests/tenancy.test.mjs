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

function organizationInput(actorUserId = database.createUuidV7()) {
  return {
    name: "Acme Feed Team",
    slug: "acme-feed-team",
    actorUserId,
    idempotencyKey: "organization-create-1",
    correlationId: "request-123",
  };
}

function inMemoryBootstrapPersistence({ failMembership = false } = {}) {
  const state = {
    organizations: [],
    memberships: [],
    organizationInsertAttempts: 0,
    membershipInsertAttempts: 0,
  };
  const timestamp = new Date("2026-08-06T12:00:00.000Z");

  return {
    state,
    persistence: {
      async transaction(operation) {
        const stagedOrganizations = [...state.organizations];
        const stagedMemberships = [...state.memberships];
        const transaction = {
          async findOrganizationBootstrap(actorUserId, idempotencyKey) {
            const organization = stagedOrganizations.find(
              (candidate) =>
                candidate.createdByUserId === actorUserId &&
                candidate.idempotencyKey === idempotencyKey,
            );
            if (organization === undefined) return undefined;
            const membership = stagedMemberships.find(
              (candidate) =>
                candidate.organizationId === organization.id &&
                candidate.userId === actorUserId &&
                candidate.workspaceId === null,
            );
            return membership === undefined ? undefined : { organization, membership };
          },
          async insertOrganization(input) {
            state.organizationInsertAttempts += 1;
            const organization = {
              id: database.createUuidV7(),
              ...input,
              createdAt: timestamp,
              updatedAt: timestamp,
              version: 1,
              deletedAt: null,
            };
            stagedOrganizations.push(organization);
            return organization;
          },
          async insertMembership(input) {
            state.membershipInsertAttempts += 1;
            if (failMembership) {
              throw new Error("membership insert failed with database-password-must-not-leak");
            }
            const membership = {
              id: database.createUuidV7(),
              ...input,
              createdAt: timestamp,
              updatedAt: timestamp,
              version: 1,
              deletedAt: null,
            };
            stagedMemberships.push(membership);
            return membership;
          },
        };

        const result = await operation(transaction);
        state.organizations = stagedOrganizations;
        state.memberships = stagedMemberships;
        return result;
      },
    },
  };
}

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

test("bootstrap: organization and initial administrator membership commit atomically", async () => {
  assert.equal(typeof database.createTenancyRepository, "function");
  const { persistence, state } = inMemoryBootstrapPersistence();
  const events = [];
  const repository = database.createTenancyRepository(persistence, {
    onEvent: (event) => events.push(event),
  });
  const input = organizationInput();

  const result = await repository.bootstrapOrganization(input);

  assert.equal(state.organizations.length, 1);
  assert.equal(state.memberships.length, 1);
  assert.equal(result.organization.name, "Acme Feed Team");
  assert.equal(result.organization.slug, "acme-feed-team");
  assert.equal(result.organization.status, "active");
  assert.equal(result.membership.organizationId, result.organization.id);
  assert.equal(result.membership.userId, input.actorUserId);
  assert.equal(result.membership.workspaceId, null);
  assert.equal(result.membership.role, "administrator");
  assert.equal(result.membership.status, "active");
  assert.deepEqual(events, [
    {
      type: "organization.created.v1",
      outcome: "succeeded",
      actorUserId: input.actorUserId,
      organizationId: result.organization.id,
      resourceType: "organization",
      resourceId: result.organization.id,
      version: 1,
      correlationId: "request-123",
    },
  ]);
});

test("bootstrap: membership failure rolls back the organization and returns a redacted error", async () => {
  assert.equal(typeof database.createTenancyRepository, "function");
  const { persistence, state } = inMemoryBootstrapPersistence({ failMembership: true });
  const events = [];
  const repository = database.createTenancyRepository(persistence, {
    onEvent: (event) => events.push(event),
  });
  const input = organizationInput();

  await assert.rejects(repository.bootstrapOrganization(input), (error) => {
    assert.ok(error instanceof database.TenancyError);
    assert.equal(error.code, "TENANCY_PERSISTENCE_FAILED");
    assert.doesNotMatch(JSON.stringify(error), /database-password-must-not-leak/);
    return true;
  });
  assert.equal(state.organizations.length, 0);
  assert.equal(state.memberships.length, 0);
  assert.deepEqual(events, [
    {
      type: "organization.created.v1",
      outcome: "failed",
      actorUserId: input.actorUserId,
      resourceType: "organization",
      correlationId: "request-123",
      errorCode: "TENANCY_PERSISTENCE_FAILED",
    },
  ]);
});

test("idempotent bootstrap: the same actor and key return the original durable result", async () => {
  assert.equal(typeof database.createTenancyRepository, "function");
  const { persistence, state } = inMemoryBootstrapPersistence();
  const repository = database.createTenancyRepository(persistence);
  const input = organizationInput();

  const first = await repository.bootstrapOrganization(input);
  const retry = await repository.bootstrapOrganization(input);

  assert.deepEqual(retry, first);
  assert.equal(state.organizationInsertAttempts, 1);
  assert.equal(state.membershipInsertAttempts, 1);
  assert.equal(state.organizations.length, 1);
  assert.equal(state.memberships.length, 1);
});

test("bootstrap: observer failure cannot turn durable success into failure", async () => {
  assert.equal(typeof database.createTenancyRepository, "function");
  const { persistence, state } = inMemoryBootstrapPersistence();
  const repository = database.createTenancyRepository(persistence, {
    onEvent: () => {
      throw new Error("telemetry unavailable");
    },
  });

  const result = await repository.bootstrapOrganization(organizationInput());

  assert.equal(result.organization.status, "active");
  assert.equal(state.organizations.length, 1);
  assert.equal(state.memberships.length, 1);
});
