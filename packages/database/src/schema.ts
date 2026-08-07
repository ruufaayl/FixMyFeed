/** Drizzle schema aggregation point for approved physical tables. */
import { authenticationVerifications, sessions, userIdentities, users } from "./auth-schema.js";
import { memberships, organizations, workspaces } from "./tenancy-schema.js";
import { authenticationEvents, securityEvents } from "./session-security-schema.js";
import { auditLogs } from "./audit-schema.js";
import { encryptedCredentials } from "./credential-vault-schema.js";
import { supportAccessGrants } from "./support-access-schema.js";
import { inboxEvents, outboxEvents } from "./outbox-schema.js";
import { operations } from "./operation-schema.js";
import { idempotencyKeys } from "./idempotency-schema.js";
import { oauthConnections } from "./oauth-connection-schema.js";
import { webhookReceipts } from "./webhook-receipt-schema.js";
import { connectorSyncCursors } from "./connector-sync-cursor-schema.js";
import { catalogs, catalogProducts, catalogSnapshots } from "./catalog-schema.js";
import { catalogDiscrepancies } from "./reconciliation-schema.js";
import { diagnosticIssues } from "./diagnostic-issue-schema.js";
import { repairPlans, repairApprovals } from "./repair-schema.js";
import { repairExecutions, repairExecutionItems } from "./repair-execution-schema.js";
import { repairRules } from "./repair-rule-schema.js";

export { authenticationVerifications, sessions, userIdentities, users } from "./auth-schema.js";
export { memberships, organizations, workspaces } from "./tenancy-schema.js";
export { authenticationEvents, securityEvents } from "./session-security-schema.js";
export { auditLogs } from "./audit-schema.js";
export { encryptedCredentials } from "./credential-vault-schema.js";
export { supportAccessGrants } from "./support-access-schema.js";
export { inboxEvents, outboxEvents } from "./outbox-schema.js";
export { operations } from "./operation-schema.js";
export { idempotencyKeys } from "./idempotency-schema.js";
export { oauthConnections } from "./oauth-connection-schema.js";
export { webhookReceipts } from "./webhook-receipt-schema.js";
export { connectorSyncCursors } from "./connector-sync-cursor-schema.js";
export { catalogs, catalogProducts, catalogSnapshots } from "./catalog-schema.js";
export { catalogDiscrepancies } from "./reconciliation-schema.js";
export { diagnosticIssues } from "./diagnostic-issue-schema.js";
export { repairPlans, repairApprovals } from "./repair-schema.js";
export { repairExecutions, repairExecutionItems } from "./repair-execution-schema.js";
export { repairRules } from "./repair-rule-schema.js";

export const schema = {
  users,
  userIdentities,
  sessions,
  authenticationVerifications,
  organizations,
  workspaces,
  memberships,
  authenticationEvents,
  securityEvents,
  auditLogs,
  encryptedCredentials,
  supportAccessGrants,
  outboxEvents,
  inboxEvents,
  operations,
  idempotencyKeys,
  oauthConnections,
  webhookReceipts,
  connectorSyncCursors,
  catalogs,
  catalogProducts,
  catalogSnapshots,
  catalogDiscrepancies,
  diagnosticIssues,
  repairPlans,
  repairApprovals,
  repairExecutions,
  repairExecutionItems,
  repairRules,
} as const;
