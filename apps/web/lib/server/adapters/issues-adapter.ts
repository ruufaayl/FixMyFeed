/**
 * Issues repository adapter (task T153) — server-only.
 *
 * Implements `IssuesRepository` over Drizzle, scoped by `organizationId`. Groups
 * open diagnostic issues by root-cause code (bounded GROUP BY) and assembles
 * evidence from a few representative affected issues. Repairability uses the
 * remediation registry (T090). Query behavior is verified end-to-end in T159.
 */
import { diagnosticIssues, type DatabaseClient } from "@fixmyfeed/database";
import { defaultRemediationRegistry } from "@fixmyfeed/repairs";
import { and, desc, eq, sql } from "drizzle-orm";
import type { EvidenceDTO, IssueSeverityDTO } from "../dto";
import type { IssueGroupRecord, IssuesRepository } from "../services";
import type { TenantScope } from "../tenant-scope";
import { explainCode, humanizeCode, severityFromRank, toEvidenceEntries } from "./issue-mappers";

const registry = defaultRemediationRegistry();
const REMEDIABLE = new Set(registry.list().map((r) => r.issueCode));

export function createIssuesRepository(client: DatabaseClient): IssuesRepository {
  const db = client.db;

  return {
    async listGroups(scope: TenantScope, filter): Promise<readonly IssueGroupRecord[]> {
      const open = and(
        eq(diagnosticIssues.organizationId, scope.organizationId),
        eq(diagnosticIssues.status, "open"),
      );

      const rows = await db
        .select({
          code: diagnosticIssues.code,
          affected: sql<number>`count(distinct ${diagnosticIssues.productExternalId})::int`,
          worstRank: sql<number>`min(case ${diagnosticIssues.severity} when 'critical' then 0 when 'error' then 1 when 'warning' then 2 else 3 end)::int`,
        })
        .from(diagnosticIssues)
        .where(open)
        .groupBy(diagnosticIssues.code)
        .orderBy(desc(sql`count(distinct ${diagnosticIssues.productExternalId})`));

      let groups: IssueGroupRecord[] = rows.map((r) => ({
        id: r.code,
        code: r.code,
        title: humanizeCode(r.code),
        severity: severityFromRank(r.worstRank),
        affectedCount: r.affected,
        exposure: null,
        confidence: null,
        repairable: REMEDIABLE.has(r.code),
      }));

      if (filter.severity) {
        groups = groups.filter((g) => g.severity === filter.severity);
      }
      if (filter.view === "repairable") {
        groups = groups.filter((g) => g.repairable);
      }
      return groups;
    },

    async getEvidence(scope: TenantScope, issueGroupId: string): Promise<EvidenceDTO | null> {
      const rows = await db
        .select({
          productExternalId: diagnosticIssues.productExternalId,
          message: diagnosticIssues.message,
          lastSeenAt: diagnosticIssues.lastSeenAt,
          severity: diagnosticIssues.severity,
        })
        .from(diagnosticIssues)
        .where(
          and(
            eq(diagnosticIssues.organizationId, scope.organizationId),
            eq(diagnosticIssues.status, "open"),
            eq(diagnosticIssues.code, issueGroupId),
          ),
        )
        .limit(6);

      if (rows.length === 0) return null;

      const { explanation, whyItMatters } = explainCode(issueGroupId);
      const remediation = registry.get(issueGroupId);
      return {
        issueGroupId,
        entries: toEvidenceEntries(
          rows.map((r) => ({
            productExternalId: r.productExternalId,
            message: r.message,
            lastSeenAt: r.lastSeenAt.toISOString(),
            severity: r.severity as IssueSeverityDTO,
          })),
        ),
        explanation,
        whyItMatters,
        recommendedRepair: remediation?.description ?? null,
      };
    },
  };
}
