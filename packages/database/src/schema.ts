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
} as const;
