CREATE TABLE "support_access_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"support_user_id" uuid NOT NULL,
	"granted_by_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"scope" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" uuid,
	"code" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "support_access_grants_status_check" CHECK ("support_access_grants"."status" in ('active', 'expired', 'revoked')),
	CONSTRAINT "support_access_grants_scope_check" CHECK ("support_access_grants"."scope" in ('read_only', 'diagnostics', 'full')),
	CONSTRAINT "support_access_grants_reason_check" CHECK (char_length("support_access_grants"."reason") between 1 and 500),
	CONSTRAINT "support_access_grants_window_check" CHECK ("support_access_grants"."expires_at" > "support_access_grants"."granted_at"),
	CONSTRAINT "support_access_grants_version_check" CHECK ("support_access_grants"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "support_access_grants" ADD CONSTRAINT "support_access_grants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_access_grants" ADD CONSTRAINT "support_access_grants_support_user_id_users_id_fk" FOREIGN KEY ("support_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_access_grants" ADD CONSTRAINT "support_access_grants_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_access_grants" ADD CONSTRAINT "support_access_grants_revoked_by_user_id_users_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_access_grants_organization_expires_at_idx" ON "support_access_grants" USING btree ("organization_id","expires_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "support_access_grants_support_user_idx" ON "support_access_grants" USING btree ("support_user_id");--> statement-breakpoint
CREATE INDEX "support_access_grants_status_expires_at_idx" ON "support_access_grants" USING btree ("status","expires_at");