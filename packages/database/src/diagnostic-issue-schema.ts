/**
 * Diagnostic issue physical schema (task T085).
 *
 * `diagnostic_issues` is the durable, deduplicated record of validator findings
 * for a catalog, with a lifecycle: each issue is keyed by a stable `fingerprint`
 * (code + product + variant + field), carries `open` / `resolved` status, and
 * tracks `first_seen_at` / `last_seen_at` / `resolved_at` across successive scans.
 * Mutable (lifecycle transitions update the row), so it keeps `updated_at` /
 * `version`.
 *
 * Severity/status values mirror `ISSUE_SEVERITIES` / issue lifecycle in
 * @fixmyfeed/diagnostics (the database package may not import diagnostics).
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

import { catalogs } from "./catalog-schema.js";
import { auditTimestamps, primaryId, recordVersion } from "./columns.js";

/** Mirrors ISSUE_SEVERITIES in @fixmyfeed/diagnostics. */
export const ISSUE_SEVERITY_VALUES = ["critical", "error", "warning", "info"] as const;
export type IssueSeverityValue = (typeof ISSUE_SEVERITY_VALUES)[number];

export const DIAGNOSTIC_ISSUE_STATUSES = ["open", "resolved"] as const;
export type DiagnosticIssueStatus = (typeof DIAGNOSTIC_ISSUE_STATUSES)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const diagnosticIssues = pgTable(
  "diagnostic_issues",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    catalogId: uuid("catalog_id")
      .notNull()
      .references(() => catalogs.id, { onDelete: "cascade" }),
    /** Stable identity of the finding across scans (code + product + variant + field). */
    fingerprint: text("fingerprint").notNull(),
    code: text("code").notNull(),
    severity: text("severity", { enum: ISSUE_SEVERITY_VALUES })
      .$type<IssueSeverityValue>()
      .notNull(),
    productExternalId: text("product_external_id"),
    variantExternalId: text("variant_external_id"),
    field: text("field"),
    message: text("message").notNull(),
    evidence: jsonb("evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: text("status", { enum: DIAGNOSTIC_ISSUE_STATUSES })
      .$type<DiagnosticIssueStatus>()
      .notNull()
      .default("open"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true, mode: "date" }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check(
      "diagnostic_issues_severity_check",
      sql`${table.severity} in (${literals(ISSUE_SEVERITY_VALUES)})`,
    ),
    check(
      "diagnostic_issues_status_check",
      sql`${table.status} in (${literals(DIAGNOSTIC_ISSUE_STATUSES)})`,
    ),
    check("diagnostic_issues_version_check", sql`${table.version} > 0`),
    // One row per finding per catalog.
    uniqueIndex("diagnostic_issues_catalog_fingerprint_unique").on(
      table.catalogId,
      table.fingerprint,
    ),
    index("diagnostic_issues_catalog_status_idx").on(table.catalogId, table.status),
  ],
);

export type DiagnosticIssueRow = typeof diagnosticIssues.$inferSelect;
export type NewDiagnosticIssue = typeof diagnosticIssues.$inferInsert;
