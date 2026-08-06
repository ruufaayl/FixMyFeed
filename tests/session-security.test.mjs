/**
 * Sessions / MFA / security-events schema tests (task T014).
 *
 * Imports the built database package (`tsc -b` emits dist/ before tests run)
 * and validates the Drizzle schema shape plus the reviewed migration SQL, in
 * the same style as the T011/T012 schema tests. Pure Node.js (node:test);
 * no live database required.
 *
 * Traceability: sessions.md (T014 owns session extensions), authentication-
 * events.md, and platform-operations/security-events.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  authenticationEvents,
  securityEvents,
  sessions,
  SESSION_RISK_LEVELS,
  AUTHENTICATION_EVENT_TYPES,
  SECURITY_EVENT_SEVERITIES,
  SECURITY_EVENT_STATUSES,
} from "../packages/database/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");
const columnNames = (t) =>
  getTableConfig(t)
    .columns.map((c) => c.name)
    .sort();

test("sessions gains exactly the T014-owned extension columns", () => {
  const cols = new Set(columnNames(sessions));
  for (const added of [
    "active_organization_id",
    "impersonated_by_user_id",
    "mfa_satisfied",
    "risk_level",
    "session_family_id",
  ]) {
    assert.ok(cols.has(added), `sessions missing ${added}`);
  }
  // The T011 base columns remain intact.
  for (const base of ["id", "token", "expires_at", "user_id"]) {
    assert.ok(cols.has(base), `sessions lost base column ${base}`);
  }
  assert.deepEqual(SESSION_RISK_LEVELS, ["normal", "elevated", "high"]);
});

test("authentication_events table has the documented columns and is tenant-scoped-optional", () => {
  const config = getTableConfig(authenticationEvents);
  assert.equal(config.name, "authentication_events");
  const cols = new Set(config.columns.map((c) => c.name));
  for (const c of [
    "organization_id",
    "user_id",
    "session_id",
    "type",
    "outcome",
    "occurred_at",
    "payload",
  ]) {
    assert.ok(cols.has(c), `authentication_events missing ${c}`);
  }
  // organization_id and user_id are nullable (pre-org-selection / system actor).
  const org = config.columns.find((c) => c.name === "organization_id");
  assert.equal(org.notNull, false);
  assert.ok(AUTHENTICATION_EVENT_TYPES.includes("mfa_succeeded"));
});

test("security_events table carries severity, triage status, and attempt count", () => {
  const config = getTableConfig(securityEvents);
  assert.equal(config.name, "security_events");
  const cols = new Set(config.columns.map((c) => c.name));
  for (const c of ["type", "severity", "status", "attempt_count", "operation_id", "occurred_at"]) {
    assert.ok(cols.has(c), `security_events missing ${c}`);
  }
  assert.deepEqual(SECURITY_EVENT_SEVERITIES, ["info", "low", "medium", "high", "critical"]);
  assert.deepEqual(SECURITY_EVENT_STATUSES, ["open", "acknowledged", "resolved", "dismissed"]);
});

test("migration 0002 is additive: creates the two event tables, extends sessions, no destructive ops", () => {
  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0002_t014_sessions_mfa_security_events.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "authentication_events"/);
  assert.match(sql, /CREATE TABLE "security_events"/);
  assert.match(sql, /ALTER TABLE "sessions" ADD COLUMN "mfa_satisfied"/);
  assert.match(sql, /ALTER TABLE "sessions" ADD COLUMN "risk_level"/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  assert.doesNotMatch(sql, /DROP COLUMN/i);
  assert.doesNotMatch(sql, /TRUNCATE/i);
});

test("migration journal records the 0002 entry in order", () => {
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  const tags = journal.entries.map((e) => e.tag);
  assert.deepEqual(tags, [
    "0000_t011_better_auth",
    "0001_t012_organizations_workspaces_memberships",
    "0002_t014_sessions_mfa_security_events",
  ]);
});
