CREATE TABLE "catalog_products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"catalog_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_products_version_check" CHECK ("catalog_products"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "catalog_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"catalog_id" uuid NOT NULL,
	"snapshot_hash" text NOT NULL,
	"product_count" integer NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_snapshots_count_check" CHECK ("catalog_snapshots"."product_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "catalogs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"connector_id" text NOT NULL,
	"external_account_id" text NOT NULL,
	"display_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "catalogs_status_check" CHECK ("catalogs"."status" in ('active', 'archived')),
	CONSTRAINT "catalogs_version_check" CHECK ("catalogs"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_snapshots" ADD CONSTRAINT "catalog_snapshots_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_products_catalog_external_unique" ON "catalog_products" USING btree ("catalog_id","external_id");--> statement-breakpoint
CREATE INDEX "catalog_products_org_catalog_idx" ON "catalog_products" USING btree ("organization_id","catalog_id");--> statement-breakpoint
CREATE INDEX "catalog_snapshots_catalog_captured_idx" ON "catalog_snapshots" USING btree ("catalog_id","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalogs_org_connector_account_unique" ON "catalogs" USING btree ("organization_id","connector_id","external_account_id");--> statement-breakpoint
CREATE INDEX "catalogs_org_idx" ON "catalogs" USING btree ("organization_id");