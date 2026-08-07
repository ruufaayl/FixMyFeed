/**
 * Overview repository adapter (task T152) — server-only.
 *
 * Implements `OverviewRepository` over Drizzle, scoped by `organizationId`, using
 * bounded COUNT/GROUP BY aggregates (never an unbounded row scan). Repairability
 * uses the remediation registry (T090). Query behavior is verified end-to-end in
 * T159.
 */
import {
  catalogProducts,
  catalogs,
  diagnosticIssues,
  type DatabaseClient,
} from "@fixmyfeed/database";
import { defaultRemediationRegistry } from "@fixmyfeed/repairs";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { IssueSeverityDTO, ToneDTO } from "../dto";
import type { OverviewRecord, OverviewRepository, HealthSignalRecord } from "../services";
import type { TenantScope } from "../tenant-scope";
import { computeHealthScore } from "./mappers";

const RANK_TO_SEVERITY: readonly IssueSeverityDTO[] = ["critical", "error", "warning", "info"];
const REMEDIABLE_CODES: readonly string[] = defaultRemediationRegistry()
  .list()
  .map((r) => r.issueCode);

function catalogTone(status: string): ToneDTO {
  return status === "active" ? "healthy" : "neutral";
}

async function scalar(promise: Promise<{ value: number }[]>): Promise<number> {
  const [row] = await promise;
  return row?.value ?? 0;
}

export function createOverviewRepository(client: DatabaseClient): OverviewRepository {
  const db = client.db;

  return {
    async loadOverview(scope: TenantScope): Promise<OverviewRecord> {
      const org = scope.organizationId;
      const openIssue = and(
        eq(diagnosticIssues.organizationId, org),
        eq(diagnosticIssues.status, "open"),
      );

      const total = await scalar(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(catalogProducts)
          .where(eq(catalogProducts.organizationId, org)),
      );
      const productsAffected = await scalar(
        db
          .select({
            value: sql<number>`count(distinct ${diagnosticIssues.productExternalId})::int`,
          })
          .from(diagnosticIssues)
          .where(openIssue),
      );
      const criticalIssues = await scalar(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(diagnosticIssues)
          .where(and(openIssue, eq(diagnosticIssues.severity, "critical"))),
      );
      const repairable = await scalar(
        db
          .select({
            value: sql<number>`count(distinct ${diagnosticIssues.productExternalId})::int`,
          })
          .from(diagnosticIssues)
          .where(and(openIssue, inArray(diagnosticIssues.code, [...REMEDIABLE_CODES]))),
      );

      const groupRows = await db
        .select({
          code: diagnosticIssues.code,
          affected: sql<number>`count(distinct ${diagnosticIssues.productExternalId})::int`,
          worstRank: sql<number>`min(case ${diagnosticIssues.severity} when 'critical' then 0 when 'error' then 1 when 'warning' then 2 else 3 end)::int`,
        })
        .from(diagnosticIssues)
        .where(openIssue)
        .groupBy(diagnosticIssues.code)
        .orderBy(desc(sql`count(distinct ${diagnosticIssues.productExternalId})`))
        .limit(3);

      const topSignals: HealthSignalRecord[] = groupRows.map((g) => ({
        id: g.code,
        title: g.code,
        severity: RANK_TO_SEVERITY[g.worstRank] ?? "info",
        affectedCount: g.affected,
        exposure: null,
        confidence: null,
        sources: [],
        detectedAt: null,
      }));

      const catalogRows = await db
        .select({
          id: catalogs.id,
          connectorId: catalogs.connectorId,
          displayName: catalogs.displayName,
          status: catalogs.status,
          updatedAt: catalogs.updatedAt,
        })
        .from(catalogs)
        .where(eq(catalogs.organizationId, org));

      const integrations = catalogRows.map((c) => ({
        id: c.id,
        name: c.displayName ?? c.connectorId,
        tone: catalogTone(c.status),
        status: c.status === "active" ? "Connected" : "Inactive",
        lastSyncAt: c.updatedAt.toISOString(),
      }));

      return {
        healthScore: computeHealthScore(total, productsAffected),
        productsAffected,
        criticalIssues,
        repairable,
        integrations,
        topSignals,
        recentActivity: [],
      };
    },
  };
}
