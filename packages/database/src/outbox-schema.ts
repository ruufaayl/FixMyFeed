/**
 * Transactional outbox and inbox physical schema (task T022).
 *
 * `outbox_events` is written in the SAME transaction as the business mutation
 * that produced it, so an event is never lost and never published without its
 * mutation (event-driven-architecture.md). A relay later publishes pending rows
 * to durable queues and marks them published; exhausted rows go to `dead`.
 *
 * `inbox_events` records which events a named consumer has already processed,
 * giving idempotent (exactly-once-effect) consumption.
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

export const OUTBOX_STATUSES = ["pending", "published", "failed", "dead"] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: primaryId(),
    organizationId: uuid("organization_id"),
    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id"),
    status: text("status", { enum: OUTBOX_STATUSES })
      .$type<OutboxStatus>()
      .notNull()
      .default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    payload: jsonb("payload"),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check("outbox_events_status_check", sql`${table.status} in (${literals(OUTBOX_STATUSES)})`),
    check("outbox_events_attempt_count_check", sql`${table.attemptCount} >= 0`),
    check("outbox_events_version_check", sql`${table.version} > 0`),
    // Drives the relay: pending rows in occurrence order.
    index("outbox_events_status_occurred_at_idx").on(table.status, table.occurredAt),
    index("outbox_events_organization_idx").on(table.organizationId),
  ],
);

export const inboxEvents = pgTable(
  "inbox_events",
  {
    id: primaryId(),
    organizationId: uuid("organization_id"),
    eventId: uuid("event_id").notNull(),
    consumer: text("consumer").notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    // Idempotency: an event is processed at most once per consumer.
    uniqueIndex("inbox_events_event_consumer_unique").on(table.eventId, table.consumer),
    index("inbox_events_consumer_idx").on(table.consumer),
  ],
);

export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type NewOutboxEvent = typeof outboxEvents.$inferInsert;
export type InboxEvent = typeof inboxEvents.$inferSelect;
export type NewInboxEvent = typeof inboxEvents.$inferInsert;
