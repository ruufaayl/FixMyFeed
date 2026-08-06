/**
 * Generated traceability check tests (task T004).
 *
 * Unit-tests the pure parsing/validation functions with in-memory fixtures
 * (primary and failure paths), then runs the real CLI against the actual
 * repository as an integration/contract check that the live registry,
 * task/epic docs, and config schema stay consistent.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALLOWED_STATES,
  parseRegistryTable,
  validateRegistryRows,
  crossCheckDocs,
} from "../tools/traceability/registry.mjs";
import { parseCatalogVariableNames, diffVariables } from "../tools/traceability/env-catalog.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const VALID_TABLE = `## Task Inventory

| Task | Name | Epic | Status |
|---|---|---|---|
| T000 | Do a thing | E00 | Verified |
| T001 | Do another thing | E00 | In Review |
`;

test("parseRegistryTable: extracts rows from the Task Inventory table", () => {
  const rows = parseRegistryTable(VALID_TABLE);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.task),
    ["T000", "T001"],
  );
  assert.equal(rows[0].status, "Verified");
});

test("parseRegistryTable: returns empty array when no table is present", () => {
  assert.deepEqual(parseRegistryTable("# Just a heading\n\nNo table here.\n"), []);
});

test("validateRegistryRows: primary path — well-formed rows produce no issues", () => {
  const rows = parseRegistryTable(VALID_TABLE);
  assert.deepEqual(validateRegistryRows(rows), []);
});

test("validateRegistryRows: failure path — invalid state, malformed ids, duplicates", () => {
  const rows = [
    { task: "T000", name: "A", epic: "E00", status: "Kinda Done", line: 5 },
    { task: "T000", name: "A dup", epic: "E00", status: "Verified", line: 6 },
    { task: "TX99", name: "Bad id", epic: "E1", status: "Not Started", line: 7 },
  ];
  const issues = validateRegistryRows(rows);
  const codes = issues.map((i) => i.code);
  assert.ok(codes.includes("invalid_state"));
  assert.ok(codes.includes("duplicate_task_id"));
  assert.ok(codes.includes("malformed_task_id"));
  assert.ok(codes.includes("malformed_epic_id"));
});

test("ALLOWED_STATES matches the documented implementation status ledger", () => {
  assert.deepEqual(ALLOWED_STATES, [
    "Not Started",
    "Blocked",
    "In Progress",
    "In Review",
    "Verified",
    "Released",
    "Deprecated",
  ]);
});

test("crossCheckDocs: primary path — every registry id has a matching doc and vice versa", () => {
  const rows = [{ task: "T000", epic: "E00" }];
  assert.deepEqual(crossCheckDocs(rows, ["T000"], ["E00"]), []);
});

test("crossCheckDocs: failure path — orphans in both directions are reported", () => {
  const rows = [
    { task: "T000", epic: "E00" },
    { task: "T001", epic: "E99" },
  ];
  const issues = crossCheckDocs(rows, ["T000", "T002"], ["E00"]);
  const codes = issues.map((i) => i.code);
  assert.ok(codes.includes("orphan_registry_task")); // T001 has no doc
  assert.ok(codes.includes("orphan_task_doc")); // T002 doc has no registry row
  assert.ok(codes.includes("orphan_registry_epic")); // E99 has no doc
});

test("parseCatalogVariableNames: only reads the Authoritative Variable Matrix section", () => {
  const md = [
    "Some prose mentioning `NOT_A_VAR` in a code span outside any table.",
    "",
    "## Authoritative Variable Matrix",
    "",
    "| Variable | Type |",
    "|---|---|",
    "| `FOO_BAR` | string |",
    "| `BAZ_QUX` | integer |",
  ].join("\n");
  assert.deepEqual(parseCatalogVariableNames(md), ["FOO_BAR", "BAZ_QUX"]);
});

test("diffVariables: primary path — identical sets produce no issues", () => {
  assert.deepEqual(diffVariables(["A", "B"], ["A", "B"]), []);
});

test("diffVariables: failure path — undocumented and unimplemented variables are both reported", () => {
  const issues = diffVariables(["A", "B"], ["A", "C"]);
  const codes = issues.map((i) => i.code);
  assert.ok(codes.includes("documented_but_unimplemented")); // B: in catalog, not in schema
  assert.ok(codes.includes("undocumented_variable")); // C: in schema, not in catalog
});

test("diffVariables: failure path — duplicate catalog entries are reported", () => {
  const issues = diffVariables(["A", "A"], ["A"]);
  assert.ok(issues.some((i) => i.code === "duplicate_catalog_entry"));
});

test("CLI: the real repository is traceability-consistent (exit 0)", () => {
  const result = spawnSync(process.execPath, [join(ROOT, "tools/traceability/check.mjs")], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `expected clean repo to pass:\n${result.stdout}\n${result.stderr}`,
  );
  assert.match(result.stdout, /Traceability check passed/);
});
