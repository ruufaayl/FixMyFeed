/**
 * Backup/restore automation documentation hook tests (task T027).
 *
 * Exercises the pure manifest validator directly and confirms the real
 * ops/backup-restore/manifest.json passes. Pure Node.js — no services.
 *
 * Traceability: docs/07-data-architecture/backup-and-restore.md,
 * docs/20-devops-sre-and-platform-engineering/{backup-policy,restore-policy}.md,
 * docs/04-system-architecture/disaster-recovery-architecture.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseManifest,
  validateManifest,
  REQUIRED_TARGET_KINDS,
  REQUIRED_VERIFICATIONS,
} from "../tools/backup-restore/manifest.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A minimal valid manifest used as the mutation base. */
const validManifest = () => ({
  version: "1.0.0",
  objectives: { rpoMinutes: 60, rtoMinutes: 240 },
  targets: [
    {
      id: "primary-postgres",
      kind: "database",
      schedule: "hourly",
      retentionDays: 30,
      encrypted: true,
    },
    {
      id: "object-storage",
      kind: "object-storage",
      schedule: "daily",
      retentionDays: 90,
      encrypted: true,
    },
  ],
  restore: {
    steps: ["provision", "restore-primary-postgres", "verify", "cutover"],
    verification: ["schema-smoke", "row-count-reconciliation", "audit-chain-integrity"],
  },
  runbook: "docs/runbook.md",
  drillCadenceDays: 90,
});

const codes = (issues) => issues.map((i) => i.code);

test("validateManifest: a well-formed manifest has no issues", () => {
  assert.deepEqual(validateManifest(validManifest(), { runbookExists: true }), []);
});

test("validateManifest: rejects RPO greater than RTO", () => {
  const m = validManifest();
  m.objectives = { rpoMinutes: 300, rtoMinutes: 240 };
  assert.ok(codes(validateManifest(m, { runbookExists: true })).includes("rpo_gt_rto"));
});

test("validateManifest: requires both database and object-storage targets", () => {
  const m = validManifest();
  m.targets = m.targets.filter((t) => t.kind !== "object-storage");
  assert.ok(codes(validateManifest(m, { runbookExists: true })).includes("target_kind_missing"));
  assert.deepEqual(REQUIRED_TARGET_KINDS, ["database", "object-storage"]);
});

test("validateManifest: requires every target to be encrypted", () => {
  const m = validManifest();
  m.targets[0].encrypted = false;
  assert.ok(codes(validateManifest(m, { runbookExists: true })).includes("target_encryption"));
});

test("validateManifest: rejects duplicate target ids and missing fields", () => {
  const m = validManifest();
  m.targets[1].id = "primary-postgres"; // duplicate
  m.targets[0].schedule = ""; // missing schedule
  m.targets[0].retentionDays = 0; // invalid retention
  const c = codes(validateManifest(m, { runbookExists: true }));
  assert.ok(c.includes("target_duplicate"));
  assert.ok(c.includes("target_schedule"));
  assert.ok(c.includes("target_retention"));
});

test("validateManifest: restore plan must have a verify step and required checks", () => {
  const m = validManifest();
  m.restore.steps = ["provision", "cutover"]; // no "verify"
  m.restore.verification = ["schema-smoke"]; // missing audit-chain-integrity
  const c = codes(validateManifest(m, { runbookExists: true }));
  assert.ok(c.includes("restore_verify_step"));
  assert.ok(c.includes("restore_verification_missing"));
  assert.ok(REQUIRED_VERIFICATIONS.includes("audit-chain-integrity"));
});

test("validateManifest: flags a missing runbook file", () => {
  assert.ok(
    codes(validateManifest(validManifest(), { runbookExists: false })).includes("runbook_missing"),
  );
});

test("validateManifest: non-object manifest is rejected", () => {
  assert.ok(codes(validateManifest(null, {})).includes("manifest_shape"));
});

test("the real ops/backup-restore/manifest.json is valid and its runbook exists", () => {
  const manifestPath = join(ROOT, "ops", "backup-restore", "manifest.json");
  const manifest = parseManifest(readFileSync(manifestPath, "utf8"));
  const runbookExists = existsSync(join(ROOT, manifest.runbook));
  assert.equal(runbookExists, true, "manifest.runbook must point to a real file");
  assert.deepEqual(validateManifest(manifest, { runbookExists }), []);
});
