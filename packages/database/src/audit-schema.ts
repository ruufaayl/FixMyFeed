/**
 * Immutable audit log physical schema (task T016).
 *
 * `audit_logs` is append-only and tamper-evident: each row carries a hash of
 * its canonical content chained to the previous row's hash (`prev_hash`), so
 * any later mutation or deletion is detectable by re-verifying the chain
 * (see audit-hash.ts). The table has no `updated_at`, `version`, or
 * `deleted_at` — audit records are never mutated or soft-deleted
 * (immutable-record-policy.md; auditability-policy.md).
 *
 * `organization_id` and `actor_user_id` are plain columns without foreign keys
 * so audit history survives deletion of the organization or user it describes.
 */
import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { createdAt, primaryId } from "./columns.js";

/** Audit action categories (immutable-record-policy.md: auth, authz changes, exports, repairs, rollbacks, support access). */
export const AUDIT_ACTION_CATEGORIES = [
  "authentication",
  "authorization_change",
  "data_export",
  "repair",
  "rollback",
  "support_access",
  "configuration_change",
  "credential_change",
] as const;

export const AUDIT_ACTOR_TYPES = ["user", "system", "support"] as const;
export const AUDIT_OUTCOMES = ["success", "failure"] as const;

export type AuditActionCategory = (typeof AUDIT_ACTION_CATEGORIES)[number];
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: primaryId(),
    organizationId: uuid("organization_id"),
    actorUserId: uuid("actor_user_id"),
    actorType: text("actor_type", { enum: AUDIT_ACTOR_TYPES }).$type<AuditActorType>().notNull(),
    action: text("action", { enum: AUDIT_ACTION_CATEGORIES })
      .$type<AuditActionCategory>()
      .notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    outcome: text("outcome", { enum: AUDIT_OUTCOMES }).$type<AuditOutcome>().notNull(),
    code: text("code"),
    operationId: uuid("operation_id"),
    payload: jsonb("payload"),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    // Tamper-evident hash chain (hex sha-256). prevHash is null for the genesis row.
    prevHash: text("prev_hash"),
    hash: text("hash").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "audit_logs_action_check",
      sql`${table.action} in (${literals(AUDIT_ACTION_CATEGORIES)})`,
    ),
    check(
      "audit_logs_actor_type_check",
      sql`${table.actorType} in (${literals(AUDIT_ACTOR_TYPES)})`,
    ),
    check("audit_logs_outcome_check", sql`${table.outcome} in (${literals(AUDIT_OUTCOMES)})`),
    check("audit_logs_hash_hex_check", sql`${table.hash} ~ '^[0-9a-f]{64}$'`),
    check(
      "audit_logs_prev_hash_hex_check",
      sql`${table.prevHash} is null or ${table.prevHash} ~ '^[0-9a-f]{64}$'`,
    ),
    index("audit_logs_organization_occurred_at_idx").on(
      table.organizationId,
      table.occurredAt.desc(),
    ),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_hash_idx").on(table.hash),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
