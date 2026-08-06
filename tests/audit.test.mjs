/**
 * Immutable audit logging tests (task T016).
 *
 * Imports the built database package (`tsc -b` emits dist/ before tests run).
 * Pure Node.js (node:test); the hash-chain logic needs no database.
 *
 * Traceability: immutable-record-policy.md, auditability-policy.md, and
 * platform-operations/audit-logs.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeAuditHash,
  verifyAuditChain,
  auditLogs,
  AUDIT_ACTION_CATEGORIES,
  AUDIT_ACTOR_TYPES,
  AUDIT_OUTCOMES,
} from "../packages/database/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");

const record = (overrides = {}) => ({
  id: "00000000-0000-7000-8000-000000000001",
  organizationId: "00000000-0000-7000-8000-0000000000aa",
  actorUserId: "00000000-0000-7000-8000-0000000000bb",
  actorType: "user",
  action: "authorization_change",
  resourceType: "membership",
  resourceId: "m1",
  outcome: "success",
  code: null,
  operationId: null,
  payload: { role: "manager" },
  occurredAt: new Date("2026-08-06T00:00:00.000Z"),
  ...overrides,
});

/** Builds a valid chain of n records with linked hashes. */
function buildChain(n) {
  const records = [];
  let prev = null;
  for (let i = 0; i < n; i++) {
    const base = record({ id: `00000000-0000-7000-8000-00000000000${i}`, resourceId: `r${i}` });
    const hash = computeAuditHash(base, prev);
    records.push({ ...base, prevHash: prev, hash });
    prev = hash;
  }
  return records;
}

test("computeAuditHash is deterministic and hex sha-256", () => {
  const a = computeAuditHash(record(), null);
  const b = computeAuditHash(record(), null);
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test("hash is order-independent over payload keys but sensitive to content and prevHash", () => {
  const same = computeAuditHash(record({ payload: { a: 1, b: 2 } }), null);
  const reordered = computeAuditHash(record({ payload: { b: 2, a: 1 } }), null);
  assert.equal(same, reordered, "payload key order must not change the hash");

  const changed = computeAuditHash(record({ outcome: "failure" }), null);
  assert.notEqual(same, changed, "content change must change the hash");

  const chained = computeAuditHash(record(), "a".repeat(64));
  assert.notEqual(computeAuditHash(record(), null), chained, "prevHash must change the hash");
});

test("verifyAuditChain accepts a well-formed chain", () => {
  const result = verifyAuditChain(buildChain(4));
  assert.equal(result.valid, true);
  assert.equal(result.brokenAt, -1);
});

test("verifyAuditChain detects a mutated record", () => {
  const chain = buildChain(4);
  const tampered = chain.map((r, i) => (i === 2 ? { ...r, outcome: "failure" } : r));
  const result = verifyAuditChain(tampered);
  assert.equal(result.valid, false);
  assert.equal(result.brokenAt, 2);
});

test("verifyAuditChain detects a deleted/reordered record via broken links", () => {
  const chain = buildChain(4);
  const withHole = [chain[0], chain[2], chain[3]]; // record 1 removed
  const result = verifyAuditChain(withHole);
  assert.equal(result.valid, false);
  assert.equal(result.brokenAt, 1);
});

test("audit_logs is append-only: no updated_at / version / deleted_at, has the hash chain", () => {
  const cols = new Set(getTableConfig(auditLogs).columns.map((c) => c.name));
  for (const c of [
    "id",
    "action",
    "actor_type",
    "outcome",
    "occurred_at",
    "hash",
    "prev_hash",
    "created_at",
  ]) {
    assert.ok(cols.has(c), `audit_logs missing ${c}`);
  }
  for (const forbidden of ["updated_at", "version", "deleted_at"]) {
    assert.ok(!cols.has(forbidden), `audit_logs must be immutable: unexpected ${forbidden}`);
  }
  assert.ok(AUDIT_ACTION_CATEGORIES.includes("support_access"));
  assert.deepEqual(AUDIT_ACTOR_TYPES, ["user", "system", "support"]);
  assert.deepEqual(AUDIT_OUTCOMES, ["success", "failure"]);
});

test("migration 0003 creates audit_logs, installs the immutability trigger, and is non-destructive", () => {
  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0003_t016_immutable_audit_logs.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "audit_logs"/);
  assert.match(sql, /CREATE TRIGGER "audit_logs_no_update_delete"/);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON "audit_logs"/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  assert.doesNotMatch(sql, /TRUNCATE/i);
});

test("migration journal records 0003 at its fixed index", () => {
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  // T016 owns migration 0003; verify it at its fixed index so later migrations
  // (0004+) do not break this test.
  const tags = journal.entries.map((e) => e.tag);
  assert.equal(tags[3], "0003_t016_immutable_audit_logs");
});
