CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"workspace_id" uuid,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "memberships_role_check" CHECK ("memberships"."role" in ('viewer', 'operator', 'manager', 'approver', 'administrator', 'security_administrator', 'billing_administrator', 'platform_operator')),
	CONSTRAINT "memberships_status_check" CHECK ("memberships"."status" in ('active', 'suspended', 'revoked')),
	CONSTRAINT "memberships_idempotency_key_check" CHECK (char_length("memberships"."idempotency_key") between 1 and 200),
	CONSTRAINT "memberships_version_check" CHECK ("memberships"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "organizations_name_check" CHECK (char_length("organizations"."name") between 1 and 200 and "organizations"."name" = btrim("organizations"."name")),
	CONSTRAINT "organizations_slug_check" CHECK ("organizations"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length("organizations"."slug") <= 100),
	CONSTRAINT "organizations_status_check" CHECK ("organizations"."status" in ('active', 'archived')),
	CONSTRAINT "organizations_idempotency_key_check" CHECK (char_length("organizations"."idempotency_key") between 1 and 200),
	CONSTRAINT "organizations_version_check" CHECK ("organizations"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "workspaces_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "workspaces_name_check" CHECK (char_length("workspaces"."name") between 1 and 200 and "workspaces"."name" = btrim("workspaces"."name")),
	CONSTRAINT "workspaces_slug_check" CHECK ("workspaces"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length("workspaces"."slug") <= 100),
	CONSTRAINT "workspaces_status_check" CHECK ("workspaces"."status" in ('active', 'archived')),
	CONSTRAINT "workspaces_idempotency_key_check" CHECK (char_length("workspaces"."idempotency_key") between 1 and 200),
	CONSTRAINT "workspaces_version_check" CHECK ("workspaces"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_workspace_id_workspaces_organization_id_id_fk" FOREIGN KEY ("organization_id","workspace_id") REFERENCES "public"."workspaces"("organization_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_organization_user_unique" ON "memberships" USING btree ("organization_id","user_id") WHERE "memberships"."workspace_id" is null and "memberships"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_workspace_user_unique" ON "memberships" USING btree ("organization_id","workspace_id","user_id") WHERE "memberships"."workspace_id" is not null and "memberships"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_creator_idempotency_unique" ON "memberships" USING btree ("organization_id","created_by_user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "memberships_organization_created_at_id_idx" ON "memberships" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_creator_idempotency_unique" ON "organizations" USING btree ("created_by_user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "organizations_created_at_id_idx" ON "organizations" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_organization_slug_unique" ON "workspaces" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_creator_idempotency_unique" ON "workspaces" USING btree ("organization_id","created_by_user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "workspaces_organization_created_at_id_idx" ON "workspaces" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);