CREATE TABLE "webhook_receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"connector_id" text NOT NULL,
	"external_id" text NOT NULL,
	"topic" text NOT NULL,
	"signature_valid" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"metadata" jsonb,
	"received_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "webhook_receipts_status_check" CHECK ("webhook_receipts"."status" in ('received', 'processed', 'failed', 'duplicate')),
	CONSTRAINT "webhook_receipts_version_check" CHECK ("webhook_receipts"."version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_receipts_connector_external_unique" ON "webhook_receipts" USING btree ("connector_id","external_id");--> statement-breakpoint
CREATE INDEX "webhook_receipts_org_received_at_idx" ON "webhook_receipts" USING btree ("organization_id","received_at");