/** Drizzle schema aggregation point for approved physical tables. */
import { authenticationVerifications, sessions, userIdentities, users } from "./auth-schema.js";

export { authenticationVerifications, sessions, userIdentities, users } from "./auth-schema.js";

export const schema = {
  users,
  userIdentities,
  sessions,
  authenticationVerifications,
} as const;
