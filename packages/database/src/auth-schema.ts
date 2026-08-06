/** Better Auth core schema owned by task T011. */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, primaryId, updatedAt } from "./columns.js";

/**
 * Session security extensions owned by task T014 (sessions.md: "T011 MUST NOT
 * add organization selection, impersonation, MFA state, risk state, or
 * session-family state; T014 owns those extensions"). Kept in this file so they
 * remain columns on the single documented `sessions` table rather than an
 * undocumented side table.
 */
export const SESSION_RISK_LEVELS = ["normal", "elevated", "high"] as const;
export type SessionRiskLevel = (typeof SESSION_RISK_LEVELS)[number];

export const users = pgTable(
  "users",
  {
    id: primaryId(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const userIdentities = pgTable(
  "user_identities",
  {
    id: primaryId(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("user_identities_provider_account_unique").on(table.providerId, table.accountId),
    index("user_identities_user_id_idx").on(table.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: primaryId(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    token: text("token").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // T014 session security extensions.
    activeOrganizationId: uuid("active_organization_id"),
    impersonatedByUserId: uuid("impersonated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    mfaSatisfied: boolean("mfa_satisfied").notNull().default(false),
    riskLevel: text("risk_level", { enum: SESSION_RISK_LEVELS }).notNull().default("normal"),
    sessionFamilyId: uuid("session_family_id"),
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
    index("sessions_active_organization_id_idx").on(table.activeOrganizationId),
    index("sessions_session_family_id_idx").on(table.sessionFamilyId),
    check("sessions_risk_level_check", sql`${table.riskLevel} in ('normal', 'elevated', 'high')`),
  ],
);

export const authenticationVerifications = pgTable(
  "authentication_verifications",
  {
    id: primaryId(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("authentication_verifications_identifier_idx").on(table.identifier),
    index("authentication_verifications_expires_at_idx").on(table.expiresAt),
  ],
);
