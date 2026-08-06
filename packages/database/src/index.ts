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
export { TENANCY_ERROR_CODE, TenancyError } from "./tenancy-errors.js";
export type { TenancyErrorCode } from "./tenancy-errors.js";
export {
  createDrizzleTenancyPersistence,
  createTenancyRepository,
  normalizeTenancyName,
  reportTenancyEvent,
  validateExpectedVersion,
  validateIdempotencyKey,
  validateMembershipRole,
  validateTenantContext,
  validateTenancyListInput,
  validateTenancySlug,
} from "./tenancy-repository.js";
export type {
  BootstrapMembershipRecord,
  BootstrapOrganizationRecord,
  BootstrapOrganizationInput,
  CreateMembershipInput,
  CreateWorkspaceInput,
  OrganizationBootstrapResult,
  OrganizationBootstrapRepository,
  OperationalTenancyRepository,
  TenantContext,
  TenancyDatabaseClient,
  TenancyEvent,
  TenancyListCursor,
  TenancyListInput,
  TenancyPersistence,
  TenancyRepository,
  TenancyRepositoryOptions,
  TenancyTransaction,
  UpdateMembershipInput,
  UpdateWorkspaceInput,
} from "./tenancy-repository.js";
export { authAdapterSchema, createAuthDatabaseAdapter } from "./auth-adapter.js";
export type { AuthDatabaseAdapter } from "./auth-adapter.js";
// T014 session security extensions and event tables.
export { SESSION_RISK_LEVELS } from "./auth-schema.js";
export type { SessionRiskLevel } from "./auth-schema.js";
export {
  AUTHENTICATION_EVENT_OUTCOMES,
  AUTHENTICATION_EVENT_TYPES,
  SECURITY_EVENT_SEVERITIES,
  SECURITY_EVENT_STATUSES,
  SECURITY_EVENT_TYPES,
  authenticationEvents,
  securityEvents,
} from "./session-security-schema.js";
export type {
  AuthenticationEvent,
  AuthenticationEventOutcome,
  AuthenticationEventType,
  NewAuthenticationEvent,
  NewSecurityEvent,
  SecurityEvent,
  SecurityEventSeverity,
  SecurityEventStatus,
  SecurityEventType,
} from "./session-security-schema.js";
