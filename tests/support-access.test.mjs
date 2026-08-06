/**
 * Support access grants tests (task T017).
 *
 * Imports the built database package (`tsc -b` emits dist/ before tests run).
 * Pure Node.js (node:test); the grant lifecycle logic needs no database.
 *
 * Traceability: authorization-matrix.md (time-boxed overlays, not memberships),
 * privileged-access-management.md, support-tooling-architecture.md, and
 * platform-operations/support-access-grants.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  supportAccessGrants,
  isSupportGrantActive,
  deriveSupportGrantStatus,
  validateSupportGrantInput,
  activeSupportScopes,
  SupportAccessError,
  SUPPORT_ACCESS_SCOPES,
  SUPPORT_ACCESS_STATUSES,
} from "../packages/database/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");

const T0 = new Date("2026-08-06T00:00:00.000Z");
const hoursLater = (h) => new Date(T0.getTime() + h * 3600_000);

const grant = (overrides = {}) => ({
  status: "active",
  grantedAt: T0,
  expiresAt: hoursLater(4),
  revokedAt: null,
  ...overrides,
});

const validInput = (overrides = {}) => ({
  organizationId: "org-1",
  supportUserId: "support-1",
  grantedByUserId: "admin-1",
  reason: "investigating feed sync incident #42",
  scope: "read_only",
  grantedAt: T0,
  expiresAt: hoursLater(4),
  ...overrides,
});

test("catalog: scopes and statuses are closed and least-privilege ordered", () => {
  assert.deepEqual(SUPPORT_ACCESS_SCOPES, ["read_only", "diagnostics", "full"]);
  assert.deepEqual(SUPPORT_ACCESS_STATUSES, ["active", "expired", "revoked"]);
});

test("isSupportGrantActive: only active within the unexpired, unrevoked window", () => {
  assert.equal(isSupportGrantActive(grant(), hoursLater(2)), true);
  assert.equal(isSupportGrantActive(grant(), hoursLater(5)), false, "expired");
  assert.equal(isSupportGrantActive(grant(), new Date(T0.getTime() - 1)), false, "before start");
  assert.equal(
    isSupportGrantActive(grant({ revokedAt: hoursLater(1) }), hoursLater(2)),
    false,
    "revoked",
  );
  assert.equal(isSupportGrantActive(grant({ status: "revoked" }), hoursLater(2)), false);
  assert.equal(isSupportGrantActive(grant({ status: "expired" }), hoursLater(2)), false);
});

test("deriveSupportGrantStatus: clock and revocation drive the effective status", () => {
  assert.equal(deriveSupportGrantStatus(grant(), hoursLater(2)), "active");
  assert.equal(deriveSupportGrantStatus(grant(), hoursLater(5)), "expired");
  assert.equal(
    deriveSupportGrantStatus(grant({ revokedAt: hoursLater(1) }), hoursLater(2)),
    "revoked",
  );
});

test("validateSupportGrantInput: primary path accepts a well-formed grant", () => {
  assert.doesNotThrow(() => validateSupportGrantInput(validInput()));
});

test("validateSupportGrantInput: failure paths are rejected with SupportAccessError", () => {
  const cases = [
    validInput({ organizationId: "" }),
    validInput({ reason: "" }),
    validInput({ reason: "x".repeat(501) }),
    validInput({ scope: "superuser" }),
    validInput({ expiresAt: T0 }), // not after grantedAt
    validInput({ supportUserId: "same", grantedByUserId: "same" }), // self-grant
    validInput({ expiresAt: hoursLater(24 * 30) }), // exceeds max window
  ];
  for (const input of cases) {
    assert.throws(
      () => validateSupportGrantInput(input),
      (err) => {
        assert.ok(err instanceof SupportAccessError);
        assert.equal(err.code, "SUPPORT_ACCESS_INVALID_GRANT");
        return true;
      },
    );
  }
});

test("activeSupportScopes: returns scopes only from currently-effective grants", () => {
  const grants = [
    grant({ scope: "read_only" }),
    grant({ scope: "full", expiresAt: hoursLater(1) }), // expires early
    grant({ scope: "diagnostics", revokedAt: hoursLater(1) }), // revoked
  ];
  assert.deepEqual(activeSupportScopes(grants, hoursLater(2)), ["read_only"]);
});

test("support_access_grants table is tenant-scoped, time-boxed, and optimistically concurrent", () => {
  const config = getTableConfig(supportAccessGrants);
  assert.equal(config.name, "support_access_grants");
  const cols = new Set(config.columns.map((c) => c.name));
  for (const c of [
    "organization_id",
    "support_user_id",
    "granted_by_user_id",
    "reason",
    "scope",
    "status",
    "granted_at",
    "expires_at",
    "revoked_at",
    "version",
  ]) {
    assert.ok(cols.has(c), `support_access_grants missing ${c}`);
  }
  const org = config.columns.find((c) => c.name === "organization_id");
  assert.equal(org.notNull, true, "grants are tenant-scoped");
});

test("migration 0005 creates support_access_grants and is non-destructive", () => {
  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0005_t017_support_access_grants.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "support_access_grants"/);
  assert.match(sql, /"expires_at" > "support_access_grants"."granted_at"/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  assert.doesNotMatch(sql, /TRUNCATE/i);
});

test("migration journal records 0005 at its fixed index", () => {
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[5].tag, "0005_t017_support_access_grants");
});
