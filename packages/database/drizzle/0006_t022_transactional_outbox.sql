CREATE TABLE "inbox_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid,
	"event_id" uuid NOT NULL,
	"consumer" text NOT NULL,
	"consumed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"payload" jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "outbox_events_status_check" CHECK ("outbox_events"."status" in ('pending', 'published', 'failed', 'dead')),
	CONSTRAINT "outbox_events_attempt_count_check" CHECK ("outbox_events"."attempt_count" >= 0),
	CONSTRAINT "outbox_events_version_check" CHECK ("outbox_events"."version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_events_event_consumer_unique" ON "inbox_events" USING btree ("event_id","consumer");--> statement-breakpoint
CREATE INDEX "inbox_events_consumer_idx" ON "inbox_events" USING btree ("consumer");--> statement-breakpoint
CREATE INDEX "outbox_events_status_occurred_at_idx" ON "outbox_events" USING btree ("status","occurred_at");--> statement-breakpoint
CREATE INDEX "outbox_events_organization_idx" ON "outbox_events" USING btree ("organization_id");