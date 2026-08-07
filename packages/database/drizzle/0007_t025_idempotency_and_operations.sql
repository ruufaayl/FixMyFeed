CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_method" text NOT NULL,
	"request_path" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"operation_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "idempotency_keys_status_check" CHECK ("idempotency_keys"."status" in ('pending', 'completed')),
	CONSTRAINT "idempotency_keys_version_check" CHECK ("idempotency_keys"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"operation_type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"progress" integer,
	"resource_type" text,
	"resource_id" text,
	"result" jsonb,
	"error" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "operations_status_check" CHECK ("operations"."status" in ('queued', 'running', 'retrying', 'blocked', 'completed', 'partially_completed', 'cancelled', 'failed')),
	CONSTRAINT "operations_progress_check" CHECK ("operations"."progress" is null or ("operations"."progress" >= 0 and "operations"."progress" <= 100)),
	CONSTRAINT "operations_version_check" CHECK ("operations"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_org_key_unique" ON "idempotency_keys" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "operations_organization_status_idx" ON "operations" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "operations_organization_created_at_idx" ON "operations" USING btree ("organization_id","created_at");