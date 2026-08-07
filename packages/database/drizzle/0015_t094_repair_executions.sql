CREATE TABLE "repair_execution_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"execution_id" uuid NOT NULL,
	"product_external_id" text NOT NULL,
	"variant_external_id" text,
	"field" text NOT NULL,
	"before_value" text,
	"after_value" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "repair_execution_items_status_check" CHECK ("repair_execution_items"."status" in ('pending', 'succeeded', 'failed', 'skipped', 'verified', 'rolled_back')),
	CONSTRAINT "repair_execution_items_version_check" CHECK ("repair_execution_items"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "repair_executions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"succeeded_items" integer DEFAULT 0 NOT NULL,
	"failed_items" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "repair_executions_kind_check" CHECK ("repair_executions"."kind" in ('apply', 'rollback')),
	CONSTRAINT "repair_executions_status_check" CHECK ("repair_executions"."status" in ('queued', 'running', 'completed', 'partially_completed', 'failed')),
	CONSTRAINT "repair_executions_version_check" CHECK ("repair_executions"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "repair_execution_items" ADD CONSTRAINT "repair_execution_items_execution_id_repair_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."repair_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_executions" ADD CONSTRAINT "repair_executions_plan_id_repair_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."repair_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "repair_execution_items_execution_idx" ON "repair_execution_items" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "repair_executions_plan_idx" ON "repair_executions" USING btree ("plan_id");