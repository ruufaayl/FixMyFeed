/**
 * Package-boundary enforcement tests (task T000).
 *
 * Pure Node.js (node:test + node:fs) — runs with `node --test` and requires no
 * dependency install. Enforces the boundary rules from
 * docs/04-system-architecture/monorepo-architecture.md against the actual
 * workspace layout, using /boundaries.json as the source of truth.
 *
 * Traceability: monorepo-architecture FR (apps/packages, domain purity,
 * connectors-not-ui, no cycles) and reference-architecture FR (web/worker/
 * maintenance + shared packages).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const boundaries = JSON.parse(readFileSync(join(ROOT, "boundaries.json"), "utf8"));
const SCOPE = boundaries.scope;

const appIds = boundaries.workspaces.apps;
const packageIds = boundaries.workspaces.packages;
const allIds = [...appIds, ...packageIds];
const isApp = (id) => appIds.includes(id);

function locationOf(id) {
  return isApp(id) ? `apps/${id}` : `packages/${id}`;
}
function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
function internalDeps(pkgJson) {
  const fields = { ...(pkgJson.dependencies ?? {}), ...(pkgJson.peerDependencies ?? {}) };
  return Object.keys(fields)
    .filter((name) => name.startsWith(`${SCOPE}/`))
    .map((name) => name.slice(SCOPE.length + 1));
}
function tsconfigRefIds(id) {
  const tsPath = join(ROOT, locationOf(id), "tsconfig.json");
  const ts = readJson(tsPath);
  return (ts.references ?? []).map((ref) => {
    const abs = resolve(join(ROOT, locationOf(id)), ref.path);
    return abs.split(/[\\/]/).pop();
  });
}

test("boundaries.json: every id has an allowedDependencies entry referencing known workspaces", () => {
  for (const id of allIds) {
    assert.ok(id in boundaries.allowedDependencies, `missing allowedDependencies for ${id}`);
    for (const dep of boundaries.allowedDependencies[id]) {
      assert.ok(allIds.includes(dep), `${id} allows unknown workspace ${dep}`);
      assert.notEqual(dep, id, `${id} may not depend on itself`);
    }
  }
});

test("filesystem: workspaces on disk exactly match boundaries.json", () => {
  const onDiskApps = readdirSync(join(ROOT, "apps"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const onDiskPackages = readdirSync(join(ROOT, "packages"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  assert.deepEqual([...onDiskApps].sort(), [...appIds].sort());
  assert.deepEqual([...onDiskPackages].sort(), [...packageIds].sort());
});

test("each workspace has package.json, tsconfig.json, and src/index.ts with the correct name", () => {
  for (const id of allIds) {
    const dir = join(ROOT, locationOf(id));
    assert.ok(existsSync(join(dir, "package.json")), `${id} missing package.json`);
    assert.ok(existsSync(join(dir, "tsconfig.json")), `${id} missing tsconfig.json`);
    assert.ok(existsSync(join(dir, "src", "index.ts")), `${id} missing src/index.ts`);
    const pkg = readJson(join(dir, "package.json"));
    assert.equal(pkg.name, `${SCOPE}/${id}`, `${id} has wrong package name ${pkg.name}`);
    assert.equal(pkg.private, true, `${id} must be private`);
  }
});

test("declared package.json internal dependencies are within the allow-list", () => {
  for (const id of allIds) {
    const pkg = readJson(join(ROOT, locationOf(id), "package.json"));
    const allowed = new Set(boundaries.allowedDependencies[id]);
    for (const dep of internalDeps(pkg)) {
      assert.ok(allowed.has(dep), `${id} depends on ${dep} which is not allowed`);
    }
  }
});

test("tsconfig references are within the allow-list and resolve to real workspaces", () => {
  for (const id of allIds) {
    const allowed = new Set(boundaries.allowedDependencies[id]);
    for (const refId of tsconfigRefIds(id)) {
      assert.ok(allIds.includes(refId), `${id} tsconfig references unknown workspace ${refId}`);
      assert.ok(allowed.has(refId), `${id} tsconfig references ${refId} which is not allowed`);
    }
  }
});

test("invariant: domain is pure (no internal deps, no third-party runtime deps, no references)", () => {
  const pkg = readJson(join(ROOT, "packages/domain/package.json"));
  assert.deepEqual(boundaries.allowedDependencies.domain, [], "domain must allow no dependencies");
  assert.deepEqual(internalDeps(pkg), [], "domain must declare no internal dependencies");
  assert.deepEqual(
    Object.keys(pkg.dependencies ?? {}),
    [],
    "domain must declare no runtime dependencies",
  );
  assert.deepEqual(tsconfigRefIds("domain"), [], "domain must have no tsconfig references");
});

test("invariant: connector packages do not depend on application UI", () => {
  assert.ok(
    !boundaries.allowedDependencies.connectors.includes("ui"),
    "connectors must not allow ui",
  );
  assert.ok(
    !tsconfigRefIds("connectors").includes("ui"),
    "connectors tsconfig must not reference ui",
  );
});

test("invariant: no workspace depends on an application workspace", () => {
  for (const id of allIds) {
    for (const dep of boundaries.allowedDependencies[id]) {
      assert.ok(!isApp(dep), `${id} depends on application ${dep}; apps are deploy leaves`);
    }
    for (const refId of tsconfigRefIds(id)) {
      assert.ok(!isApp(refId), `${id} tsconfig references application ${refId}`);
    }
  }
});

test("invariant: the dependency graph is acyclic", () => {
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map(allIds.map((id) => [id, WHITE]));
  const stack = [];
  const visit = (id) => {
    color.set(id, GRAY);
    stack.push(id);
    for (const dep of boundaries.allowedDependencies[id]) {
      if (color.get(dep) === GRAY) {
        assert.fail(`dependency cycle detected: ${[...stack, dep].join(" -> ")}`);
      }
      if (color.get(dep) === WHITE) visit(dep);
    }
    stack.pop();
    color.set(id, BLACK);
  };
  for (const id of allIds) if (color.get(id) === WHITE) visit(id);
});
