CREATE TABLE "catalog_discrepancies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"catalog_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"external_id" text NOT NULL,
	"matched_on" text,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_discrepancies_kind_check" CHECK ("catalog_discrepancies"."kind" in ('missing_downstream', 'extra_downstream', 'field_mismatch'))
);
--> statement-breakpoint
ALTER TABLE "catalog_discrepancies" ADD CONSTRAINT "catalog_discrepancies_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_discrepancies_catalog_run_idx" ON "catalog_discrepancies" USING btree ("catalog_id","run_id");--> statement-breakpoint
CREATE INDEX "catalog_discrepancies_org_catalog_idx" ON "catalog_discrepancies" USING btree ("organization_id","catalog_id");