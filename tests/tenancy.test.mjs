/**
 * Organization, workspace, and membership tests (task T012).
 *
 * Traceability: organization-and-workspace-domain.md,
 * tenant-isolation-model.md, ADR-013, organizations.md, workspaces.md,
 * memberships.md, F005, and F006.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import { inspect } from "node:util";

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
    workspaces: [],
    memberships: [],
    organizationInsertAttempts: 0,
    workspaceInsertAttempts: 0,
    membershipInsertAttempts: 0,
    operationScopes: [],
  };
  let timestampSequence = 0;
  const nextTimestamp = () =>
    new Date(Date.parse("2026-08-06T12:00:00.000Z") + timestampSequence++);

  return {
    state,
    persistence: {
      async transaction(operation) {
        const stagedOrganizations = [...state.organizations];
        const stagedWorkspaces = [...state.workspaces];
        const stagedMemberships = [...state.memberships];
        const scoped = (operationName, organizationId) => {
          state.operationScopes.push({ operationName, organizationId });
        };
        const updateRow = (rows, id, expectedVersion, changes) => {
          const index = rows.findIndex((row) => row.id === id);
          if (index < 0 || rows[index].version !== expectedVersion) return undefined;
          const updated = {
            ...rows[index],
            ...changes,
            updatedAt: nextTimestamp(),
            version: expectedVersion + 1,
          };
          rows[index] = updated;
          return updated;
        };
        const listRows = (rows, organizationId, input) =>
          rows
            .filter((row) => row.organizationId === organizationId)
            .sort(
              (left, right) =>
                right.createdAt.getTime() - left.createdAt.getTime() ||
                right.id.localeCompare(left.id),
            )
            .filter(
              (row) =>
                input.cursor === undefined ||
                row.createdAt < input.cursor.createdAt ||
                (row.createdAt.getTime() === input.cursor.createdAt.getTime() &&
                  row.id < input.cursor.id),
            )
            .slice(0, input.limit);
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
              createdAt: nextTimestamp(),
              updatedAt: nextTimestamp(),
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
              createdAt: nextTimestamp(),
              updatedAt: nextTimestamp(),
              version: 1,
              deletedAt: null,
            };
            stagedMemberships.push(membership);
            return membership;
          },
          async getOrganization(organizationId) {
            scoped("getOrganization", organizationId);
            return stagedOrganizations.find((row) => row.id === organizationId);
          },
          async updateOrganization(organizationId, changes, expectedVersion) {
            scoped("updateOrganization", organizationId);
            return updateRow(stagedOrganizations, organizationId, expectedVersion, changes);
          },
          async findWorkspaceCreate(organizationId, actorUserId, idempotencyKey) {
            scoped("findWorkspaceCreate", organizationId);
            return stagedWorkspaces.find(
              (row) =>
                row.organizationId === organizationId &&
                row.createdByUserId === actorUserId &&
                row.idempotencyKey === idempotencyKey,
            );
          },
          async insertWorkspace(input) {
            scoped("insertWorkspace", input.organizationId);
            state.workspaceInsertAttempts += 1;
            const workspace = {
              id: database.createUuidV7(),
              ...input,
              createdAt: nextTimestamp(),
              updatedAt: nextTimestamp(),
              version: 1,
              deletedAt: null,
            };
            stagedWorkspaces.push(workspace);
            return workspace;
          },
          async getWorkspace(organizationId, workspaceId) {
            scoped("getWorkspace", organizationId);
            return stagedWorkspaces.find(
              (row) => row.organizationId === organizationId && row.id === workspaceId,
            );
          },
          async listWorkspaces(organizationId, input) {
            scoped("listWorkspaces", organizationId);
            return listRows(stagedWorkspaces, organizationId, input);
          },
          async updateWorkspace(organizationId, workspaceId, changes, expectedVersion) {
            scoped("updateWorkspace", organizationId);
            const workspace = stagedWorkspaces.find(
              (row) => row.organizationId === organizationId && row.id === workspaceId,
            );
            return workspace === undefined
              ? undefined
              : updateRow(stagedWorkspaces, workspaceId, expectedVersion, changes);
          },
          async findMembershipCreate(organizationId, actorUserId, idempotencyKey) {
            scoped("findMembershipCreate", organizationId);
            return stagedMemberships.find(
              (row) =>
                row.organizationId === organizationId &&
                row.createdByUserId === actorUserId &&
                row.idempotencyKey === idempotencyKey,
            );
          },
          async insertScopedMembership(input) {
            scoped("insertMembership", input.organizationId);
            state.membershipInsertAttempts += 1;
            const membership = {
              id: database.createUuidV7(),
              ...input,
              createdAt: nextTimestamp(),
              updatedAt: nextTimestamp(),
              version: 1,
              deletedAt: null,
            };
            stagedMemberships.push(membership);
            return membership;
          },
          async getMembership(organizationId, membershipId) {
            scoped("getMembership", organizationId);
            return stagedMemberships.find(
              (row) => row.organizationId === organizationId && row.id === membershipId,
            );
          },
          async listMemberships(organizationId, input) {
            scoped("listMemberships", organizationId);
            return listRows(stagedMemberships, organizationId, input);
          },
          async updateMembership(organizationId, membershipId, changes, expectedVersion) {
            scoped("updateMembership", organizationId);
            const membership = stagedMemberships.find(
              (row) => row.organizationId === organizationId && row.id === membershipId,
            );
            return membership === undefined
              ? undefined
              : updateRow(stagedMemberships, membershipId, expectedVersion, changes);
          },
          async resolveActiveRoles(organizationId, userId, workspaceId) {
            scoped("resolveActiveRoles", organizationId);
            return stagedMemberships
              .filter(
                (row) =>
                  row.organizationId === organizationId &&
                  row.userId === userId &&
                  row.status === "active" &&
                  row.deletedAt === null &&
                  (row.workspaceId === null || row.workspaceId === workspaceId),
              )
              .map((row) => row.role);
          },
        };

        const result = await operation(transaction);
        state.organizations = stagedOrganizations;
        state.workspaces = stagedWorkspaces;
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
    "auditLogs",
    "authenticationEvents",
    "authenticationVerifications",
    "encryptedCredentials",
    "inboxEvents",
    "memberships",
    "organizations",
    "outboxEvents",
    "securityEvents",
    "sessions",
    "supportAccessGrants",
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

test("tenant isolation: workspace reads and membership references never cross organization scope", async () => {
  const { persistence, state } = inMemoryBootstrapPersistence();
  const repository = database.createTenancyRepository(persistence);
  assert.equal(typeof repository.createWorkspace, "function");
  assert.equal(typeof repository.createMembership, "function");
  const inputA = organizationInput();
  const inputB = organizationInput(database.createUuidV7());
  inputB.slug = "bravo-feed-team";
  inputB.idempotencyKey = "organization-create-2";
  const tenantA = await repository.bootstrapOrganization(inputA);
  const tenantB = await repository.bootstrapOrganization(inputB);
  const contextA = {
    organizationId: tenantA.organization.id,
    actorUserId: inputA.actorUserId,
    correlationId: "request-a",
  };
  const contextB = {
    organizationId: tenantB.organization.id,
    actorUserId: inputB.actorUserId,
    correlationId: "request-b",
  };
  const workspace = await repository.createWorkspace(contextA, {
    name: "Primary Store",
    slug: "primary-store",
    idempotencyKey: "workspace-create-1",
  });

  await assert.rejects(repository.getWorkspace(contextB, workspace.id), {
    code: "TENANCY_NOT_FOUND",
  });
  await assert.rejects(
    repository.createMembership(contextB, {
      userId: database.createUuidV7(),
      workspaceId: workspace.id,
      role: "viewer",
      idempotencyKey: "membership-create-cross-tenant",
    }),
    { code: "TENANCY_NOT_FOUND" },
  );
  await assert.rejects(repository.getWorkspace({}, workspace.id), {
    code: "TENANCY_TENANT_SCOPE_REQUIRED",
  });
  assert.ok(
    state.operationScopes.every(
      ({ organizationId }) =>
        organizationId === tenantA.organization.id || organizationId === tenantB.organization.id,
    ),
  );
});

test("workspace lifecycle: creates are idempotent and stale versions fail", async () => {
  const { persistence, state } = inMemoryBootstrapPersistence();
  const events = [];
  const repository = database.createTenancyRepository(persistence, {
    onEvent: (event) => events.push(event),
  });
  assert.equal(typeof repository.updateWorkspace, "function");
  const input = organizationInput();
  const tenant = await repository.bootstrapOrganization(input);
  const context = {
    organizationId: tenant.organization.id,
    actorUserId: input.actorUserId,
    correlationId: "workspace-request",
  };
  const createInput = {
    name: "Primary Store",
    slug: "primary-store",
    idempotencyKey: "workspace-create-1",
  };

  const first = await repository.createWorkspace(context, createInput);
  const replay = await repository.createWorkspace(context, createInput);
  const updated = await repository.updateWorkspace(context, {
    workspaceId: first.id,
    name: "Primary Catalog",
    expectedVersion: 1,
  });

  assert.deepEqual(replay, first);
  assert.equal(state.workspaceInsertAttempts, 1);
  assert.equal(updated.name, "Primary Catalog");
  assert.equal(updated.version, 2);
  await assert.rejects(
    repository.updateWorkspace(context, {
      workspaceId: first.id,
      name: "Stale Name",
      expectedVersion: 1,
    }),
    { code: "TENANCY_VERSION_CONFLICT" },
  );
  const archived = await repository.archiveWorkspace(context, {
    workspaceId: first.id,
    expectedVersion: 2,
  });
  assert.equal(archived.status, "archived");
  assert.equal(archived.version, 3);
  assert.deepEqual(
    events.map(({ type, outcome }) => ({ type, outcome })),
    [
      { type: "organization.created.v1", outcome: "succeeded" },
      { type: "workspace.created.v1", outcome: "succeeded" },
      { type: "workspace.updated.v1", outcome: "succeeded" },
      { type: "workspace.deleted.v1", outcome: "succeeded" },
    ],
  );
});

test("membership roles: resolution combines active organization and requested workspace roles only", async () => {
  const { persistence } = inMemoryBootstrapPersistence();
  const repository = database.createTenancyRepository(persistence);
  assert.equal(typeof repository.resolveActiveRoles, "function");
  const input = organizationInput();
  const tenant = await repository.bootstrapOrganization(input);
  const context = {
    organizationId: tenant.organization.id,
    actorUserId: input.actorUserId,
    correlationId: "membership-request",
  };
  const memberUserId = database.createUuidV7();
  const primary = await repository.createWorkspace(context, {
    name: "Primary Store",
    slug: "primary-store",
    idempotencyKey: "workspace-primary",
  });
  const secondary = await repository.createWorkspace(context, {
    name: "Secondary Store",
    slug: "secondary-store",
    idempotencyKey: "workspace-secondary",
  });
  await repository.createMembership(context, {
    userId: memberUserId,
    role: "viewer",
    idempotencyKey: "membership-organization",
  });
  const managerMembership = await repository.createMembership(context, {
    userId: memberUserId,
    workspaceId: primary.id,
    role: "manager",
    idempotencyKey: "membership-primary",
  });
  await repository.createMembership(context, {
    userId: memberUserId,
    workspaceId: secondary.id,
    role: "operator",
    idempotencyKey: "membership-secondary",
  });

  assert.deepEqual(await repository.resolveActiveRoles(context, { userId: memberUserId }), [
    "viewer",
  ]);
  assert.deepEqual(
    await repository.resolveActiveRoles(context, { userId: memberUserId, workspaceId: primary.id }),
    ["viewer", "manager"],
  );
  assert.deepEqual(
    await repository.resolveActiveRoles(context, {
      userId: memberUserId,
      workspaceId: secondary.id,
    }),
    ["viewer", "operator"],
  );

  const suspended = await repository.updateMembership(context, {
    membershipId: managerMembership.id,
    status: "suspended",
    expectedVersion: 1,
  });
  assert.equal(suspended.version, 2);
  assert.deepEqual(
    await repository.resolveActiveRoles(context, { userId: memberUserId, workspaceId: primary.id }),
    ["viewer"],
  );
});

test("pagination: workspace lists use a bounded non-overlapping keyset cursor", async () => {
  const { persistence } = inMemoryBootstrapPersistence();
  const repository = database.createTenancyRepository(persistence);
  assert.equal(typeof repository.listWorkspaces, "function");
  const input = organizationInput();
  const tenant = await repository.bootstrapOrganization(input);
  const context = {
    organizationId: tenant.organization.id,
    actorUserId: input.actorUserId,
    correlationId: "list-request",
  };
  for (const [name, slug] of [
    ["Alpha", "alpha"],
    ["Bravo", "bravo"],
    ["Charlie", "charlie"],
  ]) {
    await repository.createWorkspace(context, {
      name,
      slug,
      idempotencyKey: `workspace-${slug}`,
    });
  }

  const firstPage = await repository.listWorkspaces(context, { limit: 2 });
  const last = firstPage.at(-1);
  const secondPage = await repository.listWorkspaces(context, {
    limit: 2,
    cursor: { createdAt: last.createdAt, id: last.id },
  });

  assert.equal(firstPage.length, 2);
  assert.equal(secondPage.length, 1);
  assert.equal(
    firstPage.some(({ id }) => id === secondPage[0].id),
    false,
  );
});

test("organization lifecycle: updates use optimistic versions and archive is terminal", async () => {
  const { persistence } = inMemoryBootstrapPersistence();
  const repository = database.createTenancyRepository(persistence);
  assert.equal(typeof repository.getOrganization, "function");
  assert.equal(typeof repository.updateOrganization, "function");
  assert.equal(typeof repository.archiveOrganization, "function");
  const input = organizationInput();
  const tenant = await repository.bootstrapOrganization(input);
  const context = {
    organizationId: tenant.organization.id,
    actorUserId: input.actorUserId,
    correlationId: "organization-request",
  };

  assert.deepEqual(await repository.getOrganization(context), tenant.organization);
  const updated = await repository.updateOrganization(context, {
    name: "Acme Catalog Team",
    expectedVersion: 1,
  });
  assert.equal(updated.name, "Acme Catalog Team");
  assert.equal(updated.version, 2);
  await assert.rejects(
    repository.updateOrganization(context, { name: "Stale", expectedVersion: 1 }),
    { code: "TENANCY_VERSION_CONFLICT" },
  );
  const archived = await repository.archiveOrganization(context, { expectedVersion: 2 });
  assert.equal(archived.status, "archived");
  assert.equal(archived.version, 3);
  assert.deepEqual(await repository.archiveOrganization(context, { expectedVersion: 2 }), archived);
  await assert.rejects(
    repository.updateOrganization(context, { name: "No revival", expectedVersion: 3 }),
    { code: "TENANCY_CONFLICT" },
  );
});

test("membership lifecycle: scoped get/list and idempotent revoke exclude active roles", async () => {
  const { persistence } = inMemoryBootstrapPersistence();
  const repository = database.createTenancyRepository(persistence);
  assert.equal(typeof repository.getMembership, "function");
  assert.equal(typeof repository.listMemberships, "function");
  assert.equal(typeof repository.revokeMembership, "function");
  const input = organizationInput();
  const tenant = await repository.bootstrapOrganization(input);
  const context = {
    organizationId: tenant.organization.id,
    actorUserId: input.actorUserId,
    correlationId: "membership-lifecycle",
  };
  const memberUserId = database.createUuidV7();
  const membership = await repository.createMembership(context, {
    userId: memberUserId,
    role: "viewer",
    idempotencyKey: "membership-viewer",
  });

  assert.deepEqual(await repository.getMembership(context, membership.id), membership);
  assert.equal((await repository.listMemberships(context, { limit: 10 })).length, 2);
  const revoked = await repository.revokeMembership(context, {
    membershipId: membership.id,
    expectedVersion: 1,
  });
  assert.equal(revoked.status, "revoked");
  assert.equal(revoked.version, 2);
  assert.deepEqual(
    await repository.revokeMembership(context, {
      membershipId: membership.id,
      expectedVersion: 1,
    }),
    revoked,
  );
  assert.deepEqual(await repository.resolveActiveRoles(context, { userId: memberUserId }), []);
});

test("database adapter: organization lookup emits a scoped Drizzle predicate", async () => {
  assert.equal(typeof database.createDrizzleTenancyPersistence, "function");
  const organizationId = database.createUuidV7();
  const row = { id: organizationId };
  let capturedWhere;
  const fakeTransaction = {
    select() {
      return {
        from() {
          return {
            where(expression) {
              capturedWhere = expression;
              return { limit: async () => [row] };
            },
          };
        },
      };
    },
  };
  const persistence = database.createDrizzleTenancyPersistence({
    db: { transaction: async (operation) => operation(fakeTransaction) },
  });

  const result = await persistence.transaction((transaction) =>
    transaction.getOrganization(organizationId),
  );

  assert.equal(result, row);
  assert.match(inspect(capturedWhere, { depth: 8 }), new RegExp(organizationId));
});

test("migration: reviewed additive SQL creates only the documented tenancy tables", async () => {
  const migration = await readFile(
    new URL(
      "../packages/database/drizzle/0001_t012_organizations_workspaces_memberships.sql",
      import.meta.url,
    ),
    "utf8",
  ).catch(() => undefined);
  assert.equal(typeof migration, "string", "T012 migration must exist");

  assert.deepEqual(
    [...migration.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]).sort(),
    ["memberships", "organizations", "workspaces"],
  );
  assert.doesNotMatch(migration, /\bDROP\b/i);
  assert.match(migration, /ON DELETE restrict/);
  assert.match(
    migration,
    /FOREIGN KEY \("organization_id","workspace_id"\) REFERENCES "public"\."workspaces"\("organization_id","id"\)/,
  );
  for (const role of [
    "viewer",
    "operator",
    "manager",
    "approver",
    "administrator",
    "security_administrator",
    "billing_administrator",
    "platform_operator",
  ]) {
    assert.match(migration, new RegExp(`'${role}'`));
  }
  for (const indexName of [
    "workspaces_organization_created_at_id_idx",
    "memberships_organization_created_at_id_idx",
    "memberships_organization_user_unique",
    "memberships_workspace_user_unique",
  ]) {
    assert.match(migration, new RegExp(`CREATE (?:UNIQUE )?INDEX "${indexName}"`));
  }
});

test("registry: tenancy table authorities match concrete column counts and rollback order", async () => {
  const specificationRoot = new URL(
    "../feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/",
    import.meta.url,
  );
  const registry = await readFile(
    new URL("docs/07-data-architecture/PHYSICAL_SCHEMA_REGISTRY.md", specificationRoot),
    "utf8",
  );
  const expectations = [
    ["organizations", 10],
    ["workspaces", 11],
    ["memberships", 12],
  ];

  for (const [table, count] of expectations) {
    assert.match(
      registry,
      new RegExp(`\\| \x60identity-and-tenancy\x60 \\| \x60${table}\x60 \\| ${count} \\|`),
    );
    const authority = await readFile(
      new URL(
        `docs/07-data-architecture/tables/identity-and-tenancy/${table}.md`,
        specificationRoot,
      ),
      "utf8",
    );
    assert.match(authority, /## Implemented Physical Schema/);
    assert.match(authority, /## Rollback/);
    assert.match(authority, /memberships.*workspaces.*organizations/s);
  }
});
