/**
 * Catalog reconciliation discrepancy physical schema (task T076).
 *
 * `catalog_discrepancies` is the append-only record of findings from a full
 * reconciliation pass — comparing a source-of-truth catalog against a downstream
 * / observed view (e.g. the persisted snapshot vs what Google received). Each row
 * is one discrepancy for one product, grouped by `run_id` (one reconciliation
 * pass). Immutable, like `catalog_snapshots`: no `updated_at` / `version`.
 *
 * Discrepancy-kind values mirror `DISCREPANCY_KINDS` in @fixmyfeed/diagnostics
 * (the database package may not import diagnostics).
 */
import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { catalogs } from "./catalog-schema.js";
import { createdAt, primaryId } from "./columns.js";

/** Mirrors DISCREPANCY_KINDS in @fixmyfeed/diagnostics. */
export const DISCREPANCY_KINDS = [
  "missing_downstream",
  "extra_downstream",
  "field_mismatch",
] as const;
export type DiscrepancyKind = (typeof DISCREPANCY_KINDS)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const catalogDiscrepancies = pgTable(
  "catalog_discrepancies",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    catalogId: uuid("catalog_id")
      .notNull()
      .references(() => catalogs.id, { onDelete: "cascade" }),
    /** Groups every discrepancy from a single reconciliation pass. */
    runId: uuid("run_id").notNull(),
    kind: text("kind", { enum: DISCREPANCY_KINDS }).$type<DiscrepancyKind>().notNull(),
    /** Source external id (or downstream id for extra_downstream). */
    externalId: text("external_id").notNull(),
    /** Identity key the pair matched on (gtin/sku/id), null when unmatched. */
    matchedOn: text("matched_on"),
    /** For field_mismatch: the differing field names. */
    fields: jsonb("fields")
      .notNull()
      .default(sql`'[]'::jsonb`),
    detectedAt: timestamp("detected_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "catalog_discrepancies_kind_check",
      sql`${table.kind} in (${literals(DISCREPANCY_KINDS)})`,
    ),
    index("catalog_discrepancies_catalog_run_idx").on(table.catalogId, table.runId),
    index("catalog_discrepancies_org_catalog_idx").on(table.organizationId, table.catalogId),
  ],
);

export type CatalogDiscrepancyRow = typeof catalogDiscrepancies.$inferSelect;
export type NewCatalogDiscrepancy = typeof catalogDiscrepancies.$inferInsert;
