/** Drizzle schema aggregation point for approved physical tables. */
import { authenticationVerifications, sessions, userIdentities, users } from "./auth-schema.js";
import { memberships, organizations, workspaces } from "./tenancy-schema.js";
import { authenticationEvents, securityEvents } from "./session-security-schema.js";
import { auditLogs } from "./audit-schema.js";
import { encryptedCredentials } from "./credential-vault-schema.js";
import { supportAccessGrants } from "./support-access-schema.js";

export { authenticationVerifications, sessions, userIdentities, users } from "./auth-schema.js";
export { memberships, organizations, workspaces } from "./tenancy-schema.js";
export { authenticationEvents, securityEvents } from "./session-security-schema.js";
export { auditLogs } from "./audit-schema.js";
export { encryptedCredentials } from "./credential-vault-schema.js";
export { supportAccessGrants } from "./support-access-schema.js";

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
} as const;
