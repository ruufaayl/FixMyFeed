CREATE TABLE "repair_approvals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"approver_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repair_approvals_decision_check" CHECK ("repair_approvals"."decision" in ('approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "repair_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"catalog_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"change_set" jsonb NOT NULL,
	"proposer_id" uuid NOT NULL,
	"risk_level" text NOT NULL,
	"baseline_fingerprints" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "repair_plans_status_check" CHECK ("repair_plans"."status" in ('draft', 'pending_approval', 'approved', 'rejected', 'executing', 'completed', 'partially_completed', 'failed', 'rolled_back')),
	CONSTRAINT "repair_plans_risk_check" CHECK ("repair_plans"."risk_level" in ('low', 'medium', 'high')),
	CONSTRAINT "repair_plans_version_check" CHECK ("repair_plans"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "repair_approvals" ADD CONSTRAINT "repair_approvals_plan_id_repair_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."repair_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_plans" ADD CONSTRAINT "repair_plans_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "repair_approvals_plan_approver_unique" ON "repair_approvals" USING btree ("plan_id","approver_id");--> statement-breakpoint
CREATE INDEX "repair_approvals_plan_idx" ON "repair_approvals" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "repair_plans_org_catalog_status_idx" ON "repair_plans" USING btree ("organization_id","catalog_id","status");