/**
 * Repair execution physical schema (task T094).
 *
 * `repair_executions` is one run of an approved plan against a connector — an
 * `apply` or a `rollback` — with its status and success/failure counts.
 * `repair_execution_items` is the per-change result (product/variant/field,
 * before/after, status, error) that makes partial success (T095) and rollback
 * (T096) precise. Both mutable (status transitions update rows).
 *
 * Kind/status values mirror the enums in @fixmyfeed/repairs (the database
 * package may not import repairs).
 */
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { repairPlans } from "./repair-schema.js";
import { auditTimestamps, primaryId, recordVersion } from "./columns.js";

/** Mirrors REPAIR_EXECUTION_KINDS in @fixmyfeed/repairs. */
export const REPAIR_EXECUTION_KINDS = ["apply", "rollback"] as const;
export type RepairExecutionKind = (typeof REPAIR_EXECUTION_KINDS)[number];

/** Mirrors REPAIR_EXECUTION_STATUSES in @fixmyfeed/repairs. */
export const REPAIR_EXECUTION_STATUSES = [
  "queued",
  "running",
  "completed",
  "partially_completed",
  "failed",
] as const;
export type RepairExecutionStatus = (typeof REPAIR_EXECUTION_STATUSES)[number];

/** Mirrors REPAIR_ITEM_STATUSES in @fixmyfeed/repairs. */
export const REPAIR_ITEM_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "skipped",
  "verified",
  "rolled_back",
] as const;
export type RepairItemStatus = (typeof REPAIR_ITEM_STATUSES)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const repairExecutions = pgTable(
  "repair_executions",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => repairPlans.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: REPAIR_EXECUTION_KINDS }).$type<RepairExecutionKind>().notNull(),
    /**
     * The prior execution this run recovers from: a retry re-applies its failed
     * items, a rollback reverses its verified items. Null for a first apply.
     */
    sourceExecutionId: uuid("source_execution_id"),
    /** Client-supplied dedup key; makes execution requests idempotent. */
    idempotencyKey: text("idempotency_key"),
    status: text("status", { enum: REPAIR_EXECUTION_STATUSES })
      .$type<RepairExecutionStatus>()
      .notNull()
      .default("queued"),
    totalItems: integer("total_items").notNull().default(0),
    succeededItems: integer("succeeded_items").notNull().default(0),
    failedItems: integer("failed_items").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check(
      "repair_executions_kind_check",
      sql`${table.kind} in (${literals(REPAIR_EXECUTION_KINDS)})`,
    ),
    check(
      "repair_executions_status_check",
      sql`${table.status} in (${literals(REPAIR_EXECUTION_STATUSES)})`,
    ),
    check("repair_executions_version_check", sql`${table.version} > 0`),
    index("repair_executions_plan_idx").on(table.planId),
    // One execution per (tenant, idempotency key); duplicate requests dedupe.
    uniqueIndex("repair_executions_org_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
  ],
);

export const repairExecutionItems = pgTable(
  "repair_execution_items",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => repairExecutions.id, { onDelete: "cascade" }),
    productExternalId: text("product_external_id").notNull(),
    variantExternalId: text("variant_external_id"),
    field: text("field").notNull(),
    beforeValue: text("before_value"),
    afterValue: text("after_value"),
    status: text("status", { enum: REPAIR_ITEM_STATUSES })
      .$type<RepairItemStatus>()
      .notNull()
      .default("pending"),
    error: text("error"),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check(
      "repair_execution_items_status_check",
      sql`${table.status} in (${literals(REPAIR_ITEM_STATUSES)})`,
    ),
    check("repair_execution_items_version_check", sql`${table.version} > 0`),
    index("repair_execution_items_execution_idx").on(table.executionId),
  ],
);

export type RepairExecutionRow = typeof repairExecutions.$inferSelect;
export type NewRepairExecutionRow = typeof repairExecutions.$inferInsert;
export type RepairExecutionItemRow = typeof repairExecutionItems.$inferSelect;
export type NewRepairExecutionItemRow = typeof repairExecutionItems.$inferInsert;
