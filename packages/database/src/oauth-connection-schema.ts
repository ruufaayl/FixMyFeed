/**
 * OAuth connection physical schema (task T031).
 *
 * `oauth_connections` records a tenant's authorized connection to an external
 * provider account: which connector, which external account, the granted
 * scopes, the lifecycle status, token expiry, and a reference to the encrypted
 * token stored in the T015 credential vault (tokens are NEVER stored here in the
 * clear). One connection per (organization, connector, external account).
 */
import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { auditTimestamps, primaryId, recordVersion } from "./columns.js";
import { encryptedCredentials } from "./credential-vault-schema.js";

export const OAUTH_CONNECTION_STATUSES = ["pending", "active", "expired", "revoked"] as const;
export type OAuthConnectionStatus = (typeof OAUTH_CONNECTION_STATUSES)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const oauthConnections = pgTable(
  "oauth_connections",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    connectorId: text("connector_id").notNull(),
    /** Provider-side account identifier (shop domain, merchant id, …). */
    externalAccountId: text("external_account_id").notNull(),
    status: text("status", { enum: OAUTH_CONNECTION_STATUSES })
      .$type<OAuthConnectionStatus>()
      .notNull()
      .default("pending"),
    /** Granted scopes (normalized array). */
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    /** Reference to the vault-encrypted token; restrictive delete keeps the token alive. */
    credentialId: uuid("credential_id").references(() => encryptedCredentials.id, {
      onDelete: "restrict",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true, mode: "date" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check(
      "oauth_connections_status_check",
      sql`${table.status} in (${literals(OAUTH_CONNECTION_STATUSES)})`,
    ),
    check("oauth_connections_version_check", sql`${table.version} > 0`),
    // One connection per external account per tenant.
    uniqueIndex("oauth_connections_org_connector_account_unique").on(
      table.organizationId,
      table.connectorId,
      table.externalAccountId,
    ),
    index("oauth_connections_org_status_idx").on(table.organizationId, table.status),
  ],
);

export type OAuthConnection = typeof oauthConnections.$inferSelect;
export type NewOAuthConnection = typeof oauthConnections.$inferInsert;
