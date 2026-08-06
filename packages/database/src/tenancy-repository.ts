/** Tenant-aware repository contracts and trust-boundary validation (task T012). */
import { isRole, type Role } from "@fixmyfeed/domain";
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import { isUuidV7 } from "./ids.js";
import { TENANCY_ERROR_CODE, TenancyError, type TenancyErrorCode } from "./tenancy-errors.js";
import {
  memberships,
  organizations,
  workspaces,
  type Membership,
  type NewMembership,
  type NewOrganization,
  type NewWorkspace,
  type Organization,
  type Workspace,
} from "./tenancy-schema.js";

const MAX_NAME_LENGTH = 200;
const MAX_SLUG_LENGTH = 100;
const MAX_CONTEXT_VALUE_LENGTH = 200;
const MAX_LIST_LIMIT = 100;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface TenantContext {
  readonly organizationId: string;
  readonly actorUserId: string;
  readonly correlationId: string;
}

export interface BootstrapOrganizationInput {
  readonly name: string;
  readonly slug: string;
  readonly actorUserId: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
}

export interface OrganizationBootstrapResult {
  readonly organization: Organization;
  readonly membership: Membership;
}

export interface TenancyListCursor {
  readonly createdAt: Date;
  readonly id: string;
}

export interface TenancyListInput {
  readonly limit: number;
  readonly cursor?: TenancyListCursor;
}

export interface CreateWorkspaceInput {
  readonly name: string;
  readonly slug: string;
  readonly idempotencyKey: string;
}

export interface UpdateWorkspaceInput {
  readonly workspaceId: string;
  readonly name?: string;
  readonly slug?: string;
  readonly expectedVersion: number;
}

export interface CreateMembershipInput {
  readonly userId: string;
  readonly workspaceId?: string;
  readonly role: Role;
  readonly idempotencyKey: string;
}

export interface UpdateMembershipInput {
  readonly membershipId: string;
  readonly role?: Role;
  readonly status?: "active" | "suspended";
  readonly expectedVersion: number;
}

export interface TenancyEvent {
  readonly type: string;
  readonly outcome: "succeeded" | "failed";
  readonly actorUserId: string;
  readonly organizationId?: string;
  readonly resourceType: "organization" | "workspace" | "membership";
  readonly resourceId?: string;
  readonly version?: number;
  readonly correlationId: string;
  readonly errorCode?: TenancyErrorCode;
}

export interface TenancyRepositoryOptions {
  readonly onEvent?: (event: TenancyEvent) => void;
}

export type BootstrapOrganizationRecord = Pick<
  NewOrganization,
  "name" | "slug" | "status" | "idempotencyKey" | "createdByUserId"
>;

export type BootstrapMembershipRecord = Pick<
  NewMembership,
  | "organizationId"
  | "workspaceId"
  | "userId"
  | "role"
  | "status"
  | "idempotencyKey"
  | "createdByUserId"
>;

export interface TenancyTransaction {
  findOrganizationBootstrap(
    actorUserId: string,
    idempotencyKey: string,
  ): Promise<OrganizationBootstrapResult | undefined>;
  insertOrganization(input: BootstrapOrganizationRecord): Promise<Organization>;
  insertMembership(input: BootstrapMembershipRecord): Promise<Membership>;
  getOrganization(organizationId: string): Promise<Organization | undefined>;
  updateOrganization(
    organizationId: string,
    changes: Partial<Pick<Organization, "name" | "slug" | "status" | "deletedAt">>,
    expectedVersion: number,
  ): Promise<Organization | undefined>;
  findWorkspaceCreate(
    organizationId: string,
    actorUserId: string,
    idempotencyKey: string,
  ): Promise<Workspace | undefined>;
  insertWorkspace(
    input: Pick<
      NewWorkspace,
      "organizationId" | "name" | "slug" | "status" | "idempotencyKey" | "createdByUserId"
    >,
  ): Promise<Workspace>;
  getWorkspace(organizationId: string, workspaceId: string): Promise<Workspace | undefined>;
  listWorkspaces(organizationId: string, input: TenancyListInput): Promise<readonly Workspace[]>;
  updateWorkspace(
    organizationId: string,
    workspaceId: string,
    changes: Partial<Pick<Workspace, "name" | "slug" | "status" | "deletedAt">>,
    expectedVersion: number,
  ): Promise<Workspace | undefined>;
  findMembershipCreate(
    organizationId: string,
    actorUserId: string,
    idempotencyKey: string,
  ): Promise<Membership | undefined>;
  getMembership(organizationId: string, membershipId: string): Promise<Membership | undefined>;
  listMemberships(organizationId: string, input: TenancyListInput): Promise<readonly Membership[]>;
  updateMembership(
    organizationId: string,
    membershipId: string,
    changes: Partial<Pick<Membership, "role" | "status" | "deletedAt">>,
    expectedVersion: number,
  ): Promise<Membership | undefined>;
  resolveActiveRoles(
    organizationId: string,
    userId: string,
    workspaceId?: string,
  ): Promise<readonly Role[]>;
}

export interface TenancyPersistence {
  transaction<T>(operation: (transaction: TenancyTransaction) => Promise<T>): Promise<T>;
}

export interface OrganizationBootstrapRepository {
  bootstrapOrganization(input: BootstrapOrganizationInput): Promise<OrganizationBootstrapResult>;
}

export type OperationalTenancyRepository = TenancyRepository;

export interface TenancyRepository {
  bootstrapOrganization(input: BootstrapOrganizationInput): Promise<OrganizationBootstrapResult>;
  getOrganization(context: TenantContext): Promise<Organization>;
  updateOrganization(
    context: TenantContext,
    input: { readonly name?: string; readonly slug?: string; readonly expectedVersion: number },
  ): Promise<Organization>;
  archiveOrganization(
    context: TenantContext,
    input: { readonly expectedVersion: number },
  ): Promise<Organization>;
  createWorkspace(context: TenantContext, input: CreateWorkspaceInput): Promise<Workspace>;
  getWorkspace(context: TenantContext, workspaceId: string): Promise<Workspace>;
  listWorkspaces(context: TenantContext, input: TenancyListInput): Promise<readonly Workspace[]>;
  updateWorkspace(context: TenantContext, input: UpdateWorkspaceInput): Promise<Workspace>;
  archiveWorkspace(
    context: TenantContext,
    input: { readonly workspaceId: string; readonly expectedVersion: number },
  ): Promise<Workspace>;
  createMembership(context: TenantContext, input: CreateMembershipInput): Promise<Membership>;
  getMembership(context: TenantContext, membershipId: string): Promise<Membership>;
  listMemberships(context: TenantContext, input: TenancyListInput): Promise<readonly Membership[]>;
  updateMembership(context: TenantContext, input: UpdateMembershipInput): Promise<Membership>;
  revokeMembership(
    context: TenantContext,
    input: { readonly membershipId: string; readonly expectedVersion: number },
  ): Promise<Membership>;
  resolveActiveRoles(
    context: TenantContext,
    input: { readonly userId: string; readonly workspaceId?: string },
  ): Promise<readonly Role[]>;
}

export type TenancyDatabaseClient = Pick<DatabaseClient, "db">;

const invalidInput = (): never => {
  throw new TenancyError(TENANCY_ERROR_CODE.INVALID_INPUT);
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" ? (value as Record<string, unknown>) : undefined;

const boundedValue = (value: unknown): string => {
  if (typeof value !== "string") return invalidInput();
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > MAX_CONTEXT_VALUE_LENGTH) {
    return invalidInput();
  }
  return normalized;
};

export function validateTenantContext(value: unknown): TenantContext {
  const context = asRecord(value);
  if (context === undefined) {
    throw new TenancyError(TENANCY_ERROR_CODE.TENANT_SCOPE_REQUIRED);
  }

  const organizationId = context.organizationId;
  const actorUserId = context.actorUserId;
  const correlationId = context.correlationId;
  if (
    typeof organizationId !== "string" ||
    !isUuidV7(organizationId) ||
    typeof actorUserId !== "string" ||
    !isUuidV7(actorUserId) ||
    typeof correlationId !== "string" ||
    correlationId.trim().length === 0 ||
    correlationId.trim().length > MAX_CONTEXT_VALUE_LENGTH
  ) {
    throw new TenancyError(TENANCY_ERROR_CODE.TENANT_SCOPE_REQUIRED);
  }

  return { organizationId, actorUserId, correlationId: correlationId.trim() };
}

export function normalizeTenancyName(value: unknown): string {
  if (typeof value !== "string") return invalidInput();
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > MAX_NAME_LENGTH) return invalidInput();
  return normalized;
}

export function validateTenancySlug(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_SLUG_LENGTH ||
    !SLUG_PATTERN.test(value)
  ) {
    return invalidInput();
  }
  return value;
}

export const validateIdempotencyKey = (value: unknown): string => boundedValue(value);

export function validateExpectedVersion(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 1) return invalidInput();
  return value as number;
}

export function validateMembershipRole(value: unknown): Role {
  if (typeof value !== "string" || !isRole(value)) return invalidInput();
  return value;
}

export function validateTenancyListInput(value: unknown): TenancyListInput {
  const input = asRecord(value);
  if (input === undefined || !Number.isInteger(input.limit)) return invalidInput();
  const limit = input.limit as number;
  if (limit < 1 || limit > MAX_LIST_LIMIT) return invalidInput();

  if (input.cursor === undefined) return { limit };
  const cursor = asRecord(input.cursor);
  if (
    cursor === undefined ||
    !(cursor.createdAt instanceof Date) ||
    Number.isNaN(cursor.createdAt.getTime()) ||
    typeof cursor.id !== "string" ||
    !isUuidV7(cursor.id)
  ) {
    return invalidInput();
  }

  return { limit, cursor: { createdAt: cursor.createdAt, id: cursor.id } };
}

export function reportTenancyEvent(
  observer: ((event: TenancyEvent) => void) | undefined,
  event: TenancyEvent,
): void {
  if (observer === undefined) return;
  try {
    observer(Object.freeze({ ...event }));
  } catch {
    // Telemetry is best-effort and cannot change a durable tenancy outcome.
  }
}

const validateBootstrapOrganizationInput = (
  value: BootstrapOrganizationInput,
): BootstrapOrganizationInput => {
  const input = asRecord(value);
  if (
    input === undefined ||
    typeof input.actorUserId !== "string" ||
    !isUuidV7(input.actorUserId)
  ) {
    return invalidInput();
  }

  return {
    name: normalizeTenancyName(input.name),
    slug: validateTenancySlug(input.slug),
    actorUserId: input.actorUserId,
    idempotencyKey: validateIdempotencyKey(input.idempotencyKey),
    correlationId: boundedValue(input.correlationId),
  };
};

const validateUuid = (value: unknown): string => {
  if (typeof value !== "string" || !isUuidV7(value)) return invalidInput();
  return value;
};

const notFound = (): never => {
  throw new TenancyError(TENANCY_ERROR_CODE.NOT_FOUND);
};

const versionConflict = (): never => {
  throw new TenancyError(TENANCY_ERROR_CODE.VERSION_CONFLICT);
};

const conflict = (): never => {
  throw new TenancyError(TENANCY_ERROR_CODE.CONFLICT);
};

export function createTenancyRepository(
  persistence: TenancyPersistence,
  options: TenancyRepositoryOptions = {},
): OperationalTenancyRepository {
  if (persistence === null || typeof persistence?.transaction !== "function") invalidInput();

  const run = async <T>(operation: (transaction: TenancyTransaction) => Promise<T>): Promise<T> => {
    try {
      return await persistence.transaction(operation);
    } catch (error) {
      throw error instanceof TenancyError
        ? error
        : new TenancyError(TENANCY_ERROR_CODE.PERSISTENCE_FAILED);
    }
  };

  const emitMutation = (
    context: TenantContext,
    type: string,
    resourceType: TenancyEvent["resourceType"],
    resourceId: string,
    version: number,
  ): void =>
    reportTenancyEvent(options.onEvent, {
      type,
      outcome: "succeeded",
      actorUserId: context.actorUserId,
      organizationId: context.organizationId,
      resourceType,
      resourceId,
      version,
      correlationId: context.correlationId,
    });

  const repository: OperationalTenancyRepository = {
    async bootstrapOrganization(
      unvalidatedInput: BootstrapOrganizationInput,
    ): Promise<OrganizationBootstrapResult> {
      const input = validateBootstrapOrganizationInput(unvalidatedInput);

      try {
        const transactionResult = await persistence.transaction(async (transaction) => {
          const existing = await transaction.findOrganizationBootstrap(
            input.actorUserId,
            input.idempotencyKey,
          );
          if (existing !== undefined) return { result: existing, created: false } as const;

          const organization = await transaction.insertOrganization({
            name: input.name,
            slug: input.slug,
            status: "active",
            idempotencyKey: input.idempotencyKey,
            createdByUserId: input.actorUserId,
          });
          const membership = await transaction.insertMembership({
            organizationId: organization.id,
            workspaceId: null,
            userId: input.actorUserId,
            role: "administrator",
            status: "active",
            idempotencyKey: input.idempotencyKey,
            createdByUserId: input.actorUserId,
          });
          return { result: { organization, membership }, created: true } as const;
        });

        if (transactionResult.created) {
          reportTenancyEvent(options.onEvent, {
            type: "organization.created.v1",
            outcome: "succeeded",
            actorUserId: input.actorUserId,
            organizationId: transactionResult.result.organization.id,
            resourceType: "organization",
            resourceId: transactionResult.result.organization.id,
            version: transactionResult.result.organization.version,
            correlationId: input.correlationId,
          });
        }
        return transactionResult.result;
      } catch (error) {
        const tenancyError =
          error instanceof TenancyError
            ? error
            : new TenancyError(TENANCY_ERROR_CODE.PERSISTENCE_FAILED);
        reportTenancyEvent(options.onEvent, {
          type: "organization.created.v1",
          outcome: "failed",
          actorUserId: input.actorUserId,
          resourceType: "organization",
          correlationId: input.correlationId,
          errorCode: tenancyError.code,
        });
        throw tenancyError;
      }
    },
    async getOrganization(unvalidatedContext) {
      const context = validateTenantContext(unvalidatedContext);
      const organization = await run((transaction) =>
        transaction.getOrganization(context.organizationId),
      );
      return organization ?? notFound();
    },
    async updateOrganization(unvalidatedContext, unvalidatedInput) {
      const context = validateTenantContext(unvalidatedContext);
      const input = asRecord(unvalidatedInput);
      if (input === undefined) return invalidInput();
      const expectedVersion = validateExpectedVersion(input.expectedVersion);
      const changes: Partial<Pick<Organization, "name" | "slug">> = {};
      if (input.name !== undefined) changes.name = normalizeTenancyName(input.name);
      if (input.slug !== undefined) changes.slug = validateTenancySlug(input.slug);
      if (changes.name === undefined && changes.slug === undefined) return invalidInput();

      const updated = await run(async (transaction) => {
        const current = await transaction.getOrganization(context.organizationId);
        if (current === undefined) return notFound();
        if (current.status !== "active") return conflict();
        return (
          (await transaction.updateOrganization(
            context.organizationId,
            changes,
            expectedVersion,
          )) ?? versionConflict()
        );
      });
      emitMutation(context, "organization.updated.v1", "organization", updated.id, updated.version);
      return updated;
    },
    async archiveOrganization(unvalidatedContext, unvalidatedInput) {
      const context = validateTenantContext(unvalidatedContext);
      const input = asRecord(unvalidatedInput);
      if (input === undefined) return invalidInput();
      const expectedVersion = validateExpectedVersion(input.expectedVersion);
      const archived = await run(async (transaction) => {
        const current = await transaction.getOrganization(context.organizationId);
        if (current === undefined) return notFound();
        if (current.status === "archived") return current;
        return (
          (await transaction.updateOrganization(
            context.organizationId,
            { status: "archived", deletedAt: new Date() },
            expectedVersion,
          )) ?? versionConflict()
        );
      });
      if (archived.version === expectedVersion + 1) {
        emitMutation(
          context,
          "organization.deleted.v1",
          "organization",
          archived.id,
          archived.version,
        );
      }
      return archived;
    },
    async createWorkspace(unvalidatedContext, unvalidatedInput) {
      const context = validateTenantContext(unvalidatedContext);
      const input = asRecord(unvalidatedInput);
      if (input === undefined) return invalidInput();
      const name = normalizeTenancyName(input.name);
      const slug = validateTenancySlug(input.slug);
      const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);

      const transactionResult = await run(async (transaction) => {
        const organization = await transaction.getOrganization(context.organizationId);
        if (organization === undefined) return notFound();
        if (organization.status !== "active") return conflict();
        const existing = await transaction.findWorkspaceCreate(
          context.organizationId,
          context.actorUserId,
          idempotencyKey,
        );
        if (existing !== undefined) return { workspace: existing, created: false } as const;
        const workspace = await transaction.insertWorkspace({
          organizationId: context.organizationId,
          name,
          slug,
          status: "active",
          idempotencyKey,
          createdByUserId: context.actorUserId,
        });
        return { workspace, created: true } as const;
      });
      if (transactionResult.created) {
        emitMutation(
          context,
          "workspace.created.v1",
          "workspace",
          transactionResult.workspace.id,
          transactionResult.workspace.version,
        );
      }
      return transactionResult.workspace;
    },
    async getWorkspace(unvalidatedContext, workspaceId) {
      const context = validateTenantContext(unvalidatedContext);
      const validatedWorkspaceId = validateUuid(workspaceId);
      const workspace = await run((transaction) =>
        transaction.getWorkspace(context.organizationId, validatedWorkspaceId),
      );
      return workspace ?? notFound();
    },
    async listWorkspaces(unvalidatedContext, unvalidatedInput) {
      const context = validateTenantContext(unvalidatedContext);
      const input = validateTenancyListInput(unvalidatedInput);
      return run((transaction) => transaction.listWorkspaces(context.organizationId, input));
    },
    async updateWorkspace(unvalidatedContext, unvalidatedInput) {
      const context = validateTenantContext(unvalidatedContext);
      const input = asRecord(unvalidatedInput);
      if (input === undefined) return invalidInput();
      const workspaceId = validateUuid(input.workspaceId);
      const expectedVersion = validateExpectedVersion(input.expectedVersion);
      const changes: Partial<Pick<Workspace, "name" | "slug">> = {};
      if (input.name !== undefined) changes.name = normalizeTenancyName(input.name);
      if (input.slug !== undefined) changes.slug = validateTenancySlug(input.slug);
      if (changes.name === undefined && changes.slug === undefined) return invalidInput();

      const updated = await run(async (transaction) => {
        const current = await transaction.getWorkspace(context.organizationId, workspaceId);
        if (current === undefined) return notFound();
        if (current.status !== "active") return conflict();
        return (
          (await transaction.updateWorkspace(
            context.organizationId,
            workspaceId,
            changes,
            expectedVersion,
          )) ?? versionConflict()
        );
      });
      emitMutation(context, "workspace.updated.v1", "workspace", updated.id, updated.version);
      return updated;
    },
    async archiveWorkspace(unvalidatedContext, unvalidatedInput) {
      const context = validateTenantContext(unvalidatedContext);
      const input = asRecord(unvalidatedInput);
      if (input === undefined) return invalidInput();
      const workspaceId = validateUuid(input.workspaceId);
      const expectedVersion = validateExpectedVersion(input.expectedVersion);
      const archived = await run(async (transaction) => {
        const current = await transaction.getWorkspace(context.organizationId, workspaceId);
        if (current === undefined) return notFound();
        if (current.status === "archived") return current;
        return (
          (await transaction.updateWorkspace(
            context.organizationId,
            workspaceId,
            { status: "archived", deletedAt: new Date() },
            expectedVersion,
          )) ?? versionConflict()
        );
      });
      if (archived.status === "archived" && archived.version === expectedVersion + 1) {
        emitMutation(context, "workspace.deleted.v1", "workspace", archived.id, archived.version);
      }
      return archived;
    },
    async createMembership(unvalidatedContext, unvalidatedInput) {
      const context = validateTenantContext(unvalidatedContext);
      const input = asRecord(unvalidatedInput);
      if (input === undefined) return invalidInput();
      const userId = validateUuid(input.userId);
      const workspaceId =
        input.workspaceId === undefined ? undefined : validateUuid(input.workspaceId);
      const role = validateMembershipRole(input.role);
      const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);

      const transactionResult = await run(async (transaction) => {
        const organization = await transaction.getOrganization(context.organizationId);
        if (organization === undefined) return notFound();
        if (organization.status !== "active") return conflict();
        if (workspaceId !== undefined) {
          const workspace = await transaction.getWorkspace(context.organizationId, workspaceId);
          if (workspace === undefined) return notFound();
          if (workspace.status !== "active") return conflict();
        }
        const existing = await transaction.findMembershipCreate(
          context.organizationId,
          context.actorUserId,
          idempotencyKey,
        );
        if (existing !== undefined) return { membership: existing, created: false } as const;
        const membership = await transaction.insertMembership({
          organizationId: context.organizationId,
          workspaceId: workspaceId ?? null,
          userId,
          role,
          status: "active",
          idempotencyKey,
          createdByUserId: context.actorUserId,
        });
        return { membership, created: true } as const;
      });
      if (transactionResult.created) {
        emitMutation(
          context,
          "membership.created.v1",
          "membership",
          transactionResult.membership.id,
          transactionResult.membership.version,
        );
      }
      return transactionResult.membership;
    },
    async getMembership(unvalidatedContext, membershipId) {
      const context = validateTenantContext(unvalidatedContext);
      const validatedMembershipId = validateUuid(membershipId);
      const membership = await run((transaction) =>
        transaction.getMembership(context.organizationId, validatedMembershipId),
      );
      return membership ?? notFound();
    },
    async listMemberships(unvalidatedContext, unvalidatedInput) {
      const context = validateTenantContext(unvalidatedContext);
      const input = validateTenancyListInput(unvalidatedInput);
      return run((transaction) => transaction.listMemberships(context.organizationId, input));
    },
    async updateMembership(unvalidatedContext, unvalidatedInput) {
      const context = validateTenantContext(unvalidatedContext);
      const input = asRecord(unvalidatedInput);
      if (input === undefined) return invalidInput();
      const membershipId = validateUuid(input.membershipId);
      const expectedVersion = validateExpectedVersion(input.expectedVersion);
      const changes: Partial<Pick<Membership, "role" | "status">> = {};
      if (input.role !== undefined) changes.role = validateMembershipRole(input.role);
      if (input.status !== undefined) {
        if (input.status !== "active" && input.status !== "suspended") return invalidInput();
        changes.status = input.status;
      }
      if (changes.role === undefined && changes.status === undefined) return invalidInput();

      const updated = await run(async (transaction) => {
        const current = await transaction.getMembership(context.organizationId, membershipId);
        if (current === undefined) return notFound();
        if (current.status === "revoked") return conflict();
        return (
          (await transaction.updateMembership(
            context.organizationId,
            membershipId,
            changes,
            expectedVersion,
          )) ?? versionConflict()
        );
      });
      emitMutation(context, "membership.updated.v1", "membership", updated.id, updated.version);
      return updated;
    },
    async revokeMembership(unvalidatedContext, unvalidatedInput) {
      const context = validateTenantContext(unvalidatedContext);
      const input = asRecord(unvalidatedInput);
      if (input === undefined) return invalidInput();
      const membershipId = validateUuid(input.membershipId);
      const expectedVersion = validateExpectedVersion(input.expectedVersion);
      const revoked = await run(async (transaction) => {
        const current = await transaction.getMembership(context.organizationId, membershipId);
        if (current === undefined) return notFound();
        if (current.status === "revoked") return current;
        return (
          (await transaction.updateMembership(
            context.organizationId,
            membershipId,
            { status: "revoked", deletedAt: new Date() },
            expectedVersion,
          )) ?? versionConflict()
        );
      });
      if (revoked.version === expectedVersion + 1) {
        emitMutation(context, "membership.deleted.v1", "membership", revoked.id, revoked.version);
      }
      return revoked;
    },
    async resolveActiveRoles(unvalidatedContext, unvalidatedInput) {
      const context = validateTenantContext(unvalidatedContext);
      const input = asRecord(unvalidatedInput);
      if (input === undefined) return invalidInput();
      const userId = validateUuid(input.userId);
      const workspaceId =
        input.workspaceId === undefined ? undefined : validateUuid(input.workspaceId);
      return run(async (transaction) => {
        if (workspaceId !== undefined) {
          const workspace = await transaction.getWorkspace(context.organizationId, workspaceId);
          if (workspace === undefined) return notFound();
        }
        const roles = await transaction.resolveActiveRoles(
          context.organizationId,
          userId,
          workspaceId,
        );
        return [...new Set(roles)];
      });
    },
  };

  return Object.freeze(repository);
}

type DrizzleTransactionCallback = Parameters<TenancyDatabaseClient["db"]["transaction"]>[0];
type DrizzleTransaction = Parameters<DrizzleTransactionCallback>[0];

const requireRow = <T>(rows: readonly T[]): T =>
  rows[0] ??
  (() => {
    throw new TenancyError(TENANCY_ERROR_CODE.PERSISTENCE_FAILED);
  })();

const createDrizzleTransaction = (transaction: DrizzleTransaction): TenancyTransaction => ({
  async findOrganizationBootstrap(actorUserId, idempotencyKey) {
    const [organization] = await transaction
      .select()
      .from(organizations)
      .where(
        and(
          eq(organizations.createdByUserId, actorUserId),
          eq(organizations.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    if (organization === undefined) return undefined;
    const [membership] = await transaction
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, organization.id),
          eq(memberships.userId, actorUserId),
          isNull(memberships.workspaceId),
        ),
      )
      .limit(1);
    return membership === undefined ? undefined : { organization, membership };
  },
  async insertOrganization(input) {
    return requireRow(await transaction.insert(organizations).values(input).returning());
  },
  async insertMembership(input) {
    return requireRow(await transaction.insert(memberships).values(input).returning());
  },
  async getOrganization(organizationId) {
    const [organization] = await transaction
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    return organization;
  },
  async updateOrganization(organizationId, changes, expectedVersion) {
    const [organization] = await transaction
      .update(organizations)
      .set({ ...changes, updatedAt: new Date(), version: sql`${organizations.version} + 1` })
      .where(and(eq(organizations.id, organizationId), eq(organizations.version, expectedVersion)))
      .returning();
    return organization;
  },
  async findWorkspaceCreate(organizationId, actorUserId, idempotencyKey) {
    const [workspace] = await transaction
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.organizationId, organizationId),
          eq(workspaces.createdByUserId, actorUserId),
          eq(workspaces.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return workspace;
  },
  async insertWorkspace(input) {
    return requireRow(await transaction.insert(workspaces).values(input).returning());
  },
  async getWorkspace(organizationId, workspaceId) {
    const [workspace] = await transaction
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.organizationId, organizationId), eq(workspaces.id, workspaceId)))
      .limit(1);
    return workspace;
  },
  async listWorkspaces(organizationId, input) {
    const cursor = input.cursor;
    const cursorPredicate =
      cursor === undefined
        ? undefined
        : or(
            lt(workspaces.createdAt, cursor.createdAt),
            and(eq(workspaces.createdAt, cursor.createdAt), lt(workspaces.id, cursor.id)),
          );
    return transaction
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.organizationId, organizationId), cursorPredicate))
      .orderBy(desc(workspaces.createdAt), desc(workspaces.id))
      .limit(input.limit);
  },
  async updateWorkspace(organizationId, workspaceId, changes, expectedVersion) {
    const [workspace] = await transaction
      .update(workspaces)
      .set({ ...changes, updatedAt: new Date(), version: sql`${workspaces.version} + 1` })
      .where(
        and(
          eq(workspaces.organizationId, organizationId),
          eq(workspaces.id, workspaceId),
          eq(workspaces.version, expectedVersion),
        ),
      )
      .returning();
    return workspace;
  },
  async findMembershipCreate(organizationId, actorUserId, idempotencyKey) {
    const [membership] = await transaction
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, organizationId),
          eq(memberships.createdByUserId, actorUserId),
          eq(memberships.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return membership;
  },
  async getMembership(organizationId, membershipId) {
    const [membership] = await transaction
      .select()
      .from(memberships)
      .where(and(eq(memberships.organizationId, organizationId), eq(memberships.id, membershipId)))
      .limit(1);
    return membership;
  },
  async listMemberships(organizationId, input) {
    const cursor = input.cursor;
    const cursorPredicate =
      cursor === undefined
        ? undefined
        : or(
            lt(memberships.createdAt, cursor.createdAt),
            and(eq(memberships.createdAt, cursor.createdAt), lt(memberships.id, cursor.id)),
          );
    return transaction
      .select()
      .from(memberships)
      .where(and(eq(memberships.organizationId, organizationId), cursorPredicate))
      .orderBy(desc(memberships.createdAt), desc(memberships.id))
      .limit(input.limit);
  },
  async updateMembership(organizationId, membershipId, changes, expectedVersion) {
    const [membership] = await transaction
      .update(memberships)
      .set({ ...changes, updatedAt: new Date(), version: sql`${memberships.version} + 1` })
      .where(
        and(
          eq(memberships.organizationId, organizationId),
          eq(memberships.id, membershipId),
          eq(memberships.version, expectedVersion),
        ),
      )
      .returning();
    return membership;
  },
  async resolveActiveRoles(organizationId, userId, workspaceId) {
    const rows = await transaction
      .select({ role: memberships.role })
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, organizationId),
          eq(memberships.userId, userId),
          eq(memberships.status, "active"),
          isNull(memberships.deletedAt),
          workspaceId === undefined
            ? isNull(memberships.workspaceId)
            : or(isNull(memberships.workspaceId), eq(memberships.workspaceId, workspaceId)),
        ),
      );
    return rows.map(({ role }) => role);
  },
});

export function createDrizzleTenancyPersistence(client: TenancyDatabaseClient): TenancyPersistence {
  if (client === null || typeof client?.db?.transaction !== "function") invalidInput();
  return Object.freeze({
    transaction: <T>(operation: (transaction: TenancyTransaction) => Promise<T>): Promise<T> =>
      client.db.transaction((transaction) => operation(createDrizzleTransaction(transaction))),
  });
}
