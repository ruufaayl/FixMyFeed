/**
 * Time-boxed support access grants physical schema (task T017).
 *
 * A `support_access_grants` row is a temporary, expiring overlay that lets an
 * internal support/administrator user act within a tenant organization — it is
 * NOT a permanent membership (authorization-matrix.md: "Support grants are
 * time-boxed overlays, not permanent memberships"). Granting requires the
 * `support-access:grant` permission (T013), and grant/activation/revocation are
 * recorded in the immutable audit log under the `support_access` category (T016).
 *
 * Grants are mutable (granted → active → expired/revoked) and use optimistic
 * concurrency (`version`); every read/write is organization-scoped.
 */
import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth-schema.js";
import { auditTimestamps, primaryId, recordVersion } from "./columns.js";
import { organizations } from "./tenancy-schema.js";

/** Grant lifecycle. `active` grants are only effective while unexpired and unrevoked. */
export const SUPPORT_ACCESS_STATUSES = ["active", "expired", "revoked"] as const;
/** Bounded capability scope of a grant (least privilege first). */
export const SUPPORT_ACCESS_SCOPES = ["read_only", "diagnostics", "full"] as const;

export type SupportAccessStatus = (typeof SUPPORT_ACCESS_STATUSES)[number];
export type SupportAccessScope = (typeof SUPPORT_ACCESS_SCOPES)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const supportAccessGrants = pgTable(
  "support_access_grants",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    supportUserId: uuid("support_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    grantedByUserId: uuid("granted_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    scope: text("scope", { enum: SUPPORT_ACCESS_SCOPES }).$type<SupportAccessScope>().notNull(),
    status: text("status", { enum: SUPPORT_ACCESS_STATUSES })
      .$type<SupportAccessStatus>()
      .notNull()
      .default("active"),
    grantedAt: timestamp("granted_at", { withTimezone: true, mode: "date" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    revokedByUserId: uuid("revoked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    code: text("code"),
    payload: jsonb("payload"),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check(
      "support_access_grants_status_check",
      sql`${table.status} in (${literals(SUPPORT_ACCESS_STATUSES)})`,
    ),
    check(
      "support_access_grants_scope_check",
      sql`${table.scope} in (${literals(SUPPORT_ACCESS_SCOPES)})`,
    ),
    check(
      "support_access_grants_reason_check",
      sql`char_length(${table.reason}) between 1 and 500`,
    ),
    check("support_access_grants_window_check", sql`${table.expiresAt} > ${table.grantedAt}`),
    check("support_access_grants_version_check", sql`${table.version} > 0`),
    index("support_access_grants_organization_expires_at_idx").on(
      table.organizationId,
      table.expiresAt.desc(),
    ),
    index("support_access_grants_support_user_idx").on(table.supportUserId),
    index("support_access_grants_status_expires_at_idx").on(table.status, table.expiresAt),
  ],
);

export type SupportAccessGrant = typeof supportAccessGrants.$inferSelect;
export type NewSupportAccessGrant = typeof supportAccessGrants.$inferInsert;
