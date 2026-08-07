/**
 * Repair rule physical schema (task T097).
 *
 * `repair_rules` stores a tenant's saved auto-remediation rules: a name, an
 * enabled flag, a priority, and a `definition` (a safe, declarative condition
 * expression + action — never executable code). The rule engine and its
 * validation live in @fixmyfeed/repairs (the database package may not import it).
 * Mutable (edited over time), so it keeps `updated_at` / `version`.
 */
import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { auditTimestamps, primaryId, recordVersion } from "./columns.js";

export const repairRules = pgTable(
  "repair_rules",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    /** Higher runs first when multiple rules match. */
    priority: integer("priority").notNull().default(0),
    /** Declarative RuleDefinition (conditions + action); never executable code. */
    definition: jsonb("definition").notNull(),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check("repair_rules_version_check", sql`${table.version} > 0`),
    index("repair_rules_org_enabled_priority_idx").on(
      table.organizationId,
      table.enabled,
      table.priority,
    ),
  ],
);

export type RepairRuleRow = typeof repairRules.$inferSelect;
export type NewRepairRuleRow = typeof repairRules.$inferInsert;
