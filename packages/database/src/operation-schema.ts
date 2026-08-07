/**
 * Operation resource physical schema (task T025).
 *
 * An `operations` row is the durable, tenant-owned representation of a
 * long-running operation: the API creates it, returns it to the caller, and a
 * durable job advances it through its lifecycle (operations-api.md,
 * api-asynchronous-operations.md). The status vocabulary is the canonical
 * loading-state set (queued → running/retrying/blocked → a terminal state).
 */
import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { auditTimestamps, primaryId, recordVersion } from "./columns.js";

export const OPERATION_STATUSES = [
  "queued",
  "running",
  "retrying",
  "blocked",
  "completed",
  "partially_completed",
  "cancelled",
  "failed",
] as const;
export type OperationStatus = (typeof OPERATION_STATUSES)[number];

/** Terminal states: no further transitions are allowed. */
export const OPERATION_TERMINAL_STATUSES = [
  "completed",
  "partially_completed",
  "cancelled",
  "failed",
] as const;

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const operations = pgTable(
  "operations",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    operationType: text("operation_type").notNull(),
    status: text("status", { enum: OPERATION_STATUSES })
      .$type<OperationStatus>()
      .notNull()
      .default("queued"),
    /** 0–100 completion percentage, or null when not reported. */
    progress: integer("progress"),
    /** Optional reference to the resource this operation produces/affects. */
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    /** Result payload on success (redacted of secrets), or null. */
    result: jsonb("result"),
    /** Canonical error envelope on failure, or null. */
    error: jsonb("error"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check("operations_status_check", sql`${table.status} in (${literals(OPERATION_STATUSES)})`),
    check(
      "operations_progress_check",
      sql`${table.progress} is null or (${table.progress} >= 0 and ${table.progress} <= 100)`,
    ),
    check("operations_version_check", sql`${table.version} > 0`),
    // Tenant-scoped status board and keyset listing.
    index("operations_organization_status_idx").on(table.organizationId, table.status),
    index("operations_organization_created_at_idx").on(table.organizationId, table.createdAt),
  ],
);

export type Operation = typeof operations.$inferSelect;
export type NewOperation = typeof operations.$inferInsert;
