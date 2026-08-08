/**
 * Repair-rule mapper tests (task T157).
 */
import { describe, it, expect } from "vitest";
import {
  draftToDefinition,
  toRepairRuleDTO,
  toRuleDefinitionDTO,
  toRuleSimulationDTO,
} from "../lib/server/adapters/rules-mappers";
import type { RuleDraftDTO } from "../lib/server/dto";

describe("toRuleDefinitionDTO", () => {
  it("maps an `all` group and normalizes values to arrays", () => {
    const dto = toRuleDefinitionDTO({
      all: [{ field: "code", op: "eq", value: "missing_title" }],
      action: "flag",
    });
    expect(dto).toEqual({
      match: "all",
      action: "flag",
      conditions: [{ field: "code", op: "eq", values: ["missing_title"] }],
    });
  });

  it("maps an `any` group with an `in` operator", () => {
    const dto = toRuleDefinitionDTO({
      any: [{ field: "severity", op: "in", value: ["critical", "warning"] }],
      action: "auto_apply",
    });
    expect(dto.match).toBe("any");
    expect(dto.conditions[0]).toEqual({
      field: "severity",
      op: "in",
      values: ["critical", "warning"],
    });
  });
});

describe("draftToDefinition", () => {
  const draft = (over: Partial<RuleDraftDTO["definition"]> = {}): RuleDraftDTO => ({
    name: "R",
    enabled: true,
    priority: 0,
    definition: {
      match: "all",
      action: "flag",
      conditions: [{ field: "code", op: "eq", values: ["x"] }],
      ...over,
    },
  });

  it("builds a validated `all` definition", () => {
    expect(draftToDefinition(draft())).toEqual({
      all: [{ field: "code", op: "eq", value: "x" }],
      action: "flag",
    });
  });

  it("builds an `any` definition preserving `in` values", () => {
    const def = draftToDefinition(
      draft({ match: "any", conditions: [{ field: "severity", op: "in", values: ["a", "b"] }] }),
    );
    expect(def).toEqual({
      any: [{ field: "severity", op: "in", value: ["a", "b"] }],
      action: "flag",
    });
  });

  it("rejects an unknown field (deny-by-default)", () => {
    expect(() =>
      draftToDefinition(
        draft({ conditions: [{ field: "bogus" as "code", op: "eq", values: ["x"] }] }),
      ),
    ).toThrow(/INVALID_RULE_DEFINITION/);
  });
});

describe("toRepairRuleDTO", () => {
  it("maps a stored row and validates its definition", () => {
    const dto = toRepairRuleDTO({
      id: "r1",
      name: "Rule 1",
      enabled: false,
      priority: 5,
      definition: { all: [{ field: "code", op: "eq", value: "c" }], action: "ignore" },
    });
    expect(dto).toMatchObject({ id: "r1", enabled: false, priority: 5 });
    expect(dto.definition.action).toBe("ignore");
  });
});

describe("toRuleSimulationDTO", () => {
  it("resolves rule names, counts matches, and bounds sample codes", () => {
    const issue = (code: string) => ({
      code,
      severity: "warning" as const,
      productExternalId: null,
      variantExternalId: null,
      field: null,
      message: "m",
    });
    const dto = toRuleSimulationDTO(
      {
        entries: [
          {
            ruleId: "r1",
            action: "flag",
            matched: [
              issue("a"),
              issue("a"),
              issue("b"),
              issue("c"),
              issue("d"),
              issue("e"),
              issue("f"),
            ],
          },
        ],
        matchedIssues: 7,
        totalIssues: 10,
      },
      new Map([["r1", "My rule"]]),
    );
    expect(dto.entries[0]!.ruleName).toBe("My rule");
    expect(dto.entries[0]!.matchedCount).toBe(7);
    expect(dto.entries[0]!.sampleCodes).toHaveLength(5); // deduped + bounded
    expect(dto.matchedIssues).toBe(7);
  });
});
