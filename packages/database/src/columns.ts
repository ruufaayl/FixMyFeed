/** Reusable Drizzle column conventions for approved physical tables. */
import { integer, timestamp, uuid } from "drizzle-orm/pg-core";

import { createUuidV7 } from "./ids.js";

/** Stable primary identifier: application-generated UUIDv7. */
export const primaryId = () =>
  uuid("id")
    .primaryKey()
    .$defaultFn(() => createUuidV7());

/** Tenant ownership column required by every tenant-owned table. */
export const organizationId = () => uuid("organization_id").notNull();

/** UTC creation timestamp, set once on insert by PostgreSQL. */
export const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

/** UTC update timestamp, refreshed by the ORM on every mutation. */
export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Optimistic-concurrency token for mutable records. */
export const recordVersion = () => integer("version").notNull().default(1);

export const auditTimestamps = () => ({
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Base columns for a mutable global record. */
export const mutableRecordColumns = () => ({
  id: primaryId(),
  ...auditTimestamps(),
  version: recordVersion(),
});

/** Base columns for an organization-owned mutable record. */
export const tenantRecordColumns = () => ({
  id: primaryId(),
  organizationId: organizationId(),
  ...auditTimestamps(),
  version: recordVersion(),
});
