CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid,
	"actor_user_id" uuid,
	"actor_type" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"outcome" text NOT NULL,
	"code" text,
	"operation_id" uuid,
	"payload" jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"prev_hash" text,
	"hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_action_check" CHECK ("audit_logs"."action" in ('authentication', 'authorization_change', 'data_export', 'repair', 'rollback', 'support_access', 'configuration_change', 'credential_change')),
	CONSTRAINT "audit_logs_actor_type_check" CHECK ("audit_logs"."actor_type" in ('user', 'system', 'support')),
	CONSTRAINT "audit_logs_outcome_check" CHECK ("audit_logs"."outcome" in ('success', 'failure')),
	CONSTRAINT "audit_logs_hash_hex_check" CHECK ("audit_logs"."hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "audit_logs_prev_hash_hex_check" CHECK ("audit_logs"."prev_hash" is null or "audit_logs"."prev_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE INDEX "audit_logs_organization_occurred_at_idx" ON "audit_logs" USING btree ("organization_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_hash_idx" ON "audit_logs" USING btree ("hash");--> statement-breakpoint
-- T016: enforce append-only immutability at the database layer. audit_logs
-- rows may be inserted but never updated or deleted (immutable-record-policy.md).
CREATE OR REPLACE FUNCTION "audit_logs_prevent_mutation"() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'audit_logs is append-only; % is not permitted', TG_OP USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "audit_logs_no_update_delete"
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION "audit_logs_prevent_mutation"();