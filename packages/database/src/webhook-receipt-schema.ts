/**
 * Webhook receipt physical schema (task T032).
 *
 * `webhook_receipts` records every verified inbound webhook so a redelivery is
 * processed at most once (deduplication). The dedup key is the provider's own
 * delivery id, unique per connector: a redelivery collides on
 * (connector_id, external_id) and is recognized as a duplicate rather than
 * reprocessed (webhook-security.md, webhook-receipts.md).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { auditTimestamps, primaryId, recordVersion } from "./columns.js";

export const WEBHOOK_RECEIPT_STATUSES = ["received", "processed", "failed", "duplicate"] as const;
export type WebhookReceiptStatus = (typeof WEBHOOK_RECEIPT_STATUSES)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const webhookReceipts = pgTable(
  "webhook_receipts",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").notNull(),
    connectorId: text("connector_id").notNull(),
    /** Provider-side delivery/event id — the deduplication key. */
    externalId: text("external_id").notNull(),
    /** Provider event topic/type (e.g. "orders/create"). */
    topic: text("topic").notNull(),
    signatureValid: boolean("signature_valid").notNull().default(true),
    status: text("status", { enum: WEBHOOK_RECEIPT_STATUSES })
      .$type<WebhookReceiptStatus>()
      .notNull()
      .default("received"),
    /** Redacted headers/metadata for diagnostics (never secrets or full bodies). */
    metadata: jsonb("metadata"),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "date" }),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check(
      "webhook_receipts_status_check",
      sql`${table.status} in (${literals(WEBHOOK_RECEIPT_STATUSES)})`,
    ),
    check("webhook_receipts_version_check", sql`${table.version} > 0`),
    // Deduplication: one receipt per provider delivery id per connector.
    uniqueIndex("webhook_receipts_connector_external_unique").on(
      table.connectorId,
      table.externalId,
    ),
    index("webhook_receipts_org_received_at_idx").on(table.organizationId, table.receivedAt),
  ],
);

export type WebhookReceipt = typeof webhookReceipts.$inferSelect;
export type NewWebhookReceipt = typeof webhookReceipts.$inferInsert;
