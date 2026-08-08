/**
 * Repair-rules repository adapter (task T157) — server-only.
 *
 * Org-scoped Drizzle implementation of `RepairRulesRepository` over `repair_rules`
 * (T097). Definitions are validated + built through the domain mappers before
 * persistence; simulation runs the pure `simulateRules` (T097) over the domain's
 * rules and the workspace's open `diagnostic_issues`. No Drizzle row or domain
 * type crosses the boundary — only DTOs are returned.
 */
import type { IssueSeverity, ValidationIssue } from "@fixmyfeed/diagnostics";
import {
  diagnosticIssues,
  repairRules,
  type DatabaseClient,
  type NewRepairRuleRow,
} from "@fixmyfeed/database";
import { simulateRules } from "@fixmyfeed/repairs";
import { and, eq, sql } from "drizzle-orm";
import type { RepairRuleDTO, RuleDraftDTO, RuleSimulationDTO } from "../dto";
import type { RepairRulesRepository } from "../services";
import type { TenantScope } from "../tenant-scope";
import {
  draftToDefinition,
  toDomainRule,
  toRepairRuleDTO,
  toRuleSimulationDTO,
  type RuleRecord,
} from "./rules-mappers";

/** Builds the persisted definition (validated) from a draft. */
function draftDefinition(draft: RuleDraftDTO): NewRepairRuleRow["definition"] {
  return draftToDefinition(draft) as unknown as NewRepairRuleRow["definition"];
}

export function createRepairRulesRepository(client: DatabaseClient): RepairRulesRepository {
  const db = client.db;

  async function loadRows(scope: TenantScope): Promise<RuleRecord[]> {
    const rows = await db
      .select({
        id: repairRules.id,
        name: repairRules.name,
        enabled: repairRules.enabled,
        priority: repairRules.priority,
        definition: repairRules.definition,
      })
      .from(repairRules)
      .where(eq(repairRules.organizationId, scope.organizationId))
      .orderBy(sql`${repairRules.priority} desc`, repairRules.name);
    return rows;
  }

  return {
    async list(scope) {
      return (await loadRows(scope)).map(toRepairRuleDTO);
    },
    async create(scope, draft): Promise<RepairRuleDTO> {
      const [row] = await db
        .insert(repairRules)
        .values({
          organizationId: scope.organizationId,
          name: draft.name.trim(),
          enabled: draft.enabled,
          priority: draft.priority,
          definition: draftDefinition(draft),
        })
        .returning({
          id: repairRules.id,
          name: repairRules.name,
          enabled: repairRules.enabled,
          priority: repairRules.priority,
          definition: repairRules.definition,
        });
      return toRepairRuleDTO(row!);
    },
    async update(scope, ruleId, draft): Promise<RepairRuleDTO | null> {
      const [row] = await db
        .update(repairRules)
        .set({
          name: draft.name.trim(),
          enabled: draft.enabled,
          priority: draft.priority,
          definition: draftDefinition(draft),
          version: sql`${repairRules.version} + 1`,
        })
        .where(
          and(eq(repairRules.organizationId, scope.organizationId), eq(repairRules.id, ruleId)),
        )
        .returning({
          id: repairRules.id,
          name: repairRules.name,
          enabled: repairRules.enabled,
          priority: repairRules.priority,
          definition: repairRules.definition,
        });
      return row ? toRepairRuleDTO(row) : null;
    },
    async setEnabled(scope, ruleId, enabled): Promise<boolean> {
      const updated = await db
        .update(repairRules)
        .set({ enabled, version: sql`${repairRules.version} + 1` })
        .where(
          and(eq(repairRules.organizationId, scope.organizationId), eq(repairRules.id, ruleId)),
        )
        .returning({ id: repairRules.id });
      return updated.length > 0;
    },
    async remove(scope, ruleId): Promise<boolean> {
      const deleted = await db
        .delete(repairRules)
        .where(
          and(eq(repairRules.organizationId, scope.organizationId), eq(repairRules.id, ruleId)),
        )
        .returning({ id: repairRules.id });
      return deleted.length > 0;
    },
    async simulate(scope): Promise<RuleSimulationDTO> {
      const rows = await loadRows(scope);
      const rules = rows.map(toDomainRule);
      const ruleNames = new Map(rows.map((r) => [r.id, r.name]));
      const issueRows = await db
        .select({
          code: diagnosticIssues.code,
          severity: diagnosticIssues.severity,
          productExternalId: diagnosticIssues.productExternalId,
          variantExternalId: diagnosticIssues.variantExternalId,
          field: diagnosticIssues.field,
          message: diagnosticIssues.message,
        })
        .from(diagnosticIssues)
        .where(
          and(
            eq(diagnosticIssues.organizationId, scope.organizationId),
            eq(diagnosticIssues.status, "open"),
          ),
        );
      const issues: ValidationIssue[] = issueRows.map((r) => ({
        code: r.code,
        severity: r.severity as IssueSeverity,
        productExternalId: r.productExternalId,
        variantExternalId: r.variantExternalId,
        field: r.field,
        message: r.message,
      }));
      return toRuleSimulationDTO(simulateRules(rules, issues), ruleNames);
    },
  };
}
