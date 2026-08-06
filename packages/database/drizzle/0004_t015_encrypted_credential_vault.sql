CREATE TABLE "encrypted_credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"credential_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"algorithm" text DEFAULT 'aes-256-gcm' NOT NULL,
	"key_id" text NOT NULL,
	"nonce" "bytea" NOT NULL,
	"ciphertext" "bytea" NOT NULL,
	"auth_tag" "bytea" NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "encrypted_credentials_provider_check" CHECK ("encrypted_credentials"."provider" ~ '^[a-z][a-z0-9_-]{0,63}$'),
	CONSTRAINT "encrypted_credentials_type_check" CHECK ("encrypted_credentials"."credential_type" ~ '^[a-z][a-z0-9_-]{0,63}$'),
	CONSTRAINT "encrypted_credentials_status_check" CHECK ("encrypted_credentials"."status" in ('active', 'revoked')),
	CONSTRAINT "encrypted_credentials_algorithm_check" CHECK ("encrypted_credentials"."algorithm" = 'aes-256-gcm'),
	CONSTRAINT "encrypted_credentials_key_id_check" CHECK ("encrypted_credentials"."key_id" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "encrypted_credentials_nonce_check" CHECK (octet_length("encrypted_credentials"."nonce") = 12),
	CONSTRAINT "encrypted_credentials_ciphertext_check" CHECK (octet_length("encrypted_credentials"."ciphertext") between 1 and 65536),
	CONSTRAINT "encrypted_credentials_auth_tag_check" CHECK (octet_length("encrypted_credentials"."auth_tag") = 16),
	CONSTRAINT "encrypted_credentials_idempotency_key_check" CHECK (char_length("encrypted_credentials"."idempotency_key") between 1 and 200),
	CONSTRAINT "encrypted_credentials_revocation_check" CHECK (("encrypted_credentials"."status" = 'revoked') = ("encrypted_credentials"."revoked_at" is not null)),
	CONSTRAINT "encrypted_credentials_version_check" CHECK ("encrypted_credentials"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "encrypted_credentials" ADD CONSTRAINT "encrypted_credentials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encrypted_credentials" ADD CONSTRAINT "encrypted_credentials_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "encrypted_credentials_tenant_actor_idempotency_unique" ON "encrypted_credentials" USING btree ("organization_id","created_by_user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "encrypted_credentials_tenant_created_idx" ON "encrypted_credentials" USING btree ("organization_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "encrypted_credentials_tenant_provider_status_idx" ON "encrypted_credentials" USING btree ("organization_id","provider","status");