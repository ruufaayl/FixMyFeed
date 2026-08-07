CREATE TABLE "diagnostic_issues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"catalog_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"code" text NOT NULL,
	"severity" text NOT NULL,
	"product_external_id" text,
	"variant_external_id" text,
	"field" text,
	"message" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "diagnostic_issues_severity_check" CHECK ("diagnostic_issues"."severity" in ('critical', 'error', 'warning', 'info')),
	CONSTRAINT "diagnostic_issues_status_check" CHECK ("diagnostic_issues"."status" in ('open', 'resolved')),
	CONSTRAINT "diagnostic_issues_version_check" CHECK ("diagnostic_issues"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "diagnostic_issues" ADD CONSTRAINT "diagnostic_issues_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "diagnostic_issues_catalog_fingerprint_unique" ON "diagnostic_issues" USING btree ("catalog_id","fingerprint");--> statement-breakpoint
CREATE INDEX "diagnostic_issues_catalog_status_idx" ON "diagnostic_issues" USING btree ("catalog_id","status");