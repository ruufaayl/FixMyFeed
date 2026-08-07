/**
 * Rule builder expression + simulation tests (task T097).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { repairRules } from "../packages/database/dist/index.js";
import {
  validateRuleDefinition,
  matchesRule,
  selectRule,
  simulateRules,
  toRepairRuleRow,
} from "../packages/repairs/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");

const issue = (o = {}) => ({
  code: "insecure_image_url",
  severity: "warning",
  productExternalId: "p1",
  variantExternalId: null,
  field: "images",
  message: "m",
  ...o,
});

test("validateRuleDefinition: deny-by-default on unknown field/op/action", () => {
  assert.throws(
    () => validateRuleDefinition({ action: "nope", all: [] }),
    /INVALID_RULE_DEFINITION/,
  );
  assert.throws(
    () => validateRuleDefinition({ action: "flag", all: [{ field: "x", op: "eq", value: "y" }] }),
    /INVALID_RULE_DEFINITION/,
  );
  assert.throws(
    () =>
      validateRuleDefinition({ action: "flag", all: [{ field: "code", op: "in", value: "y" }] }),
    /INVALID_RULE_DEFINITION/,
  );
  assert.throws(() => validateRuleDefinition({ action: "flag" }), /at least one/);
  // valid
  const ok = validateRuleDefinition({
    action: "auto_apply",
    all: [{ field: "severity", op: "in", value: ["warning", "info"] }],
  });
  assert.equal(ok.action, "auto_apply");
});

test("matchesRule: all AND any", () => {
  const def = {
    action: "flag",
    all: [{ field: "severity", op: "eq", value: "warning" }],
    any: [
      { field: "code", op: "eq", value: "insecure_image_url" },
      { field: "code", op: "eq", value: "insecure_link_url" },
    ],
  };
  assert.equal(matchesRule(def, issue()), true);
  assert.equal(matchesRule(def, issue({ severity: "critical" })), false); // all fails
  assert.equal(matchesRule(def, issue({ code: "missing_title" })), false); // any fails
});

test("selectRule: highest-priority enabled match", () => {
  const rules = [
    {
      id: "low",
      enabled: true,
      priority: 1,
      definition: { action: "flag", all: [{ field: "severity", op: "eq", value: "warning" }] },
    },
    {
      id: "high",
      enabled: true,
      priority: 5,
      definition: {
        action: "auto_apply",
        all: [{ field: "severity", op: "eq", value: "warning" }],
      },
    },
    {
      id: "off",
      enabled: false,
      priority: 9,
      definition: { action: "ignore", all: [{ field: "severity", op: "eq", value: "warning" }] },
    },
  ];
  assert.equal(selectRule(rules, issue()).id, "high");
  assert.equal(selectRule(rules, issue({ severity: "critical" })), null);
});

test("simulateRules: matches without applying", () => {
  const rules = [
    {
      id: "r1",
      enabled: true,
      priority: 1,
      definition: {
        action: "auto_apply",
        all: [{ field: "code", op: "eq", value: "insecure_image_url" }],
      },
    },
    {
      id: "r2",
      enabled: false,
      priority: 1,
      definition: { action: "flag", all: [{ field: "severity", op: "eq", value: "warning" }] },
    },
  ];
  const issues = [issue(), issue({ code: "missing_title", severity: "critical", field: "title" })];
  const sim = simulateRules(rules, issues);
  assert.equal(sim.totalIssues, 2);
  assert.equal(sim.matchedIssues, 1);
  assert.equal(sim.entries.length, 1); // disabled rule excluded
  assert.equal(sim.entries[0].ruleId, "r1");
  assert.equal(sim.entries[0].matched.length, 1);
});

test("toRepairRuleRow + schema/migration 0016", () => {
  const row = toRepairRuleRow("org-1", "Upgrade images", {
    action: "auto_apply",
    all: [{ field: "code", op: "eq", value: "insecure_image_url" }],
  });
  assert.equal(row.organizationId, "org-1");
  assert.equal(row.name, "Upgrade images");
  assert.equal(row.enabled, true);
  assert.equal(row.definition.action, "auto_apply");
  assert.throws(
    () => toRepairRuleRow("org-1", "bad", { action: "boom" }),
    /INVALID_RULE_DEFINITION/,
  );

  const cols = new Set(getTableConfig(repairRules).columns.map((c) => c.name));
  for (const c of ["name", "enabled", "priority", "definition"]) {
    assert.ok(cols.has(c), `repair_rules missing ${c}`);
  }
  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0016_t097_repair_rules.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "repair_rules"/);
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[16].tag, "0016_t097_repair_rules");
});
