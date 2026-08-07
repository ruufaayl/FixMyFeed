/**
 * Normalized catalog and immutable snapshot physical schema (task T073).
 *
 * A `catalogs` row is a merchant's product catalog for one source (Shopify /
 * WooCommerce / uploaded feed). `catalog_products` holds the normalized products
 * (the domain `CatalogProduct` payload + a content fingerprint for change
 * detection). `catalog_snapshots` records immutable, point-in-time captures of a
 * catalog (a content hash + product count) so diagnostics and reconciliation can
 * compare against a fixed baseline (large-catalog-storage.md,
 * historical-snapshot-storage.md).
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

import { auditTimestamps, createdAt, primaryId, recordVersion } from "./columns.js";

export const CATALOG_STATUSES = ["active", "archived"] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const catalogs = pgTable(
  "catalogs",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    connectorId: text("connector_id").notNull(),
    /** Source account/store the catalog belongs to. */
    externalAccountId: text("external_account_id").notNull(),
    displayName: text("display_name"),
    status: text("status", { enum: CATALOG_STATUSES })
      .$type<CatalogStatus>()
      .notNull()
      .default("active"),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check("catalogs_status_check", sql`${table.status} in (${literals(CATALOG_STATUSES)})`),
    check("catalogs_version_check", sql`${table.version} > 0`),
    uniqueIndex("catalogs_org_connector_account_unique").on(
      table.organizationId,
      table.connectorId,
      table.externalAccountId,
    ),
    index("catalogs_org_idx").on(table.organizationId),
  ],
);

export const catalogProducts = pgTable(
  "catalog_products",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    catalogId: uuid("catalog_id")
      .notNull()
      .references(() => catalogs.id, { onDelete: "cascade" }),
    /** Stable source identifier for the product. */
    externalId: text("external_id").notNull(),
    /** Content fingerprint for change detection. */
    fingerprint: text("fingerprint").notNull(),
    /** The normalized CatalogProduct payload. */
    payload: jsonb("payload").notNull(),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check("catalog_products_version_check", sql`${table.version} > 0`),
    // One row per product per catalog.
    uniqueIndex("catalog_products_catalog_external_unique").on(table.catalogId, table.externalId),
    index("catalog_products_org_catalog_idx").on(table.organizationId, table.catalogId),
  ],
);

/**
 * Immutable, append-only capture of a catalog at a moment in time. No
 * `updated_at`/`version` — snapshots are never mutated.
 */
export const catalogSnapshots = pgTable(
  "catalog_snapshots",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    catalogId: uuid("catalog_id")
      .notNull()
      .references(() => catalogs.id, { onDelete: "cascade" }),
    /** Deterministic content hash of the whole catalog. */
    snapshotHash: text("snapshot_hash").notNull(),
    productCount: integer("product_count").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check("catalog_snapshots_count_check", sql`${table.productCount} >= 0`),
    index("catalog_snapshots_catalog_captured_idx").on(table.catalogId, table.capturedAt),
  ],
);

export type Catalog = typeof catalogs.$inferSelect;
export type NewCatalog = typeof catalogs.$inferInsert;
export type CatalogProductRow = typeof catalogProducts.$inferSelect;
export type NewCatalogProductRow = typeof catalogProducts.$inferInsert;
export type CatalogSnapshot = typeof catalogSnapshots.$inferSelect;
export type NewCatalogSnapshot = typeof catalogSnapshots.$inferInsert;
