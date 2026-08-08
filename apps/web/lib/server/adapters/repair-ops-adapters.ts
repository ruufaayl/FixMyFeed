/**
 * Concrete repair approval/execution adapters (task T155) — server-only.
 *
 * Drizzle/outbox implementations of the repair-ops ports (org-scoped). The queue
 * uses the transactional outbox (durable, no in-request pg-boss); the job row
 * carries only the execution id. Audit rows go to the immutable hash-chained
 * audit log. The concrete `WritebackPort` transport (real connector HTTP) is
 * injected in production and exercised end-to-end in T159 — its default refuses
 * to write rather than silently succeeding. All verified E2E in T159.
 */
import type { CatalogProduct } from "@fixmyfeed/domain";
import {
  auditLogs,
  catalogProducts,
  catalogs,
  computeAuditHash,
  createOutboxEvent,
  createUuidV7,
  outboxEvents,
  repairApprovals,
  repairExecutionItems,
  repairExecutions,
  repairPlans,
  type DatabaseClient,
} from "@fixmyfeed/database";
import { buildChangeSetPreview, type RepairChange, type WritebackPort } from "@fixmyfeed/repairs";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { ExecutionRefDTO, RepairPlanStatusDTO } from "../dto";
import type {
  AuditSink,
  ExecutionStore,
  GovernanceRepository,
  RepairAuditEvent,
  RepairQueue,
  WorkerRepository,
} from "../repair-ops";
import type { TenantScope } from "../tenant-scope";
import type { RiskLevel } from "@fixmyfeed/repairs";

export function createGovernanceRepository(client: DatabaseClient): GovernanceRepository {
  const db = client.db;
  return {
    async getGovernance(scope, planId) {
      const [row] = await db
        .select({
          status: repairPlans.status,
          riskLevel: repairPlans.riskLevel,
          proposerId: repairPlans.proposerId,
          version: repairPlans.version,
        })
        .from(repairPlans)
        .where(
          and(eq(repairPlans.organizationId, scope.organizationId), eq(repairPlans.id, planId)),
        )
        .limit(1);
      if (!row) return null;
      return {
        status: row.status as RepairPlanStatusDTO,
        riskLevel: row.riskLevel as RiskLevel,
        proposerId: row.proposerId,
        version: row.version,
      };
    },
    async recordDecision(scope, planId, approverId, decision, note) {
      await db
        .insert(repairApprovals)
        .values({ organizationId: scope.organizationId, planId, approverId, decision, note })
        .onConflictDoUpdate({
          target: [repairApprovals.planId, repairApprovals.approverId],
          set: { decision, note },
        });
    },
    async listDecisions(scope, planId) {
      const rows = await db
        .select({ approverId: repairApprovals.approverId, decision: repairApprovals.decision })
        .from(repairApprovals)
        .where(eq(repairApprovals.planId, planId));
      return rows.map((r) => ({ approverId: r.approverId, decision: r.decision }));
    },
    async setStatus(scope, planId, to, expectedVersion) {
      const updated = await db
        .update(repairPlans)
        .set({ status: to, version: expectedVersion + 1 })
        .where(
          and(
            eq(repairPlans.organizationId, scope.organizationId),
            eq(repairPlans.id, planId),
            eq(repairPlans.version, expectedVersion),
          ),
        )
        .returning({ id: repairPlans.id });
      return updated.length > 0;
    },
  };
}

async function planReadiness(
  db: DatabaseClient["db"],
  scope: TenantScope,
  planId: string,
): Promise<{
  status: RepairPlanStatusDTO;
  hasNeedsInput: boolean;
  hasConflict: boolean;
  connectorCapable: boolean;
  version: number;
} | null> {
  const [row] = await db
    .select({
      status: repairPlans.status,
      version: repairPlans.version,
      catalogId: repairPlans.catalogId,
      changeSet: repairPlans.changeSet,
      baselineFingerprints: repairPlans.baselineFingerprints,
    })
    .from(repairPlans)
    .where(and(eq(repairPlans.organizationId, scope.organizationId), eq(repairPlans.id, planId)))
    .limit(1);
  if (!row) return null;

  const changes = (row.changeSet as RepairChange[]) ?? [];
  const ids = [...new Set(changes.map((c) => c.productExternalId).filter((id) => id !== ""))];
  const productRows =
    ids.length === 0
      ? []
      : await db
          .select({ payload: catalogProducts.payload })
          .from(catalogProducts)
          .where(
            and(
              eq(catalogProducts.organizationId, scope.organizationId),
              eq(catalogProducts.catalogId, row.catalogId),
              inArray(catalogProducts.externalId, ids),
            ),
          );
  const preview = buildChangeSetPreview({
    plan: {
      changes,
      summary: { total: changes.length, automatic: 0, assisted: 0, manual: 0, requiresInput: 0 },
    },
    products: productRows.map((p) => p.payload as CatalogProduct),
    baselineFingerprints: new Map(
      Object.entries((row.baselineFingerprints as Record<string, string>) ?? {}),
    ),
  });

  const [catalogRow] = await db
    .select({ status: catalogs.status })
    .from(catalogs)
    .where(and(eq(catalogs.organizationId, scope.organizationId), eq(catalogs.id, row.catalogId)))
    .limit(1);

  return {
    status: row.status as RepairPlanStatusDTO,
    hasNeedsInput: preview.entries.some((e) => e.status === "needs_input"),
    hasConflict: preview.entries.some((e) => e.status === "conflict"),
    connectorCapable: catalogRow?.status === "active",
    version: row.version,
  };
}

export function createExecutionStore(client: DatabaseClient): ExecutionStore {
  const db = client.db;
  return {
    getReadiness: (scope, planId) => planReadiness(db, scope, planId),
    async createQueuedExecution(scope, planId, idempotencyKey) {
      const inserted = await db
        .insert(repairExecutions)
        .values({
          organizationId: scope.organizationId,
          planId,
          kind: "apply",
          idempotencyKey,
          status: "queued",
          totalItems: 0,
        })
        .onConflictDoNothing({
          target: [repairExecutions.organizationId, repairExecutions.idempotencyKey],
        })
        .returning({ id: repairExecutions.id });
      if (inserted.length > 0 && inserted[0]) {
        return { executionId: inserted[0].id, created: true };
      }
      const [existing] = await db
        .select({ id: repairExecutions.id })
        .from(repairExecutions)
        .where(
          and(
            eq(repairExecutions.organizationId, scope.organizationId),
            eq(repairExecutions.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      return { executionId: existing?.id ?? "", created: false };
    },
    async lockPlan(scope, planId, expectedVersion) {
      const updated = await db
        .update(repairPlans)
        .set({ status: "executing", version: expectedVersion + 1 })
        .where(
          and(
            eq(repairPlans.organizationId, scope.organizationId),
            eq(repairPlans.id, planId),
            eq(repairPlans.version, expectedVersion),
            eq(repairPlans.status, "approved"),
          ),
        )
        .returning({ id: repairPlans.id });
      return updated.length > 0;
    },
    async getExecution(scope, executionId): Promise<ExecutionRefDTO | null> {
      const [row] = await db
        .select({
          id: repairExecutions.id,
          kind: repairExecutions.kind,
          status: repairExecutions.status,
        })
        .from(repairExecutions)
        .where(
          and(
            eq(repairExecutions.organizationId, scope.organizationId),
            eq(repairExecutions.id, executionId),
          ),
        )
        .limit(1);
      if (!row) return null;
      return {
        executionId: row.id,
        kind: row.kind === "rollback" ? "repair_rollback" : "repair_apply",
        status: row.status,
      };
    },
  };
}

/** Durable enqueue via the transactional outbox (job carries only the id). */
export function createRepairQueue(client: DatabaseClient): RepairQueue {
  const db = client.db;
  return {
    async enqueue(job) {
      const event = createOutboxEvent({
        organizationId: job.tenantId,
        eventType: "repair.execute",
        aggregateType: "repair_execution",
        aggregateId: job.executionId,
        payload: { executionId: job.executionId, principalUserId: job.principalUserId },
      });
      await db.insert(outboxEvents).values(event);
    },
  };
}

/** Best-effort immutable audit log for repair governance/execution events. */
export function createAuditSink(client: DatabaseClient): AuditSink {
  const db = client.db;
  return {
    async record(event: RepairAuditEvent) {
      try {
        const [last] = await db
          .select({ hash: auditLogs.hash })
          .from(auditLogs)
          .orderBy(desc(auditLogs.occurredAt))
          .limit(1);
        const id = createUuidV7();
        const occurredAt = new Date();
        const input = {
          id,
          organizationId: null,
          actorUserId: event.actorId,
          actorType: "user" as const,
          action: "repair" as const,
          resourceType: "repair_plan",
          resourceId: event.planId,
          outcome: event.outcome,
          code: event.action,
          operationId: event.executionId ?? null,
          payload: null,
          occurredAt,
        };
        const hash = computeAuditHash(input, last?.hash ?? null);
        await db.insert(auditLogs).values({ ...input, prevHash: last?.hash ?? null, hash });
      } catch {
        // Audit is non-authoritative for the operation's success; never block it.
      }
    },
  };
}

export function createWorkerRepository(client: DatabaseClient): WorkerRepository {
  const db = client.db;
  return {
    async loadExecutionWork(executionId) {
      const [exec] = await db
        .select({ planId: repairExecutions.planId, status: repairExecutions.status })
        .from(repairExecutions)
        .where(eq(repairExecutions.id, executionId))
        .limit(1);
      if (!exec || (exec.status !== "queued" && exec.status !== "running")) return null;
      const [plan] = await db
        .select({ changeSet: repairPlans.changeSet })
        .from(repairPlans)
        .where(eq(repairPlans.id, exec.planId))
        .limit(1);
      if (!plan) return null;
      return { planId: exec.planId, changes: (plan.changeSet as RepairChange[]) ?? [] };
    },
    async markRunning(executionId) {
      await db
        .update(repairExecutions)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(repairExecutions.id, executionId));
    },
    async persistOutcome(executionId, planId, outcome) {
      const [exec] = await db
        .select({ organizationId: repairExecutions.organizationId })
        .from(repairExecutions)
        .where(eq(repairExecutions.id, executionId))
        .limit(1);
      const organizationId = exec?.organizationId ?? "";
      if (outcome.items.length > 0) {
        await db.insert(repairExecutionItems).values(
          outcome.items.map((item) => ({
            organizationId,
            executionId,
            productExternalId: item.instruction.productExternalId,
            variantExternalId: item.instruction.variantExternalId,
            field: item.instruction.field,
            beforeValue: item.instruction.before,
            afterValue: item.instruction.after,
            status: item.status,
            error: item.error,
          })),
        );
      }
      await db
        .update(repairExecutions)
        .set({
          status: outcome.status,
          totalItems: outcome.total,
          succeededItems: outcome.succeeded,
          failedItems: outcome.failed,
          completedAt: new Date(),
        })
        .where(eq(repairExecutions.id, executionId));
      const planStatus =
        outcome.status === "completed"
          ? "completed"
          : outcome.status === "partially_completed"
            ? "partially_completed"
            : "failed";
      await db.update(repairPlans).set({ status: planStatus }).where(eq(repairPlans.id, planId));
    },
  };
}

/**
 * Default `WritebackPort`. Refuses to write until a real connector transport is
 * injected (production/T159) — it never silently reports success.
 */
export function createWritebackPort(): WritebackPort {
  return {
    async apply() {
      return { ok: false, error: "writeback_transport_not_configured" };
    },
  };
}
