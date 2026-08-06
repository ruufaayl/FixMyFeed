CREATE TABLE "authentication_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"session_id" uuid,
	"type" text NOT NULL,
	"outcome" text NOT NULL,
	"code" text,
	"ip_address" text,
	"user_agent" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "authentication_events_type_check" CHECK ("authentication_events"."type" in ('sign_in', 'sign_out', 'sign_in_failed', 'mfa_challenged', 'mfa_succeeded', 'mfa_failed', 'password_reset_requested', 'password_changed', 'session_revoked', 'impersonation_started', 'impersonation_ended')),
	CONSTRAINT "authentication_events_outcome_check" CHECK ("authentication_events"."outcome" in ('success', 'failure', 'challenge')),
	CONSTRAINT "authentication_events_version_check" CHECK ("authentication_events"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"code" text,
	"operation_id" uuid,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"ip_address" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "security_events_type_check" CHECK ("security_events"."type" in ('suspicious_sign_in', 'brute_force_detected', 'rate_limit_tripped', 'mfa_disabled', 'permission_denied', 'credential_rotation', 'account_locked', 'impersonation')),
	CONSTRAINT "security_events_severity_check" CHECK ("security_events"."severity" in ('info', 'low', 'medium', 'high', 'critical')),
	CONSTRAINT "security_events_status_check" CHECK ("security_events"."status" in ('open', 'acknowledged', 'resolved', 'dismissed')),
	CONSTRAINT "security_events_attempt_count_check" CHECK ("security_events"."attempt_count" >= 0),
	CONSTRAINT "security_events_version_check" CHECK ("security_events"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "active_organization_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "impersonated_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "mfa_satisfied" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "risk_level" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "session_family_id" uuid;--> statement-breakpoint
ALTER TABLE "authentication_events" ADD CONSTRAINT "authentication_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authentication_events" ADD CONSTRAINT "authentication_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authentication_events" ADD CONSTRAINT "authentication_events_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "authentication_events_organization_occurred_at_idx" ON "authentication_events" USING btree ("organization_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "authentication_events_user_occurred_at_idx" ON "authentication_events" USING btree ("user_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "authentication_events_type_idx" ON "authentication_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "security_events_organization_occurred_at_idx" ON "security_events" USING btree ("organization_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "security_events_severity_status_idx" ON "security_events" USING btree ("severity","status");--> statement-breakpoint
CREATE INDEX "security_events_type_idx" ON "security_events" USING btree ("type");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_impersonated_by_user_id_users_id_fk" FOREIGN KEY ("impersonated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_active_organization_id_idx" ON "sessions" USING btree ("active_organization_id");--> statement-breakpoint
CREATE INDEX "sessions_session_family_id_idx" ON "sessions" USING btree ("session_family_id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_risk_level_check" CHECK ("sessions"."risk_level" in ('normal', 'elevated', 'high'));