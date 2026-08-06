/** Organization-owned encrypted provider credentials (task T015). */
import { sql } from "drizzle-orm";
import {
  check,
  customType,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth-schema.js";
import { auditTimestamps, primaryId, recordVersion } from "./columns.js";
import { organizations } from "./tenancy-schema.js";

export const CREDENTIAL_STATUSES = ["active", "revoked"] as const;
export const CREDENTIAL_ENCRYPTION_ALGORITHM = "aes-256-gcm" as const;

export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const encryptedCredentials = pgTable(
  "encrypted_credentials",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    credentialType: text("credential_type").notNull(),
    status: text("status", { enum: CREDENTIAL_STATUSES }).notNull().default("active"),
    algorithm: text("algorithm").notNull().default(CREDENTIAL_ENCRYPTION_ALGORITHM),
    keyId: text("key_id").notNull(),
    nonce: bytea("nonce").notNull(),
    ciphertext: bytea("ciphertext").notNull(),
    authTag: bytea("auth_tag").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check(
      "encrypted_credentials_provider_check",
      sql`${table.provider} ~ '^[a-z][a-z0-9_-]{0,63}$'`,
    ),
    check(
      "encrypted_credentials_type_check",
      sql`${table.credentialType} ~ '^[a-z][a-z0-9_-]{0,63}$'`,
    ),
    check("encrypted_credentials_status_check", sql`${table.status} in ('active', 'revoked')`),
    check("encrypted_credentials_algorithm_check", sql`${table.algorithm} = 'aes-256-gcm'`),
    check("encrypted_credentials_key_id_check", sql`${table.keyId} ~ '^[0-9a-f]{64}$'`),
    check("encrypted_credentials_nonce_check", sql`octet_length(${table.nonce}) = 12`),
    check(
      "encrypted_credentials_ciphertext_check",
      sql`octet_length(${table.ciphertext}) between 1 and 65536`,
    ),
    check("encrypted_credentials_auth_tag_check", sql`octet_length(${table.authTag}) = 16`),
    check(
      "encrypted_credentials_idempotency_key_check",
      sql`char_length(${table.idempotencyKey}) between 1 and 200`,
    ),
    check(
      "encrypted_credentials_revocation_check",
      sql`(${table.status} = 'revoked') = (${table.revokedAt} is not null)`,
    ),
    check("encrypted_credentials_version_check", sql`${table.version} > 0`),
    uniqueIndex("encrypted_credentials_tenant_actor_idempotency_unique").on(
      table.organizationId,
      table.createdByUserId,
      table.idempotencyKey,
    ),
    index("encrypted_credentials_tenant_created_idx").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("encrypted_credentials_tenant_provider_status_idx").on(
      table.organizationId,
      table.provider,
      table.status,
    ),
  ],
);

export type EncryptedCredential = typeof encryptedCredentials.$inferSelect;
export type NewEncryptedCredential = typeof encryptedCredentials.$inferInsert;
