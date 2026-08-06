/** Tenant-aware repository contracts and trust-boundary validation (task T012). */
import { isRole, type Role } from "@fixmyfeed/domain";

import type { DatabaseClient } from "./client.js";
import { isUuidV7 } from "./ids.js";
import { TENANCY_ERROR_CODE, TenancyError, type TenancyErrorCode } from "./tenancy-errors.js";
import type {
  Membership,
  NewMembership,
  NewOrganization,
  Organization,
  Workspace,
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
}

export interface TenancyPersistence {
  transaction<T>(operation: (transaction: TenancyTransaction) => Promise<T>): Promise<T>;
}

export interface OrganizationBootstrapRepository {
  bootstrapOrganization(input: BootstrapOrganizationInput): Promise<OrganizationBootstrapResult>;
}

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

export function createTenancyRepository(
  persistence: TenancyPersistence,
  options: TenancyRepositoryOptions = {},
): OrganizationBootstrapRepository {
  if (persistence === null || typeof persistence?.transaction !== "function") invalidInput();

  return Object.freeze({
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
  });
}
