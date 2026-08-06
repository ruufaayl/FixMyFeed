/** Drizzle schema aggregation point for approved physical tables. */
import { authenticationVerifications, sessions, userIdentities, users } from "./auth-schema.js";
import { memberships, organizations, workspaces } from "./tenancy-schema.js";

export { authenticationVerifications, sessions, userIdentities, users } from "./auth-schema.js";
export { memberships, organizations, workspaces } from "./tenancy-schema.js";

export const schema = {
  users,
  userIdentities,
  sessions,
  authenticationVerifications,
  organizations,
  workspaces,
  memberships,
} as const;
