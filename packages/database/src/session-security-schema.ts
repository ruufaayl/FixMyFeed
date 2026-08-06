/**
 * Authentication-event and security-event physical schema (task T014).
 *
 * Append-oriented event tables for the identity/security domain:
 *  - `authentication_events` (identity-and-tenancy): sign-in/out, MFA, and
 *    session lifecycle events.
 *  - `security_events` (platform-operations): higher-level security signals
 *    with severity and a triage lifecycle.
 *
 * Both are tenant-scoped where an organization context exists (`organization_id`
 * nullable to allow pre-organization-selection auth events and system-actor
 * signals). Sensitive values are never stored in `payload` (redacted upstream);
 * see Data Requirements in the table specifications.
 */
import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { auditTimestamps, primaryId, recordVersion } from "./columns.js";
import { sessions, users } from "./auth-schema.js";
import { organizations } from "./tenancy-schema.js";

export const AUTHENTICATION_EVENT_TYPES = [
  "sign_in",
  "sign_out",
  "sign_in_failed",
  "mfa_challenged",
  "mfa_succeeded",
  "mfa_failed",
  "password_reset_requested",
  "password_changed",
  "session_revoked",
  "impersonation_started",
  "impersonation_ended",
] as const;

export const AUTHENTICATION_EVENT_OUTCOMES = ["success", "failure", "challenge"] as const;

export const SECURITY_EVENT_TYPES = [
  "suspicious_sign_in",
  "brute_force_detected",
  "rate_limit_tripped",
  "mfa_disabled",
  "permission_denied",
  "credential_rotation",
  "account_locked",
  "impersonation",
] as const;

export const SECURITY_EVENT_SEVERITIES = ["info", "low", "medium", "high", "critical"] as const;
export const SECURITY_EVENT_STATUSES = ["open", "acknowledged", "resolved", "dismissed"] as const;

export type AuthenticationEventType = (typeof AUTHENTICATION_EVENT_TYPES)[number];
export type AuthenticationEventOutcome = (typeof AUTHENTICATION_EVENT_OUTCOMES)[number];
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];
export type SecurityEventSeverity = (typeof SECURITY_EVENT_SEVERITIES)[number];
export type SecurityEventStatus = (typeof SECURITY_EVENT_STATUSES)[number];

const literals = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const authenticationEvents = pgTable(
  "authentication_events",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
    type: text("type", { enum: AUTHENTICATION_EVENT_TYPES })
      .$type<AuthenticationEventType>()
      .notNull(),
    outcome: text("outcome", { enum: AUTHENTICATION_EVENT_OUTCOMES })
      .$type<AuthenticationEventOutcome>()
      .notNull(),
    code: text("code"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    payload: jsonb("payload"),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check(
      "authentication_events_type_check",
      sql`${table.type} in (${literals(AUTHENTICATION_EVENT_TYPES)})`,
    ),
    check(
      "authentication_events_outcome_check",
      sql`${table.outcome} in (${literals(AUTHENTICATION_EVENT_OUTCOMES)})`,
    ),
    check("authentication_events_version_check", sql`${table.version} > 0`),
    index("authentication_events_organization_occurred_at_idx").on(
      table.organizationId,
      table.occurredAt.desc(),
    ),
    index("authentication_events_user_occurred_at_idx").on(table.userId, table.occurredAt.desc()),
    index("authentication_events_type_idx").on(table.type),
  ],
);

export const securityEvents = pgTable(
  "security_events",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type", { enum: SECURITY_EVENT_TYPES }).$type<SecurityEventType>().notNull(),
    severity: text("severity", { enum: SECURITY_EVENT_SEVERITIES })
      .$type<SecurityEventSeverity>()
      .notNull(),
    status: text("status", { enum: SECURITY_EVENT_STATUSES })
      .$type<SecurityEventStatus>()
      .notNull()
      .default("open"),
    code: text("code"),
    operationId: uuid("operation_id"),
    attemptCount: integer("attempt_count").notNull().default(0),
    ipAddress: text("ip_address"),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    payload: jsonb("payload"),
    ...auditTimestamps(),
    version: recordVersion(),
  },
  (table) => [
    check("security_events_type_check", sql`${table.type} in (${literals(SECURITY_EVENT_TYPES)})`),
    check(
      "security_events_severity_check",
      sql`${table.severity} in (${literals(SECURITY_EVENT_SEVERITIES)})`,
    ),
    check(
      "security_events_status_check",
      sql`${table.status} in (${literals(SECURITY_EVENT_STATUSES)})`,
    ),
    check("security_events_attempt_count_check", sql`${table.attemptCount} >= 0`),
    check("security_events_version_check", sql`${table.version} > 0`),
    index("security_events_organization_occurred_at_idx").on(
      table.organizationId,
      table.occurredAt.desc(),
    ),
    index("security_events_severity_status_idx").on(table.severity, table.status),
    index("security_events_type_idx").on(table.type),
  ],
);

export type AuthenticationEvent = typeof authenticationEvents.$inferSelect;
export type NewAuthenticationEvent = typeof authenticationEvents.$inferInsert;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type NewSecurityEvent = typeof securityEvents.$inferInsert;
