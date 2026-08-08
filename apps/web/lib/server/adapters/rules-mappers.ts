/**
 * Repair-rule mappers (task T157) — pure, no I/O.
 *
 * Translate between the T097 domain rule model (`@fixmyfeed/repairs`) and the
 * stable UI DTOs, and build the simulation DTO. The Rule Builder authors a single
 * condition group (`all` OR `any`); these mappers preserve that shape and validate
 * every draft through `validateRuleDefinition` (deny-by-default) before it can be
 * persisted. No Drizzle/domain type crosses to React.
 */
import {
  validateRuleDefinition,
  type RepairRule,
  type RuleAction,
  type RuleCondition,
  type RuleDefinition,
  type RuleField,
  type RuleSimulation,
} from "@fixmyfeed/repairs";
import type {
  RepairRuleDTO,
  RuleConditionDTO,
  RuleDefinitionDTO,
  RuleDraftDTO,
  RuleSimulationDTO,
} from "../dto";

const MAX_SAMPLE_CODES = 5;

/** A stored rule row shape (only the fields the mapper needs). */
export interface RuleRecord {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly definition: unknown;
}

function conditionToDTO(condition: RuleCondition): RuleConditionDTO {
  return {
    field: condition.field,
    op: condition.op,
    values: Array.isArray(condition.value) ? [...condition.value] : [condition.value],
  };
}

/** Domain definition → DTO. Prefers a non-empty `all` group, else `any`. */
export function toRuleDefinitionDTO(definition: RuleDefinition): RuleDefinitionDTO {
  const all = definition.all ?? [];
  const any = definition.any ?? [];
  const useAll = all.length > 0 || any.length === 0;
  const conditions = (useAll ? all : any).map(conditionToDTO);
  return { match: useAll ? "all" : "any", conditions, action: definition.action };
}

/** Stored row → DTO (validates the persisted definition defensively). */
export function toRepairRuleDTO(row: RuleRecord): RepairRuleDTO {
  const definition = validateRuleDefinition(row.definition);
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    priority: row.priority,
    definition: toRuleDefinitionDTO(definition),
  };
}

function conditionFromDTO(condition: RuleConditionDTO): RuleCondition {
  const field = condition.field as RuleField;
  if (condition.op === "in") {
    return { field, op: "in", value: [...condition.values] };
  }
  return { field, op: "eq", value: condition.values[0] ?? "" };
}

/**
 * DTO draft → a validated domain `RuleDefinition`. Throws the domain
 * `INVALID_RULE_DEFINITION` error (the service maps it to a validation AppError).
 */
export function draftToDefinition(draft: RuleDraftDTO): RuleDefinition {
  const def = draft.definition;
  const conditions = def.conditions.map(conditionFromDTO);
  const grouped: RuleDefinition =
    def.match === "any"
      ? { any: conditions, action: def.action as RuleAction }
      : { all: conditions, action: def.action as RuleAction };
  return validateRuleDefinition(grouped);
}

/** Domain simulation → DTO, resolving rule names and bounding sample codes. */
export function toRuleSimulationDTO(
  simulation: RuleSimulation,
  ruleNames: ReadonlyMap<string, string>,
): RuleSimulationDTO {
  return {
    entries: simulation.entries.map((entry) => ({
      ruleId: entry.ruleId,
      ruleName: ruleNames.get(entry.ruleId) ?? entry.ruleId,
      action: entry.action,
      matchedCount: entry.matched.length,
      sampleCodes: [...new Set(entry.matched.map((i) => i.code))].slice(0, MAX_SAMPLE_CODES),
    })),
    matchedIssues: simulation.matchedIssues,
    totalIssues: simulation.totalIssues,
  };
}

/** A stored rule row → the domain `RepairRule` used by `simulateRules`. */
export function toDomainRule(row: RuleRecord): RepairRule {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    priority: row.priority,
    definition: validateRuleDefinition(row.definition),
  };
}
