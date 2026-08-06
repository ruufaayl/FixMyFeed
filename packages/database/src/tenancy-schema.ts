/** Organizations, workspaces, and memberships physical schema (task T012). */
import { ROLES, type Role } from "@fixmyfeed/domain";
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { auditTimestamps, primaryId, recordVersion } from "./columns.js";
import { users } from "./auth-schema.js";

export const ORGANIZATION_STATUS = ["active", "archived"] as const;
export const WORKSPACE_STATUS = ["active", "archived"] as const;
export const MEMBERSHIP_STATUS = ["active", "suspended", "revoked"] as const;
export const MEMBERSHIP_ROLE = ROLES;

export type OrganizationStatus = (typeof ORGANIZATION_STATUS)[number];
export type WorkspaceStatus = (typeof WORKSPACE_STATUS)[number];
export type MembershipStatus = (typeof MEMBERSHIP_STATUS)[number];

const enumList = (values: readonly string[]) =>
  sql.raw(values.map((value) => `'${value}'`).join(", "));

export const organizations = pgTable(
  "organizations",
  {
    id: primaryId(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status", { enum: ORGANIZATION_STATUS }).notNull().default("active"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...auditTimestamps(),
    version: recordVersion(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    check(
      "organizations_name_check",
      sql`char_length(${table.name}) between 1 and 200 and ${table.name} = btrim(${table.name})`,
    ),
    check(
      "organizations_slug_check",
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(${table.slug}) <= 100`,
    ),
    check("organizations_status_check", sql`${table.status} in (${enumList(ORGANIZATION_STATUS)})`),
    check(
      "organizations_idempotency_key_check",
      sql`char_length(${table.idempotencyKey}) between 1 and 200`,
    ),
    check("organizations_version_check", sql`${table.version} > 0`),
    uniqueIndex("organizations_slug_unique").on(table.slug),
    uniqueIndex("organizations_creator_idempotency_unique").on(
      table.createdByUserId,
      table.idempotencyKey,
    ),
    index("organizations_created_at_id_idx").on(table.createdAt.desc(), table.id.desc()),
  ],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status", { enum: WORKSPACE_STATUS }).notNull().default("active"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...auditTimestamps(),
    version: recordVersion(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    check(
      "workspaces_name_check",
      sql`char_length(${table.name}) between 1 and 200 and ${table.name} = btrim(${table.name})`,
    ),
    check(
      "workspaces_slug_check",
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(${table.slug}) <= 100`,
    ),
    check("workspaces_status_check", sql`${table.status} in (${enumList(WORKSPACE_STATUS)})`),
    check(
      "workspaces_idempotency_key_check",
      sql`char_length(${table.idempotencyKey}) between 1 and 200`,
    ),
    check("workspaces_version_check", sql`${table.version} > 0`),
    unique("workspaces_organization_id_id_unique").on(table.organizationId, table.id),
    uniqueIndex("workspaces_organization_slug_unique").on(table.organizationId, table.slug),
    uniqueIndex("workspaces_creator_idempotency_unique").on(
      table.organizationId,
      table.createdByUserId,
      table.idempotencyKey,
    ),
    index("workspaces_organization_created_at_id_idx").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    workspaceId: uuid("workspace_id"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: text("role", { enum: MEMBERSHIP_ROLE }).$type<Role>().notNull(),
    status: text("status", { enum: MEMBERSHIP_STATUS }).notNull().default("active"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...auditTimestamps(),
    version: recordVersion(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    check("memberships_role_check", sql`${table.role} in (${enumList(MEMBERSHIP_ROLE)})`),
    check("memberships_status_check", sql`${table.status} in (${enumList(MEMBERSHIP_STATUS)})`),
    check(
      "memberships_idempotency_key_check",
      sql`char_length(${table.idempotencyKey}) between 1 and 200`,
    ),
    check("memberships_version_check", sql`${table.version} > 0`),
    foreignKey({
      columns: [table.organizationId, table.workspaceId],
      foreignColumns: [workspaces.organizationId, workspaces.id],
    }).onDelete("restrict"),
    uniqueIndex("memberships_organization_user_unique")
      .on(table.organizationId, table.userId)
      .where(sql`${table.workspaceId} is null and ${table.deletedAt} is null`),
    uniqueIndex("memberships_workspace_user_unique")
      .on(table.organizationId, table.workspaceId, table.userId)
      .where(sql`${table.workspaceId} is not null and ${table.deletedAt} is null`),
    uniqueIndex("memberships_creator_idempotency_unique").on(
      table.organizationId,
      table.createdByUserId,
      table.idempotencyKey,
    ),
    index("memberships_organization_created_at_id_idx").on(
      table.organizationId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
