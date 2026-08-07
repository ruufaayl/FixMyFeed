CREATE TABLE "oauth_connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"connector_id" text NOT NULL,
	"external_account_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"credential_id" uuid,
	"expires_at" timestamp with time zone,
	"last_refreshed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "oauth_connections_status_check" CHECK ("oauth_connections"."status" in ('pending', 'active', 'expired', 'revoked')),
	CONSTRAINT "oauth_connections_version_check" CHECK ("oauth_connections"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_credential_id_encrypted_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."encrypted_credentials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_connections_org_connector_account_unique" ON "oauth_connections" USING btree ("organization_id","connector_id","external_account_id");--> statement-breakpoint
CREATE INDEX "oauth_connections_org_status_idx" ON "oauth_connections" USING btree ("organization_id","status");