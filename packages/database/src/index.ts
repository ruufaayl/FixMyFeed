/**
 * @fixmyfeed/database
 *
 * Tenant-aware repositories and the Drizzle/PostgreSQL access layer. The only package permitted to issue SQL.
 *
 * Boundary established by task T000 and implemented by task T010. Business
 * table definitions remain owned by their later implementation tasks.
 */
export const workspaceName = "@fixmyfeed/database" as const;
export const workspaceKind = "package" as const;

export {
  createDatabaseClient,
  createDatabaseClientFromConfig,
  validateDatabaseOptions,
} from "./client.js";
export type { DatabaseApplicationConfig, DatabaseClient, DatabaseClientOptions } from "./client.js";
export {
  DATABASE_ERROR_CODE,
  DatabaseConfigurationError,
  DatabaseMigrationError,
} from "./errors.js";
export { createUuidV7, isUuidV7 } from "./ids.js";
export {
  auditTimestamps,
  createdAt,
  mutableRecordColumns,
  organizationId,
  primaryId,
  recordVersion,
  tenantRecordColumns,
  updatedAt,
} from "./columns.js";
export { DEFAULT_MIGRATIONS_FOLDER, runDatabaseMigrations } from "./migrate.js";
export type { MigrationEvent, MigrationResult, RunDatabaseMigrationsOptions } from "./migrate.js";
export { schema } from "./schema.js";
export { authenticationVerifications, sessions, userIdentities, users } from "./auth-schema.js";
export {
  MEMBERSHIP_ROLE,
  MEMBERSHIP_STATUS,
  ORGANIZATION_STATUS,
  WORKSPACE_STATUS,
  memberships,
  organizations,
  workspaces,
} from "./tenancy-schema.js";
export type {
  Membership,
  MembershipStatus,
  NewMembership,
  NewOrganization,
  NewWorkspace,
  Organization,
  OrganizationStatus,
  Workspace,
  WorkspaceStatus,
} from "./tenancy-schema.js";
export { authAdapterSchema, createAuthDatabaseAdapter } from "./auth-adapter.js";
export type { AuthDatabaseAdapter } from "./auth-adapter.js";
