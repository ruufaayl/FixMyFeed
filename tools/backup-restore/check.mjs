#!/usr/bin/env node
/**
 * Backup/restore automation documentation hook (task T027).
 *
 * A standing, deterministic CI gate — not a one-off audit — that keeps the
 * backup/restore automation manifest (ops/backup-restore/manifest.json) valid
 * and in sync with the human runbook and the data stores that actually exist in
 * the repo (the PostgreSQL database package and the object-storage package).
 * This is the "documentation hook": documentation and automation cannot drift
 * without failing CI (backup-and-restore.md, restore-policy.md,
 * disaster-recovery-architecture.md).
 *
 * Run with: node tools/backup-restore/check.mjs
 * Exits 1 and prints every issue if any check fails; exits 0 and prints a
 * summary otherwise.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseManifest, validateManifest, REQUIRED_TARGET_KINDS } from "./manifest.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFEST_PATH = join(ROOT, "ops", "backup-restore", "manifest.json");

function main() {
  const issues = [];

  if (!existsSync(MANIFEST_PATH)) {
    console.error(`✗ backup/restore manifest missing: ${MANIFEST_PATH}`);
    process.exit(1);
  }

  const manifest = parseManifest(readFileSync(MANIFEST_PATH, "utf8"));
  const runbookExists =
    typeof manifest.runbook === "string" && existsSync(join(ROOT, manifest.runbook));
  issues.push(...validateManifest(manifest, { runbookExists }));

  // Hook the manifest to reality: the data stores it claims to back up must
  // exist as packages in this repo, so a removed store can't be silently
  // dropped from the backup plan (or vice versa).
  const kinds = new Set((manifest.targets ?? []).map((t) => t?.kind));
  if (kinds.has("database") && !existsSync(join(ROOT, "packages", "database"))) {
    issues.push({
      code: "target_orphan",
      message: 'manifest declares a "database" target but packages/database is missing',
    });
  }
  if (kinds.has("object-storage") && !existsSync(join(ROOT, "packages", "storage"))) {
    issues.push({
      code: "target_orphan",
      message: 'manifest declares an "object-storage" target but packages/storage is missing',
    });
  }

  if (issues.length > 0) {
    console.error(`✗ backup/restore documentation hook found ${issues.length} issue(s):`);
    for (const issue of issues) {
      console.error(`  - [${issue.code}] ${issue.message}`);
    }
    process.exit(1);
  }

  const targetSummary = (manifest.targets ?? [])
    .map((t) => `${t.id}(${t.kind}, ${t.schedule}, ${t.retentionDays}d)`)
    .join(", ");
  console.log(
    `Backup/restore hook passed: ${manifest.targets.length} targets [${targetSummary}]; ` +
      `RPO ${manifest.objectives.rpoMinutes}m / RTO ${manifest.objectives.rtoMinutes}m; ` +
      `${REQUIRED_TARGET_KINDS.length} required kinds present; runbook and restore plan verified.`,
  );
}

main();
