CREATE TABLE "repair_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"definition" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "repair_rules_version_check" CHECK ("repair_rules"."version" > 0)
);
--> statement-breakpoint
CREATE INDEX "repair_rules_org_enabled_priority_idx" ON "repair_rules" USING btree ("organization_id","enabled","priority");