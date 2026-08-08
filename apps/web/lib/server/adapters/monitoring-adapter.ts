/**
 * Monitoring repository adapter (task T158) — server-only.
 *
 * Implements `MonitoringRepository` over Drizzle, scoped by `organizationId`.
 * Metrics are bounded COUNT/SUM aggregates over the requested date range; events
 * merge the most recent repair executions and webhook receipts into one feed.
 * All values are derived (not connector-authoritative). Verified E2E in T159.
 */
import {
  diagnosticIssues,
  repairExecutions,
  webhookReceipts,
  type DatabaseClient,
} from "@fixmyfeed/database";
import { and, between, desc, eq, sql } from "drizzle-orm";
import type { MonitoringRecord, MonitoringRepository } from "../services";
import type { MonitoringEventDTO, ToneDTO } from "../dto";
import type { TenantScope } from "../tenant-scope";
import type { DateRange } from "../query";

async function scalar(promise: Promise<{ value: number }[]>): Promise<number> {
  const [row] = await promise;
  return row?.value ?? 0;
}

function executionTone(status: string): ToneDTO {
  if (status === "completed") return "healthy";
  if (status === "failed") return "critical";
  if (status === "partially_completed") return "warning";
  return "info";
}

function executionTitle(kind: string, status: string): string {
  const noun = kind === "rollback" ? "Rollback" : "Repair execution";
  return `${noun} ${status.replace(/_/g, " ")}`;
}

export function createMonitoringRepository(client: DatabaseClient): MonitoringRepository {
  const db = client.db;

  return {
    async loadMonitoring(scope: TenantScope, range: DateRange): Promise<MonitoringRecord> {
      const org = scope.organizationId;
      const from = new Date(range.from);
      const to = new Date(range.to);
      const inRange = between(repairExecutions.createdAt, from, to);

      const openIssues = await scalar(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(diagnosticIssues)
          .where(
            and(eq(diagnosticIssues.organizationId, org), eq(diagnosticIssues.status, "open")),
          ),
      );
      const executions = await scalar(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(repairExecutions)
          .where(and(eq(repairExecutions.organizationId, org), inRange)),
      );
      const failedChanges = await scalar(
        db
          .select({ value: sql<number>`coalesce(sum(${repairExecutions.failedItems}), 0)::int` })
          .from(repairExecutions)
          .where(and(eq(repairExecutions.organizationId, org), inRange)),
      );

      const metrics = [
        {
          id: "open_issues",
          label: "Open issues",
          value: openIssues.toLocaleString(),
          caption: null,
        },
        {
          id: "executions",
          label: "Repairs executed",
          value: executions.toLocaleString(),
          caption: "in range",
        },
        {
          id: "failed_changes",
          label: "Failed changes",
          value: failedChanges.toLocaleString(),
          caption: "in range",
        },
      ];

      const execRows = await db
        .select({
          id: repairExecutions.id,
          kind: repairExecutions.kind,
          status: repairExecutions.status,
          totalItems: repairExecutions.totalItems,
          createdAt: repairExecutions.createdAt,
        })
        .from(repairExecutions)
        .where(eq(repairExecutions.organizationId, org))
        .orderBy(desc(repairExecutions.createdAt))
        .limit(6);

      const hookRows = await db
        .select({
          id: webhookReceipts.id,
          topic: webhookReceipts.topic,
          status: webhookReceipts.status,
          receivedAt: webhookReceipts.receivedAt,
        })
        .from(webhookReceipts)
        .where(eq(webhookReceipts.organizationId, org))
        .orderBy(desc(webhookReceipts.receivedAt))
        .limit(6);

      const events: MonitoringEventDTO[] = [
        ...execRows.map((e) => ({
          id: `exec:${e.id}`,
          title: executionTitle(e.kind, e.status),
          meta: `${e.totalItems} change${e.totalItems === 1 ? "" : "s"}`,
          at: e.createdAt.toISOString(),
          tone: executionTone(e.status),
        })),
        ...hookRows.map((h) => ({
          id: `hook:${h.id}`,
          title: `Webhook ${h.status}`,
          meta: h.topic,
          at: h.receivedAt.toISOString(),
          tone: (h.status === "failed" ? "critical" : "info") as ToneDTO,
        })),
      ]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 8);

      return { metrics, events };
    },
  };
}
