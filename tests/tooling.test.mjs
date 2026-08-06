/**
 * Quality-gate tooling tests (task T001).
 *
 * Verifies that formatting (Prettier), linting (ESLint), type checking, and
 * commit hooks are configured and wired, and exercises the lint/format gates on
 * both a clean input (primary path) and a violating input (failure path).
 *
 * Pure Node.js (node:test); runs with `node --test`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const pkg = readJson(join(ROOT, "package.json"));

const ESLINT = join(ROOT, "node_modules", "eslint", "bin", "eslint.js");
const PRETTIER = join(ROOT, "node_modules", "prettier", "bin", "prettier.cjs");

function runNode(args, opts = {}) {
  return spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    ...opts,
  });
}

test("required tooling config files exist", () => {
  for (const f of [".prettierrc.json", ".prettierignore", ".editorconfig", "eslint.config.mjs"]) {
    assert.ok(existsSync(join(ROOT, f)), `missing ${f}`);
  }
});

test("package.json wires format, lint, typecheck, test, and aggregate check scripts", () => {
  for (const s of [
    "format",
    "format:check",
    "lint",
    "lint:fix",
    "typecheck",
    "test",
    "check",
    "prepare",
  ]) {
    assert.ok(
      typeof pkg.scripts?.[s] === "string" && pkg.scripts[s].length > 0,
      `missing script ${s}`,
    );
  }
  assert.match(pkg.scripts.check, /format:check/);
  assert.match(pkg.scripts.check, /lint/);
  assert.match(pkg.scripts.check, /typecheck/);
  assert.match(pkg.scripts.check, /test/);
});

test("commit hooks are configured (pre-commit lint-staged, pre-push typecheck+test)", () => {
  const hooks = pkg["simple-git-hooks"];
  assert.ok(hooks, "missing simple-git-hooks config");
  assert.match(hooks["pre-commit"], /lint-staged/);
  assert.match(hooks["pre-push"], /typecheck/);
  assert.match(hooks["pre-push"], /test/);
  assert.ok(pkg["lint-staged"], "missing lint-staged config");
  assert.equal(pkg.scripts.prepare, "simple-git-hooks");
});

test("ESLint gate: clean input passes, violating input fails", () => {
  const clean = runNode([ESLINT, "--stdin", "--stdin-filename", "tools/__fixture__.mjs"], {
    input: "export const ok = 1;\n",
  });
  assert.equal(clean.status, 0, `expected clean lint to pass:\n${clean.stdout}\n${clean.stderr}`);

  const bad = runNode([ESLINT, "--stdin", "--stdin-filename", "tools/__fixture__.mjs"], {
    input: "debugger;\n",
  });
  assert.notEqual(bad.status, 0, "expected lint to fail on a debugger statement");
  assert.match(bad.stdout, /no-debugger/, "expected the no-debugger rule to fire");
});

test("Prettier gate: well-formatted input passes, misformatted input fails", () => {
  const dir = mkdtempSync(join(tmpdir(), "fmf-fmt-"));
  const good = join(dir, "good.ts");
  const bad = join(dir, "bad.ts");
  writeFileSync(good, "export const a = 1;\n");
  writeFileSync(bad, "export const    a=1\n");

  const okRun = runNode([PRETTIER, "--check", good]);
  assert.equal(
    okRun.status,
    0,
    `expected formatted file to pass:\n${okRun.stdout}\n${okRun.stderr}`,
  );

  const badRun = runNode([PRETTIER, "--check", bad]);
  assert.notEqual(badRun.status, 0, "expected misformatted file to fail prettier --check");
});
