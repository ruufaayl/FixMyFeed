CREATE TABLE "connector_sync_cursors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"connector_id" text NOT NULL,
	"object_type" text NOT NULL,
	"cursor_model" text NOT NULL,
	"cursor_value" text,
	"status" text DEFAULT 'idle' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_full_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "connector_sync_cursors_model_check" CHECK ("connector_sync_cursors"."cursor_model" in ('none', 'timestamp', 'opaque', 'page')),
	CONSTRAINT "connector_sync_cursors_status_check" CHECK ("connector_sync_cursors"."status" in ('idle', 'running', 'error')),
	CONSTRAINT "connector_sync_cursors_version_check" CHECK ("connector_sync_cursors"."version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "connector_sync_cursors_org_connector_object_unique" ON "connector_sync_cursors" USING btree ("organization_id","connector_id","object_type");--> statement-breakpoint
CREATE INDEX "connector_sync_cursors_org_connector_idx" ON "connector_sync_cursors" USING btree ("organization_id","connector_id");