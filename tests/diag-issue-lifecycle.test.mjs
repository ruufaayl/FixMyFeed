/**
 * Issue normalization / dedup / lifecycle tests (task T085).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { diagnosticIssues, DIAGNOSTIC_ISSUE_STATUSES } from "../packages/database/dist/index.js";
import {
  issueFingerprint,
  normalizeIssues,
  reconcileIssueLifecycle,
  toDiagnosticIssueRow,
} from "../packages/diagnostics/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");

const raw = (o = {}) => ({
  code: "missing_title",
  severity: "critical",
  productExternalId: "p1",
  variantExternalId: null,
  field: "title",
  message: "no title",
  ...o,
});

test("issueFingerprint: stable + distinguishes by code/product/variant/field", () => {
  const a = issueFingerprint(raw());
  assert.equal(a.length, 64);
  assert.equal(issueFingerprint(raw()), a);
  assert.notEqual(issueFingerprint(raw({ productExternalId: "p2" })), a);
  assert.notEqual(issueFingerprint(raw({ code: "missing_image" })), a);
});

test("normalizeIssues: dedupes identical findings, first wins", () => {
  const normalized = normalizeIssues([
    raw({ message: "first" }),
    raw({ message: "second" }), // same fingerprint
    raw({ productExternalId: "p2" }),
  ]);
  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].message, "first");
  assert.ok(normalized[0].fingerprint);
});

test("reconcileIssueLifecycle: opened / persisting / resolved", () => {
  const current = normalizeIssues([
    raw({ productExternalId: "p1" }), // was open -> persisting
    raw({ productExternalId: "p2" }), // new -> opened
  ]);
  const priorPersistingFp = issueFingerprint(raw({ productExternalId: "p1" }));
  const goneFp = issueFingerprint(raw({ productExternalId: "gone" }));
  const prior = [
    { fingerprint: priorPersistingFp, status: "open", firstSeenAt: new Date("2026-01-01") },
    { fingerprint: goneFp, status: "open", firstSeenAt: new Date("2026-01-01") },
  ];

  const result = reconcileIssueLifecycle(current, prior);
  assert.deepEqual(
    result.opened.map((i) => i.productExternalId),
    ["p2"],
  );
  assert.deepEqual(
    result.persisting.map((i) => i.productExternalId),
    ["p1"],
  );
  assert.deepEqual(result.resolvedFingerprints, [goneFp]);
});

test("toDiagnosticIssueRow: maps to insert row with timing + open status", () => {
  const [normalized] = normalizeIssues([raw({ evidence: { value: "" } })]);
  const row = toDiagnosticIssueRow("org-1", "cat-1", normalized, {
    firstSeenAt: new Date("2026-01-01T00:00:00Z"),
    lastSeenAt: new Date("2026-08-07T00:00:00Z"),
  });
  assert.equal(row.organizationId, "org-1");
  assert.equal(row.catalogId, "cat-1");
  assert.equal(row.fingerprint, normalized.fingerprint);
  assert.equal(row.code, "missing_title");
  assert.equal(row.severity, "critical");
  assert.equal(row.status, "open");
  assert.equal(row.resolvedAt, null);
  assert.deepEqual(row.evidence, { value: "" });
});

test("schema + migration: diagnostic_issues and migration 0013", () => {
  assert.deepEqual(DIAGNOSTIC_ISSUE_STATUSES, ["open", "resolved"]);
  const cols = new Set(getTableConfig(diagnosticIssues).columns.map((c) => c.name));
  for (const c of [
    "catalog_id",
    "fingerprint",
    "code",
    "severity",
    "status",
    "first_seen_at",
    "last_seen_at",
    "resolved_at",
  ]) {
    assert.ok(cols.has(c), `diagnostic_issues missing ${c}`);
  }
  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0013_t085_diagnostic_issues.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "diagnostic_issues"/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[13].tag, "0013_t085_diagnostic_issues");
});
