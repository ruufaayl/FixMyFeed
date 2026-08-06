/** Official Better Auth persistence adapter, kept behind the database boundary. */
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import type { DatabaseClient } from "./client.js";
import { DatabaseConfigurationError } from "./errors.js";
import { authenticationVerifications, sessions, userIdentities, users } from "./auth-schema.js";
import { schema } from "./schema.js";

export const authAdapterSchema = {
  ...schema,
  user: users,
  account: userIdentities,
  session: sessions,
  verification: authenticationVerifications,
} as const;

export function createAuthDatabaseAdapter(
  client: DatabaseClient,
): ReturnType<typeof drizzleAdapter> {
  if (!client || typeof client !== "object" || !("db" in client)) {
    throw new DatabaseConfigurationError();
  }

  return drizzleAdapter(client.db, {
    provider: "pg",
    schema: authAdapterSchema,
    transaction: true,
  });
}

export type AuthDatabaseAdapter = ReturnType<typeof createAuthDatabaseAdapter>;
