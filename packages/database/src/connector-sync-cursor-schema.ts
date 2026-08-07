/**
 * Connector sync cursor physical schema (task T034).
 *
 * `connector_sync_cursors` persists the incremental sync position for a tenant's
 * connector, per object type: which cursor model the provider uses, the current
 * cursor value (watermark / page token / opaque token), and the sync status. One
 * cursor per (organization, connector, object type).
 *
 * The cursor-model values mirror `CONNECTOR_CURSOR_MODELS` in
 * @fixmyfeed/connectors (the database package may not import connectors).
 */
import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { auditTimestamps, primaryId, recordVersion } from "./columns.js";

/** Mirrors CONNECTOR_CURSOR_MODELS in @fixmyfeed/connectors. */
export const SYNC_CURSOR_MODELS = ["none", "timestamp", "opaque", "page"] as const;
export type SyncCursorModel = (typeof SYNC_CURSOR_MODELS)[number];

export const SYNC_CURSOR_STATUSES = ["idle", "running", "error"] as const;
export type SyncCursorStatus = (typeof SYNC_CURSOR_STATUSES)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const connectorSyncCursors = pgTable(
  "connector_sync_cursors",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    connectorId: text("connector_id").notNull(),
    objectType: text("object_type").notNull(),
    cursorModel: text("cursor_model", { enum: SYNC_CURSOR_MODELS })
      .$type<SyncCursorModel>()
      .notNull(),
    /** Current position (ISO timestamp, page token, or opaque token); null before first sync. */
    cursorValue: text("cursor_value"),
    status: text("status", { enum: SYNC_CURSOR_STATUSES })
      .$type<SyncCursorStatus>()
      .notNull()
      .default("idle"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: "date" }),
    lastFullSyncAt: timestamp("last_full_sync_at", { withTimezone: true, mode: "date" }),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check(
      "connector_sync_cursors_model_check",
      sql`${table.cursorModel} in (${literals(SYNC_CURSOR_MODELS)})`,
    ),
    check(
      "connector_sync_cursors_status_check",
      sql`${table.status} in (${literals(SYNC_CURSOR_STATUSES)})`,
    ),
    check("connector_sync_cursors_version_check", sql`${table.version} > 0`),
    // One cursor per object type per connector per tenant.
    uniqueIndex("connector_sync_cursors_org_connector_object_unique").on(
      table.organizationId,
      table.connectorId,
      table.objectType,
    ),
    index("connector_sync_cursors_org_connector_idx").on(table.organizationId, table.connectorId),
  ],
);

export type ConnectorSyncCursor = typeof connectorSyncCursors.$inferSelect;
export type NewConnectorSyncCursor = typeof connectorSyncCursors.$inferInsert;
