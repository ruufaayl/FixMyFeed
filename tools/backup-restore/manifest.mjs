/**
 * Backup/restore automation manifest — pure parser and validator (task T027).
 *
 * The manifest (ops/backup-restore/manifest.json) is the machine-checkable
 * declaration of the backup/restore automation plan: what is backed up, on what
 * cadence, with what retention and encryption, how a restore is performed and
 * verified, and where the human runbook lives. This module validates that
 * declaration so documentation and automation cannot silently drift
 * (backup-and-restore.md, restore-policy.md, disaster-recovery-architecture.md).
 *
 * Pure and deterministic: no filesystem or clock access. The CLI
 * (tools/backup-restore/check.mjs) reads the files and passes existence flags in.
 */

/** Data-store kinds that MUST have a backup target declared. */
export const REQUIRED_TARGET_KINDS = ["database", "object-storage"];

/** Restore verification checks that MUST be part of the plan. */
export const REQUIRED_VERIFICATIONS = ["schema-smoke", "audit-chain-integrity"];

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
const isPositiveInt = (value) => Number.isInteger(value) && value > 0;

/** Parses the manifest JSON. Throws a descriptive Error on malformed JSON. */
export function parseManifest(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`backup/restore manifest is not valid JSON: ${error.message}`);
  }
}

/**
 * Validates a parsed manifest, returning an array of `{ code, message }` issues
 * (empty when valid). `runbookExists` is supplied by the caller (the CLI reads
 * the filesystem) so this function stays pure.
 */
export function validateManifest(manifest, { runbookExists } = {}) {
  const issues = [];
  const add = (code, message) => issues.push({ code, message });

  if (manifest === null || typeof manifest !== "object") {
    add("manifest_shape", "manifest must be a JSON object");
    return issues;
  }

  if (!isNonEmptyString(manifest.version)) {
    add("version", "version must be a non-empty string");
  }

  // Objectives: RPO and RTO present, positive, and RPO <= RTO.
  const objectives = manifest.objectives ?? {};
  if (!isPositiveInt(objectives.rpoMinutes)) {
    add("rpo", "objectives.rpoMinutes must be a positive integer");
  }
  if (!isPositiveInt(objectives.rtoMinutes)) {
    add("rto", "objectives.rtoMinutes must be a positive integer");
  }
  if (
    isPositiveInt(objectives.rpoMinutes) &&
    isPositiveInt(objectives.rtoMinutes) &&
    objectives.rpoMinutes > objectives.rtoMinutes
  ) {
    add("rpo_gt_rto", "objectives.rpoMinutes must not exceed objectives.rtoMinutes");
  }

  // Targets: non-empty, unique ids, required kinds present, each fully specified
  // and encrypted (backups of tenant data MUST be encrypted).
  const targets = Array.isArray(manifest.targets) ? manifest.targets : [];
  if (targets.length === 0) {
    add("targets_empty", "targets must be a non-empty array");
  }
  const seenIds = new Set();
  for (const target of targets) {
    const label = isNonEmptyString(target?.id) ? target.id : "<unnamed>";
    if (!isNonEmptyString(target?.id)) {
      add("target_id", "each target must have a non-empty id");
    } else if (seenIds.has(target.id)) {
      add("target_duplicate", `duplicate target id: ${target.id}`);
    } else {
      seenIds.add(target.id);
    }
    if (!isNonEmptyString(target?.kind)) {
      add("target_kind", `target ${label} must have a kind`);
    }
    if (!isNonEmptyString(target?.schedule)) {
      add("target_schedule", `target ${label} must declare a schedule`);
    }
    if (!isPositiveInt(target?.retentionDays)) {
      add("target_retention", `target ${label} must declare a positive retentionDays`);
    }
    if (target?.encrypted !== true) {
      add("target_encryption", `target ${label} must be encrypted (encrypted: true)`);
    }
  }
  const kinds = new Set(targets.map((t) => t?.kind));
  for (const required of REQUIRED_TARGET_KINDS) {
    if (!kinds.has(required)) {
      add("target_kind_missing", `a backup target of kind "${required}" is required`);
    }
  }

  // Restore plan: ordered steps including a verification step, and the named
  // verification checks.
  const restore = manifest.restore ?? {};
  const steps = Array.isArray(restore.steps) ? restore.steps : [];
  if (steps.length === 0) {
    add("restore_steps", "restore.steps must be a non-empty array");
  } else if (!steps.includes("verify")) {
    add("restore_verify_step", 'restore.steps must include a "verify" step');
  }
  const verification = Array.isArray(restore.verification) ? restore.verification : [];
  if (verification.length === 0) {
    add("restore_verification", "restore.verification must be a non-empty array");
  }
  for (const required of REQUIRED_VERIFICATIONS) {
    if (!verification.includes(required)) {
      add("restore_verification_missing", `restore.verification must include "${required}"`);
    }
  }

  // Runbook: a path that must resolve to a real document.
  if (!isNonEmptyString(manifest.runbook)) {
    add("runbook_path", "runbook must be a non-empty path");
  } else if (runbookExists === false) {
    add("runbook_missing", `runbook file does not exist: ${manifest.runbook}`);
  }

  if (!isPositiveInt(manifest.drillCadenceDays)) {
    add("drill_cadence", "drillCadenceDays must be a positive integer");
  }

  return issues;
}
