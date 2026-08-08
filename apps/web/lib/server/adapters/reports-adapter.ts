/**
 * Reports repository adapter (task T158) — server-only.
 *
 * Implements `ReportsRepository` over Drizzle, scoped by `organizationId`. Each
 * report summary is a bounded aggregate (derived): current catalog health, open
 * issue count, and applied (succeeded/verified) repair changes. Verified E2E in
 * T159.
 */
import {
  catalogProducts,
  diagnosticIssues,
  repairExecutionItems,
  type DatabaseClient,
} from "@fixmyfeed/database";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { ReportRecord, ReportsRepository } from "../services";
import type { TenantScope } from "../tenant-scope";
import { computeHealthScore } from "./mappers";

async function scalar(promise: Promise<{ value: number }[]>): Promise<number> {
  const [row] = await promise;
  return row?.value ?? 0;
}

export function createReportsRepository(client: DatabaseClient): ReportsRepository {
  const db = client.db;

  return {
    async listReports(scope: TenantScope): Promise<readonly ReportRecord[]> {
      const org = scope.organizationId;

      const totalProducts = await scalar(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(catalogProducts)
          .where(eq(catalogProducts.organizationId, org)),
      );
      const affected = await scalar(
        db
          .select({
            value: sql<number>`count(distinct ${diagnosticIssues.productExternalId})::int`,
          })
          .from(diagnosticIssues)
          .where(
            and(eq(diagnosticIssues.organizationId, org), eq(diagnosticIssues.status, "open")),
          ),
      );
      const openIssues = await scalar(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(diagnosticIssues)
          .where(
            and(eq(diagnosticIssues.organizationId, org), eq(diagnosticIssues.status, "open")),
          ),
      );
      const repairsApplied = await scalar(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(repairExecutionItems)
          .where(
            and(
              eq(repairExecutionItems.organizationId, org),
              inArray(repairExecutionItems.status, ["succeeded", "verified"]),
            ),
          ),
      );

      return [
        {
          id: "catalog_health",
          title: "Catalog health",
          description: "Current health score",
          stat: String(computeHealthScore(totalProducts, affected)),
        },
        {
          id: "open_issues",
          title: "Open issues",
          description: "Across the catalog",
          stat: openIssues.toLocaleString(),
        },
        {
          id: "repairs_applied",
          title: "Repairs applied",
          description: "Succeeded or verified changes",
          stat: repairsApplied.toLocaleString(),
        },
      ];
    },
  };
}
