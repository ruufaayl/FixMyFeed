/**
 * Repair plan + approval physical schema (task T093).
 *
 * `repair_plans` is the durable, tenant-owned repair proposal for a catalog: its
 * status lifecycle, the change set (the T091 `RepairChange[]`), the proposer, the
 * plan risk level, and the baseline fingerprints captured for conflict detection
 * at execution time. `repair_approvals` records four-eyes decisions — one per
 * approver per plan. Mutable plan (lifecycle transitions update the row);
 * append-only approvals.
 *
 * Status/decision values mirror the enums in @fixmyfeed/repairs (the database
 * package may not import repairs).
 */
import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { catalogs } from "./catalog-schema.js";
import { auditTimestamps, createdAt, primaryId, recordVersion } from "./columns.js";

/** Mirrors REPAIR_PLAN_STATUSES in @fixmyfeed/repairs. */
export const REPAIR_PLAN_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "executing",
  "completed",
  "partially_completed",
  "failed",
  "rolled_back",
] as const;
export type RepairPlanStatus = (typeof REPAIR_PLAN_STATUSES)[number];

/** Mirrors RISK_LEVELS in @fixmyfeed/repairs. */
export const REPAIR_RISK_LEVELS = ["low", "medium", "high"] as const;
export type RepairRiskLevel = (typeof REPAIR_RISK_LEVELS)[number];

/** Mirrors APPROVAL_DECISIONS in @fixmyfeed/repairs. */
export const REPAIR_APPROVAL_DECISIONS = ["approved", "rejected"] as const;
export type RepairApprovalDecision = (typeof REPAIR_APPROVAL_DECISIONS)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const repairPlans = pgTable(
  "repair_plans",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    catalogId: uuid("catalog_id")
      .notNull()
      .references(() => catalogs.id, { onDelete: "cascade" }),
    status: text("status", { enum: REPAIR_PLAN_STATUSES })
      .$type<RepairPlanStatus>()
      .notNull()
      .default("draft"),
    /** The proposed changes (T091 RepairChange[]). */
    changeSet: jsonb("change_set").notNull(),
    /** Who proposed the plan (never counts as an approver under four-eyes). */
    proposerId: uuid("proposer_id").notNull(),
    riskLevel: text("risk_level", { enum: REPAIR_RISK_LEVELS }).$type<RepairRiskLevel>().notNull(),
    /** productExternalId → fingerprint captured when the plan was generated. */
    baselineFingerprints: jsonb("baseline_fingerprints")
      .notNull()
      .default(sql`'{}'::jsonb`),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check("repair_plans_status_check", sql`${table.status} in (${literals(REPAIR_PLAN_STATUSES)})`),
    check("repair_plans_risk_check", sql`${table.riskLevel} in (${literals(REPAIR_RISK_LEVELS)})`),
    check("repair_plans_version_check", sql`${table.version} > 0`),
    index("repair_plans_org_catalog_status_idx").on(
      table.organizationId,
      table.catalogId,
      table.status,
    ),
  ],
);

export const repairApprovals = pgTable(
  "repair_approvals",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => repairPlans.id, { onDelete: "cascade" }),
    approverId: uuid("approver_id").notNull(),
    decision: text("decision", { enum: REPAIR_APPROVAL_DECISIONS })
      .$type<RepairApprovalDecision>()
      .notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "repair_approvals_decision_check",
      sql`${table.decision} in (${literals(REPAIR_APPROVAL_DECISIONS)})`,
    ),
    // One decision per approver per plan.
    uniqueIndex("repair_approvals_plan_approver_unique").on(table.planId, table.approverId),
    index("repair_approvals_plan_idx").on(table.planId),
  ],
);

export type RepairPlanRow = typeof repairPlans.$inferSelect;
export type NewRepairPlanRow = typeof repairPlans.$inferInsert;
export type RepairApprovalRow = typeof repairApprovals.$inferSelect;
export type NewRepairApprovalRow = typeof repairApprovals.$inferInsert;
