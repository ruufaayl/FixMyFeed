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
// T016 immutable audit logging.
export {
  AUDIT_ACTION_CATEGORIES,
  AUDIT_ACTOR_TYPES,
  AUDIT_OUTCOMES,
  auditLogs,
} from "./audit-schema.js";
export type {
  AuditActionCategory,
  AuditActorType,
  AuditLog,
  AuditOutcome,
  NewAuditLog,
} from "./audit-schema.js";
export { computeAuditHash, verifyAuditChain } from "./audit-hash.js";
export type { AuditChainRecord, AuditChainVerification, AuditHashInput } from "./audit-hash.js";
// T015 application-managed encrypted credential vault.
export { createCredentialCipher } from "./credential-vault-crypto.js";
export type {
  CredentialCipher,
  CredentialCipherContext,
  CredentialCipherOptions,
  CredentialEnvelope,
  DecryptedCredential,
  DecryptCredentialInput,
  EncryptCredentialInput,
} from "./credential-vault-crypto.js";
export { CREDENTIAL_VAULT_ERROR_CODE, CredentialVaultError } from "./credential-vault-errors.js";
export type { CredentialVaultErrorCode } from "./credential-vault-errors.js";
export {
  CREDENTIAL_ENCRYPTION_ALGORITHM,
  CREDENTIAL_STATUSES,
  encryptedCredentials,
} from "./credential-vault-schema.js";
export type {
  CredentialStatus,
  EncryptedCredential,
  NewEncryptedCredential,
} from "./credential-vault-schema.js";
export {
  createCredentialVault,
  createCredentialVaultFromConfig,
  createDrizzleCredentialVaultPersistence,
} from "./credential-vault.js";
export type {
  CredentialReference,
  CredentialVault,
  CredentialVaultApplicationConfig,
  CredentialVaultDatabaseClient,
  CredentialVaultEvent,
  CredentialVaultMetadata,
  CredentialVaultOptions,
  CredentialVaultPersistence,
  CredentialVaultRecord,
  CredentialVaultRuntimeOptions,
  NewCredentialVaultRecord,
  RotateCredentialInput,
  RevokeCredentialInput,
  StoreCredentialInput,
} from "./credential-vault.js";
// T017 time-boxed support access grants.
export {
  SUPPORT_ACCESS_SCOPES,
  SUPPORT_ACCESS_STATUSES,
  supportAccessGrants,
} from "./support-access-schema.js";
export type {
  NewSupportAccessGrant,
  SupportAccessGrant,
  SupportAccessScope,
  SupportAccessStatus,
} from "./support-access-schema.js";
export {
  SUPPORT_ACCESS_ERROR_CODE,
  SupportAccessError,
  activeSupportScopes,
  deriveSupportGrantStatus,
  isSupportGrantActive,
  validateSupportGrantInput,
} from "./support-access.js";
export type {
  SupportAccessErrorCode,
  SupportGrantInput,
  SupportGrantState,
} from "./support-access.js";
// T020 generic tenant-aware repository framework.
export { createTenantRepository, validateTenantScope } from "./tenant-repository.js";
export type {
  TenantEntityPersistence,
  TenantListCursor,
  TenantListInput,
  TenantListPage,
  TenantOwnedRow,
  TenantRepository,
  TenantRepositoryOptions,
  TenantScope,
} from "./tenant-repository.js";
export { TENANT_REPOSITORY_ERROR_CODE, TenantRepositoryError } from "./tenant-repository-errors.js";
export type { TenantRepositoryErrorCode } from "./tenant-repository-errors.js";
// T022 transactional outbox and inbox.
export { OUTBOX_STATUSES, inboxEvents, outboxEvents } from "./outbox-schema.js";
export type {
  InboxEvent,
  NewInboxEvent,
  NewOutboxEvent,
  OutboxEvent,
  OutboxStatus,
} from "./outbox-schema.js";
export {
  OUTBOX_ERROR_CODE,
  OutboxError,
  consumeOnce,
  createOutboxEvent,
  createOutboxRelay,
} from "./outbox.js";
export type {
  InboxPersistence,
  NewOutboxEventInput,
  OutboxErrorCode,
  OutboxEventRecord,
  OutboxPublisher,
  OutboxRelay,
  OutboxRelayEvent,
  OutboxRelayOptions,
  OutboxRelayPersistence,
  OutboxRelayResult,
} from "./outbox.js";
// T025 operation resources and API idempotency.
export { OPERATION_STATUSES, OPERATION_TERMINAL_STATUSES, operations } from "./operation-schema.js";
export type { Operation, NewOperation, OperationStatus } from "./operation-schema.js";
export {
  OPERATION_ERROR_CODE,
  OperationError,
  createOperation,
  transitionOperation,
  canTransitionOperation,
  isTerminalOperationStatus,
} from "./operations.js";
export type {
  NewOperationInput,
  OperationRecord,
  OperationTransition,
  OperationErrorCode,
} from "./operations.js";
export { IDEMPOTENCY_STATUSES, idempotencyKeys } from "./idempotency-schema.js";
export type { IdempotencyKey, NewIdempotencyKey, IdempotencyStatus } from "./idempotency-schema.js";
export {
  IDEMPOTENCY_ERROR_CODE,
  DEFAULT_IDEMPOTENCY_TTL_MS,
  IdempotencyError,
  computeRequestFingerprint,
  createIdempotencyRecord,
  decideIdempotency,
  completeIdempotencyRecord,
} from "./idempotency.js";
export type {
  IdempotentRequest,
  IdempotencyRecord,
  IdempotencyRecordInput,
  IdempotencyDecision,
  IdempotencyErrorCode,
} from "./idempotency.js";
// T031 OAuth connection lifecycle.
export { OAUTH_CONNECTION_STATUSES, oauthConnections } from "./oauth-connection-schema.js";
export type {
  OAuthConnection,
  NewOAuthConnection,
  OAuthConnectionStatus,
} from "./oauth-connection-schema.js";
export {
  OAUTH_CONNECTION_ERROR_CODE,
  OAuthConnectionError,
  isTerminalConnectionStatus,
  canTransitionConnection,
  assertConnectionTransition,
  deriveConnectionStatus,
} from "./oauth-connection.js";
export type { OAuthConnectionErrorCode } from "./oauth-connection.js";
// T032 webhook receipt verification/deduplication.
export { WEBHOOK_RECEIPT_STATUSES, webhookReceipts } from "./webhook-receipt-schema.js";
export type {
  WebhookReceipt,
  NewWebhookReceipt,
  WebhookReceiptStatus,
} from "./webhook-receipt-schema.js";
export {
  WEBHOOK_RECEIPT_ERROR_CODE,
  WebhookReceiptError,
  createWebhookReceipt,
  decideWebhookReceipt,
  markWebhookReceipt,
} from "./webhook-receipt.js";
export type {
  NewWebhookReceiptInput,
  WebhookReceiptRecord,
  WebhookDedupDecision,
  WebhookReceiptErrorCode,
} from "./webhook-receipt.js";
// T034 connector sync cursors.
export {
  SYNC_CURSOR_MODELS,
  SYNC_CURSOR_STATUSES,
  connectorSyncCursors,
} from "./connector-sync-cursor-schema.js";
export type {
  ConnectorSyncCursor,
  NewConnectorSyncCursor,
  SyncCursorModel,
  SyncCursorStatus,
} from "./connector-sync-cursor-schema.js";
export {
  SYNC_CURSOR_ERROR_CODE,
  SyncCursorError,
  advanceCursor,
  needsFullSync,
} from "./connector-sync-cursor.js";
export type { SyncCursorErrorCode } from "./connector-sync-cursor.js";
// T073 normalized catalog and immutable snapshots.
export { CATALOG_STATUSES, catalogs, catalogProducts, catalogSnapshots } from "./catalog-schema.js";
export type {
  Catalog,
  NewCatalog,
  CatalogStatus,
  CatalogProductRow,
  NewCatalogProductRow,
  CatalogSnapshot,
  NewCatalogSnapshot,
} from "./catalog-schema.js";
export {
  catalogProductFingerprint,
  toCatalogProductRow,
  buildCatalogSnapshot,
  toCatalogSnapshotRow,
} from "./catalog.js";
export type { CatalogSnapshotResult } from "./catalog.js";
// T076 catalog reconciliation discrepancy records.
export { DISCREPANCY_KINDS, catalogDiscrepancies } from "./reconciliation-schema.js";
export type {
  DiscrepancyKind,
  CatalogDiscrepancyRow,
  NewCatalogDiscrepancy,
} from "./reconciliation-schema.js";
// T085 diagnostic issue records + lifecycle.
export {
  ISSUE_SEVERITY_VALUES,
  DIAGNOSTIC_ISSUE_STATUSES,
  diagnosticIssues,
} from "./diagnostic-issue-schema.js";
export type {
  IssueSeverityValue,
  DiagnosticIssueStatus,
  DiagnosticIssueRow,
  NewDiagnosticIssue,
} from "./diagnostic-issue-schema.js";
