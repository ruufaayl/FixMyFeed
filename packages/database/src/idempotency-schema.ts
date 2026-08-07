/**
 * Idempotency-key physical schema (task T025).
 *
 * `idempotency_keys` lets a mutating API request be safely retried: the first
 * request records a pending row keyed by (organization_id, idempotency_key)
 * with a fingerprint of the request; on completion the response is stored; a
 * replay with the same key returns the stored response, and the same key with a
 * different request is a conflict (idempotency-strategy.md, api-idempotency.md).
 * Rows expire so keys can be reused after their retention window.
 */
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { auditTimestamps, primaryId, recordVersion } from "./columns.js";
import { operations } from "./operation-schema.js";

export const IDEMPOTENCY_STATUSES = ["pending", "completed"] as const;
export type IdempotencyStatus = (typeof IDEMPOTENCY_STATUSES)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    /** Client-supplied idempotency key (unique per tenant). */
    idempotencyKey: text("idempotency_key").notNull(),
    requestMethod: text("request_method").notNull(),
    requestPath: text("request_path").notNull(),
    /** Stable hash of the canonicalized request, to detect key reuse with a different request. */
    requestFingerprint: text("request_fingerprint").notNull(),
    status: text("status", { enum: IDEMPOTENCY_STATUSES })
      .$type<IdempotencyStatus>()
      .notNull()
      .default("pending"),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    /** Optional link to the long-running operation this request started. */
    operationId: uuid("operation_id").references(() => operations.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check(
      "idempotency_keys_status_check",
      sql`${table.status} in (${literals(IDEMPOTENCY_STATUSES)})`,
    ),
    check("idempotency_keys_version_check", sql`${table.version} > 0`),
    // One key per tenant.
    uniqueIndex("idempotency_keys_org_key_unique").on(table.organizationId, table.idempotencyKey),
    // Drives retention cleanup of expired keys.
    index("idempotency_keys_expires_at_idx").on(table.expiresAt),
  ],
);

export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKey = typeof idempotencyKeys.$inferInsert;
