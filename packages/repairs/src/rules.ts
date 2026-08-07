/**
 * Rule builder expression and simulation (task T097).
 *
 * A safe, declarative rule language for auto-remediation — never executable code.
 * A `RuleDefinition` is `all` (every condition must match) and/or `any` (at least
 * one) conditions over an issue's `code` / `severity` / `field`, plus an `action`.
 * `validateRuleDefinition` rejects unknown fields/operators/actions (deny-by-
 * default); `matchesRule` evaluates one issue; `selectRule` picks the highest-
 * priority enabled match; `simulateRules` reports what would match without
 * applying anything. Pure.
 */
import type { NewRepairRuleRow } from "@fixmyfeed/database";
import type { ValidationIssue } from "@fixmyfeed/diagnostics";

export const RULE_FIELDS = ["code", "severity", "field"] as const;
export type RuleField = (typeof RULE_FIELDS)[number];

export const RULE_OPERATORS = ["eq", "in"] as const;
export type RuleOperator = (typeof RULE_OPERATORS)[number];

export const RULE_ACTIONS = ["auto_apply", "flag", "ignore"] as const;
export type RuleAction = (typeof RULE_ACTIONS)[number];

export interface RuleCondition {
  readonly field: RuleField;
  readonly op: RuleOperator;
  readonly value: string | readonly string[];
}

export interface RuleDefinition {
  readonly all?: readonly RuleCondition[];
  readonly any?: readonly RuleCondition[];
  readonly action: RuleAction;
}

export interface RepairRule {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly definition: RuleDefinition;
}

export const REPAIR_RULES_ERROR = "INVALID_RULE_DEFINITION" as const;

function isConditionValid(condition: unknown): condition is RuleCondition {
  if (typeof condition !== "object" || condition === null) return false;
  const c = condition as Record<string, unknown>;
  if (!RULE_FIELDS.includes(c["field"] as RuleField)) return false;
  if (!RULE_OPERATORS.includes(c["op"] as RuleOperator)) return false;
  if (c["op"] === "in")
    return Array.isArray(c["value"]) && c["value"].every((v) => typeof v === "string");
  return typeof c["value"] === "string";
}

/**
 * Validates a rule definition, rejecting unknown fields/operators/actions and
 * mismatched value shapes (deny-by-default). Throws with a stable error message.
 */
export function validateRuleDefinition(definition: unknown): RuleDefinition {
  if (typeof definition !== "object" || definition === null) {
    throw new Error(`${REPAIR_RULES_ERROR}: not an object`);
  }
  const d = definition as Record<string, unknown>;
  if (!RULE_ACTIONS.includes(d["action"] as RuleAction)) {
    throw new Error(`${REPAIR_RULES_ERROR}: unknown action`);
  }
  const all = d["all"];
  const any = d["any"];
  if (all !== undefined && (!Array.isArray(all) || !all.every(isConditionValid))) {
    throw new Error(`${REPAIR_RULES_ERROR}: invalid 'all' conditions`);
  }
  if (any !== undefined && (!Array.isArray(any) || !any.every(isConditionValid))) {
    throw new Error(`${REPAIR_RULES_ERROR}: invalid 'any' conditions`);
  }
  if (all === undefined && any === undefined) {
    throw new Error(`${REPAIR_RULES_ERROR}: at least one of 'all' or 'any' is required`);
  }
  return definition as RuleDefinition;
}

function issueValue(issue: ValidationIssue, field: RuleField): string | null {
  if (field === "code") return issue.code;
  if (field === "severity") return issue.severity;
  return issue.field;
}

function conditionMatches(condition: RuleCondition, issue: ValidationIssue): boolean {
  const value = issueValue(issue, condition.field);
  if (value === null) return false;
  if (condition.op === "in") {
    return Array.isArray(condition.value) && condition.value.includes(value);
  }
  return condition.value === value;
}

/** Whether an issue matches a rule definition (`all` AND, `any` OR). */
export function matchesRule(definition: RuleDefinition, issue: ValidationIssue): boolean {
  const allOk = (definition.all ?? []).every((c) => conditionMatches(c, issue));
  const anyOk =
    definition.any === undefined || definition.any.length === 0
      ? true
      : definition.any.some((c) => conditionMatches(c, issue));
  return allOk && anyOk;
}

/** The highest-priority enabled rule that matches the issue, or null. */
export function selectRule(
  rules: readonly RepairRule[],
  issue: ValidationIssue,
): RepairRule | null {
  let best: RepairRule | null = null;
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!matchesRule(rule.definition, issue)) continue;
    if (best === null || rule.priority > best.priority) best = rule;
  }
  return best;
}

export interface RuleSimulationEntry {
  readonly ruleId: string;
  readonly action: RuleAction;
  readonly matched: readonly ValidationIssue[];
}

export interface RuleSimulation {
  readonly entries: readonly RuleSimulationEntry[];
  /** Issues matched by at least one enabled rule. */
  readonly matchedIssues: number;
  readonly totalIssues: number;
}

/**
 * Simulates enabled rules against issues without applying anything: per-rule
 * matches plus how many issues matched at least one rule. Deterministic.
 */
export function simulateRules(
  rules: readonly RepairRule[],
  issues: readonly ValidationIssue[],
): RuleSimulation {
  const entries: RuleSimulationEntry[] = [];
  const matchedSet = new Set<ValidationIssue>();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const matched = issues.filter((issue) => matchesRule(rule.definition, issue));
    for (const issue of matched) matchedSet.add(issue);
    entries.push({ ruleId: rule.id, action: rule.definition.action, matched });
  }
  return { entries, matchedIssues: matchedSet.size, totalIssues: issues.length };
}

/** Builds a `repair_rules` insert row (validates the definition first). */
export function toRepairRuleRow(
  organizationId: string,
  name: string,
  definition: RuleDefinition,
  options: { enabled?: boolean; priority?: number } = {},
): NewRepairRuleRow {
  const validated = validateRuleDefinition(definition);
  return {
    organizationId,
    name,
    enabled: options.enabled ?? true,
    priority: options.priority ?? 0,
    definition: validated as unknown as NewRepairRuleRow["definition"],
  };
}
