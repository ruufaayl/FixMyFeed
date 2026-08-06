/**
 * Generic tenant-aware repository framework (task T020).
 *
 * A reusable base that every organization-owned business entity repository
 * builds on. It enforces the repository invariants defined by the multi-tenant
 * and data-plane architecture on *every* operation:
 *
 *   - Tenant isolation: reads, updates, and deletes are always scoped to the
 *     caller's `organization_id`; an entity from another tenant is invisible
 *     and unmodifiable (deny by default; never inferred).
 *   - Optimistic concurrency: mutations require the expected `version`.
 *   - Soft delete: `deleted_at` rows are excluded from reads by default.
 *   - Keyset pagination: bounded, stable `(created_at desc, id desc)` cursors —
 *     never an unbounded scan.
 *
 * The isolation logic lives here over a persistence *port* so it is unit
 * testable without a database; `createDrizzleTenantPersistence` (a later, thin
 * adapter) supplies the real SQL. Persistence adapters MUST honor the scope
 * they are given — this layer guarantees the scope is always present and valid.
 */
import { TenantRepositoryError, TENANT_REPOSITORY_ERROR_CODE } from "./tenant-repository-errors.js";

/** Identifies the tenant every operation is scoped to. */
export interface TenantScope {
  readonly organizationId: string;
}

/** The audited, versioned, soft-deletable shape shared by tenant-owned rows. */
export interface TenantOwnedRow {
  readonly id: string;
  readonly organizationId: string;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

export interface TenantListCursor {
  readonly createdAt: Date;
  readonly id: string;
}

export interface TenantListInput {
  readonly cursor?: TenantListCursor;
  readonly limit: number;
}

/** A list request after the repository has resolved and bounded the limit. */
export interface ResolvedTenantListInput {
  readonly cursor?: TenantListCursor;
  readonly limit: number;
}

export interface TenantListPage<Row> {
  readonly items: readonly Row[];
  readonly nextCursor: TenantListCursor | undefined;
}

/**
 * The narrow persistence contract a repository needs. Every method receives the
 * already-validated scope; adapters MUST apply it to their WHERE clause.
 */
export interface TenantEntityPersistence<Row extends TenantOwnedRow, Insert> {
  insert(scope: TenantScope, values: Insert): Promise<Row>;
  findById(scope: TenantScope, id: string): Promise<Row | undefined>;
  list(scope: TenantScope, input: ResolvedTenantListInput): Promise<readonly Row[]>;
  update(
    scope: TenantScope,
    id: string,
    changes: Partial<Insert>,
    expectedVersion: number,
  ): Promise<Row | undefined>;
  softDelete(scope: TenantScope, id: string, expectedVersion: number): Promise<Row | undefined>;
}

export interface TenantRepository<Row extends TenantOwnedRow, Insert> {
  create(scope: TenantScope, values: Insert): Promise<Row>;
  get(scope: TenantScope, id: string): Promise<Row>;
  find(scope: TenantScope, id: string): Promise<Row | undefined>;
  list(scope: TenantScope, input: TenantListInput): Promise<TenantListPage<Row>>;
  update(
    scope: TenantScope,
    id: string,
    changes: Partial<Insert>,
    expectedVersion: number,
  ): Promise<Row>;
  softDelete(scope: TenantScope, id: string, expectedVersion: number): Promise<Row>;
}

export interface TenantRepositoryOptions {
  /** Maximum page size; requests above it are rejected. Default 100. */
  readonly maxLimit?: number;
  /** Default page size when a caller omits `limit`. Default 25. */
  readonly defaultLimit?: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates and narrows an untrusted value into a TenantScope. */
export function validateTenantScope(value: unknown): TenantScope {
  const organizationId = (value as { organizationId?: unknown } | null)?.organizationId;
  if (typeof organizationId !== "string" || !UUID_RE.test(organizationId)) {
    throw new TenantRepositoryError(
      "a valid organization scope is required",
      TENANT_REPOSITORY_ERROR_CODE.SCOPE_REQUIRED,
    );
  }
  return { organizationId };
}

function requireId(id: unknown): string {
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    throw new TenantRepositoryError(
      "a valid entity id is required",
      TENANT_REPOSITORY_ERROR_CODE.INVALID_INPUT,
    );
  }
  return id;
}

function requireVersion(version: unknown): number {
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new TenantRepositoryError(
      "expected version must be a positive integer",
      TENANT_REPOSITORY_ERROR_CODE.INVALID_INPUT,
    );
  }
  return version;
}

/**
 * Builds a tenant-aware repository over a persistence port. The repository
 * validates the scope on every call, resolves pagination bounds, and maps
 * "not found" / version conflicts to stable error codes — the persistence
 * layer never sees an unscoped or unbounded request.
 */
export function createTenantRepository<Row extends TenantOwnedRow, Insert>(
  entity: string,
  persistence: TenantEntityPersistence<Row, Insert>,
  options: TenantRepositoryOptions = {},
): TenantRepository<Row, Insert> {
  const maxLimit = options.maxLimit ?? 100;
  const defaultLimit = options.defaultLimit ?? 25;

  const resolveLimit = (limit: number | undefined): number => {
    const value = limit ?? defaultLimit;
    if (!Number.isInteger(value) || value < 1 || value > maxLimit) {
      throw new TenantRepositoryError(
        `limit must be an integer between 1 and ${maxLimit}`,
        TENANT_REPOSITORY_ERROR_CODE.INVALID_INPUT,
      );
    }
    return value;
  };

  const notFound = (): never => {
    throw new TenantRepositoryError(`${entity} not found`, TENANT_REPOSITORY_ERROR_CODE.NOT_FOUND);
  };

  return {
    async create(scope, values) {
      return persistence.insert(validateTenantScope(scope), values);
    },

    async find(scope, id) {
      return persistence.findById(validateTenantScope(scope), requireId(id));
    },

    async get(scope, id) {
      return (await this.find(scope, id)) ?? notFound();
    },

    async list(scope, input) {
      const validScope = validateTenantScope(scope);
      const limit = resolveLimit(input.limit);
      // Fetch one extra row to determine whether another page exists.
      const rows = await persistence.list(validScope, { cursor: input.cursor, limit: limit + 1 });
      const items = rows.slice(0, limit);
      const last = items.at(-1);
      const nextCursor =
        rows.length > limit && last !== undefined
          ? { createdAt: last.createdAt, id: last.id }
          : undefined;
      return { items, nextCursor };
    },

    async update(scope, id, changes, expectedVersion) {
      const updated = await persistence.update(
        validateTenantScope(scope),
        requireId(id),
        changes,
        requireVersion(expectedVersion),
      );
      if (updated === undefined) {
        throw new TenantRepositoryError(
          `${entity} was not updated: it does not exist in this tenant or the version is stale`,
          TENANT_REPOSITORY_ERROR_CODE.VERSION_CONFLICT,
        );
      }
      return updated;
    },

    async softDelete(scope, id, expectedVersion) {
      const deleted = await persistence.softDelete(
        validateTenantScope(scope),
        requireId(id),
        requireVersion(expectedVersion),
      );
      if (deleted === undefined) {
        throw new TenantRepositoryError(
          `${entity} was not deleted: it does not exist in this tenant or the version is stale`,
          TENANT_REPOSITORY_ERROR_CODE.VERSION_CONFLICT,
        );
      }
      return deleted;
    },
  };
}
