#!/usr/bin/env node
/**
 * Generated traceability check (task T004).
 *
 * A standing, deterministic CI gate — not a one-off audit — that keeps
 * WORKSTREAM_REGISTRY.md, the task/epic specification documents, and
 * packages/config's environment-variable schema mutually consistent, per
 * AGENTS.md AC-002 and IMPLEMENTATION_STATUS.md's allowed-state ledger.
 *
 * Run with: node tools/traceability/check.mjs
 * Exits 1 and prints every issue if any check fails; exits 0 and prints a
 * summary otherwise. Requires `pnpm run build` (or `pnpm run typecheck`,
 * which is a superset) to have produced packages/config/dist first.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRegistryTable, validateRegistryRows, crossCheckDocs } from "./registry.mjs";
import { parseCatalogVariableNames, diffVariables } from "./env-catalog.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SPEC_ROOT = join(
  ROOT,
  "feed-doctor-implementation-specifications-v1.0.0",
  "feed-doctor-specifications-implementation-v1.0.0",
);

function idsFromFilenames(dir, prefixRe) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.match(prefixRe)?.[1])
    .filter((id) => id !== undefined);
}

async function main() {
  const allIssues = [];

  // 1. Registry structural validation.
  const registryPath = join(SPEC_ROOT, "implementation", "WORKSTREAM_REGISTRY.md");
  const registryMarkdown = readFileSync(registryPath, "utf8");
  const rows = parseRegistryTable(registryMarkdown);
  if (rows.length === 0) {
    allIssues.push({
      code: "empty_registry",
      message: "no task rows parsed from WORKSTREAM_REGISTRY.md",
    });
  }
  allIssues.push(...validateRegistryRows(rows).map((i) => ({ ...i, source: "registry" })));

  // 2. Registry <-> task/epic doc linkage.
  const taskFileIds = idsFromFilenames(join(SPEC_ROOT, "implementation", "tasks"), /^(T\d{3})-/);
  const epicFileIds = idsFromFilenames(join(SPEC_ROOT, "implementation", "epics"), /^(E\d{2})-/);
  allIssues.push(
    ...crossCheckDocs(rows, taskFileIds, epicFileIds).map((i) => ({
      ...i,
      source: "registry-docs",
    })),
  );

  // 3. Environment variable catalog <-> packages/config schema.
  const catalogPath = join(SPEC_ROOT, "ENVIRONMENT_VARIABLE_CATALOG.md");
  const catalogMarkdown = readFileSync(catalogPath, "utf8");
  const catalogNames = parseCatalogVariableNames(catalogMarkdown);
  if (catalogNames.length === 0) {
    allIssues.push({
      code: "empty_catalog",
      message: "no variables parsed from ENVIRONMENT_VARIABLE_CATALOG.md",
      source: "env-catalog",
    });
  }

  const configDist = join(ROOT, "packages", "config", "dist", "index.js");
  if (!existsSync(configDist)) {
    allIssues.push({
      code: "config_not_built",
      message:
        "packages/config/dist/index.js is missing; run `pnpm run build` (or typecheck) before this check",
      source: "env-catalog",
    });
  } else {
    const { VARIABLES } = await import(`file://${configDist.replace(/\\/g, "/")}`);
    const schemaNames = VARIABLES.map((v) => v.name);
    allIssues.push(
      ...diffVariables(catalogNames, schemaNames).map((i) => ({ ...i, source: "env-catalog" })),
    );
  }

  if (allIssues.length > 0) {
    console.error(`Traceability check FAILED with ${allIssues.length} issue(s):\n`);
    for (const issue of allIssues) {
      console.error(`  [${issue.source}:${issue.code}] ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Traceability check passed: ${rows.length} registry rows, ${taskFileIds.length} task docs, ` +
      `${epicFileIds.length} epic docs, ${catalogNames.length} catalog variables — all consistent.`,
  );
}

await main();
