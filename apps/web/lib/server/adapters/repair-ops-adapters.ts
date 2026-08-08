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
import type { CatalogProduct, CatalogVariant } from "@fixmyfeed/domain";
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
import {
  buildChangeSetPreview,
  resolveExecutionStatus,
  type ExecutionOutcome,
  type RepairChange,
  type RollbackSource,
  type WritebackInstruction,
  type WritebackPort,
} from "@fixmyfeed/repairs";
import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { ExecutionRefDTO, RepairPlanStatusDTO } from "../dto";
import type {
  AuditSink,
  ExecutionStore,
  GovernanceRepository,
  ObservePort,
  RepairAuditEvent,
  RepairQueue,
  RollbackWorkerRepository,
  VerificationWorkerRepository,
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
    async getRetryTarget(scope, sourceExecutionId) {
      const [exec] = await db
        .select({ planId: repairExecutions.planId, failedItems: repairExecutions.failedItems })
        .from(repairExecutions)
        .where(
          and(
            eq(repairExecutions.organizationId, scope.organizationId),
            eq(repairExecutions.id, sourceExecutionId),
          ),
        )
        .limit(1);
      if (!exec) return null;
      return { planId: exec.planId, failedItems: exec.failedItems };
    },
    createRetryExecution: (scope, sourceExecutionId, idempotencyKey) =>
      createRecoveryExecution(db, scope, "apply", sourceExecutionId, idempotencyKey),
    async getRollbackTarget(scope, sourceExecutionId) {
      const [exec] = await db
        .select({ planId: repairExecutions.planId })
        .from(repairExecutions)
        .where(
          and(
            eq(repairExecutions.organizationId, scope.organizationId),
            eq(repairExecutions.id, sourceExecutionId),
          ),
        )
        .limit(1);
      if (!exec) return null;
      const rows = await db
        .select({ id: repairExecutionItems.id })
        .from(repairExecutionItems)
        .where(
          and(
            eq(repairExecutionItems.organizationId, scope.organizationId),
            eq(repairExecutionItems.executionId, sourceExecutionId),
            eq(repairExecutionItems.status, "verified"),
            isNotNull(repairExecutionItems.beforeValue),
          ),
        );
      return { planId: exec.planId, reversibleItems: rows.length };
    },
    createRollbackExecution: (scope, sourceExecutionId, idempotencyKey) =>
      createRecoveryExecution(db, scope, "rollback", sourceExecutionId, idempotencyKey),
  };
}

/**
 * Idempotently creates a queued recovery execution (`apply` retry / `rollback`)
 * linked to the source execution, mirroring the (org, idempotencyKey) dedupe of
 * a first apply. Resolves the plan id from the source execution.
 */
async function createRecoveryExecution(
  db: DatabaseClient["db"],
  scope: TenantScope,
  kind: "apply" | "rollback",
  sourceExecutionId: string,
  idempotencyKey: string,
): Promise<{ executionId: string; created: boolean }> {
  const [source] = await db
    .select({ planId: repairExecutions.planId })
    .from(repairExecutions)
    .where(
      and(
        eq(repairExecutions.organizationId, scope.organizationId),
        eq(repairExecutions.id, sourceExecutionId),
      ),
    )
    .limit(1);
  if (!source) return { executionId: "", created: false };
  const inserted = await db
    .insert(repairExecutions)
    .values({
      organizationId: scope.organizationId,
      planId: source.planId,
      kind,
      sourceExecutionId,
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
        .select({
          planId: repairExecutions.planId,
          status: repairExecutions.status,
          sourceExecutionId: repairExecutions.sourceExecutionId,
        })
        .from(repairExecutions)
        .where(eq(repairExecutions.id, executionId))
        .limit(1);
      if (!exec || (exec.status !== "queued" && exec.status !== "running")) return null;
      // Retry: re-apply only the failed items of the source execution.
      if (exec.sourceExecutionId) {
        const items = await db
          .select({
            productExternalId: repairExecutionItems.productExternalId,
            variantExternalId: repairExecutionItems.variantExternalId,
            field: repairExecutionItems.field,
            beforeValue: repairExecutionItems.beforeValue,
            afterValue: repairExecutionItems.afterValue,
          })
          .from(repairExecutionItems)
          .where(
            and(
              eq(repairExecutionItems.executionId, exec.sourceExecutionId),
              eq(repairExecutionItems.status, "failed"),
            ),
          );
        return { planId: exec.planId, changes: items.map(itemToRepairChange) };
      }
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

/**
 * Applies a writeback instruction to a stored catalog product payload (pure).
 * Returns the updated payload and whether the target existed — a variant
 * instruction whose variant is absent is a no-op (`applied: false`).
 */
export function applyInstructionToPayload(
  payload: unknown,
  instruction: WritebackInstruction,
): { payload: Record<string, unknown>; applied: boolean } {
  const next: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
  if (instruction.variantExternalId !== null) {
    const source = Array.isArray(next.variants) ? (next.variants as Record<string, unknown>[]) : [];
    const index = source.findIndex((v) => v.externalId === instruction.variantExternalId);
    if (index === -1) return { payload: next, applied: false };
    const variants = source.map((v) => ({ ...v }));
    variants[index] = { ...variants[index], [instruction.field]: instruction.after };
    next.variants = variants;
    return { payload: next, applied: true };
  }
  next[instruction.field] = instruction.after;
  return { payload: next, applied: true };
}

/**
 * A `WritebackPort` that applies changes to the tenant's stored catalog product
 * payload (the writeback "transport" for T159 E2E / test services). The paired
 * `ObservePort` (`createObservePort`) then re-reads the same store to verify the
 * change stuck. Production swaps a connector HTTP transport; the observe side
 * becomes a connector re-fetch.
 */
export function createCatalogWritebackPort(
  client: DatabaseClient,
  organizationId: string,
): WritebackPort {
  const db = client.db;
  return {
    async apply(instruction) {
      const [row] = await db
        .select({ id: catalogProducts.id, payload: catalogProducts.payload })
        .from(catalogProducts)
        .where(
          and(
            eq(catalogProducts.organizationId, organizationId),
            eq(catalogProducts.externalId, instruction.productExternalId),
          ),
        )
        .limit(1);
      if (!row) return { ok: false, error: "product_not_found" };
      const result = applyInstructionToPayload(row.payload, instruction);
      if (!result.applied) return { ok: false, error: "variant_not_found" };
      await db
        .update(catalogProducts)
        .set({ payload: result.payload as typeof catalogProducts.$inferInsert.payload })
        .where(eq(catalogProducts.id, row.id));
      return { ok: true, error: null };
    },
  };
}

/** A stored failed item → a minimal `RepairChange` for a retry writeback. */
function itemToRepairChange(item: {
  productExternalId: string;
  variantExternalId: string | null;
  field: string;
  beforeValue: string | null;
  afterValue: string | null;
}): RepairChange {
  return {
    issueCode: "",
    productExternalId: item.productExternalId,
    variantExternalId: item.variantExternalId,
    field: item.field,
    safetyClass: "automatic",
    riskLevel: "low",
    currentValue: item.beforeValue,
    proposedValue: item.afterValue,
    requiresInput: false,
  };
}

const asString = (value: unknown): string | null => (typeof value === "string" ? value : null);

/** Re-reads a field's current value from a stored catalog product payload. */
function readObservedField(
  product: CatalogProduct,
  instruction: WritebackInstruction,
): string | null {
  if (instruction.variantExternalId !== null) {
    const variant = product.variants.find((v) => v.externalId === instruction.variantExternalId);
    if (!variant) return null;
    return asString(variant[instruction.field as keyof CatalogVariant]);
  }
  return asString(product[instruction.field as keyof CatalogProduct]);
}

/**
 * Concrete `ObservePort` reading the field's current value from the stored
 * catalog product payload (org-scoped). T159 swaps in a connector re-fetch for
 * authoritative live observation; this reflects the last-imported catalog state.
 */
export function createObservePort(client: DatabaseClient, organizationId: string): ObservePort {
  const db = client.db;
  return {
    async observe(instruction) {
      const [row] = await db
        .select({ payload: catalogProducts.payload })
        .from(catalogProducts)
        .where(
          and(
            eq(catalogProducts.organizationId, organizationId),
            eq(catalogProducts.externalId, instruction.productExternalId),
          ),
        )
        .limit(1);
      if (!row) return null;
      return readObservedField(row.payload as CatalogProduct, instruction);
    },
  };
}

/** Condition matching a stored item's (optional) variant id exactly. */
function variantMatch(variantExternalId: string | null) {
  return variantExternalId === null
    ? isNull(repairExecutionItems.variantExternalId)
    : eq(repairExecutionItems.variantExternalId, variantExternalId);
}

/**
 * Verification worker repository (T095): reconstructs the apply outcome from the
 * stored execution items, and persists per-item `verified`/`failed` statuses and
 * the execution/plan status after verification.
 */
export function createVerificationWorkerRepository(
  client: DatabaseClient,
): VerificationWorkerRepository {
  const db = client.db;
  return {
    async loadVerificationWork(executionId) {
      const [exec] = await db
        .select({ planId: repairExecutions.planId })
        .from(repairExecutions)
        .where(eq(repairExecutions.id, executionId))
        .limit(1);
      if (!exec) return null;
      const rows = await db
        .select({
          productExternalId: repairExecutionItems.productExternalId,
          variantExternalId: repairExecutionItems.variantExternalId,
          field: repairExecutionItems.field,
          beforeValue: repairExecutionItems.beforeValue,
          afterValue: repairExecutionItems.afterValue,
          status: repairExecutionItems.status,
          error: repairExecutionItems.error,
        })
        .from(repairExecutionItems)
        .where(eq(repairExecutionItems.executionId, executionId));
      let succeeded = 0;
      let failed = 0;
      const items = rows.map((r) => {
        const ok = r.status === "succeeded";
        if (ok) succeeded += 1;
        else failed += 1;
        return {
          instruction: {
            productExternalId: r.productExternalId,
            variantExternalId: r.variantExternalId,
            field: r.field,
            before: r.beforeValue,
            after: r.afterValue ?? "",
          },
          status: (ok ? "succeeded" : "failed") as "succeeded" | "failed",
          error: ok ? null : r.error,
        };
      });
      const outcome: ExecutionOutcome = {
        items,
        total: items.length,
        succeeded,
        failed,
        status: resolveExecutionStatus(succeeded, failed),
      };
      return { planId: exec.planId, outcome };
    },
    async persistVerification(executionId, planId, verification) {
      for (const item of verification.items) {
        await db
          .update(repairExecutionItems)
          .set({ status: item.status, error: item.error })
          .where(
            and(
              eq(repairExecutionItems.executionId, executionId),
              eq(repairExecutionItems.productExternalId, item.instruction.productExternalId),
              eq(repairExecutionItems.field, item.instruction.field),
              variantMatch(item.instruction.variantExternalId),
            ),
          );
      }
      await db
        .update(repairExecutions)
        .set({
          status: verification.status,
          succeededItems: verification.verified,
          failedItems: verification.failed,
          completedAt: new Date(),
        })
        .where(eq(repairExecutions.id, executionId));
      const planStatus: RepairPlanStatusDTO =
        verification.status === "completed"
          ? "completed"
          : verification.status === "partially_completed"
            ? "partially_completed"
            : "failed";
      await db.update(repairPlans).set({ status: planStatus }).where(eq(repairPlans.id, planId));
    },
  };
}

/**
 * Rollback worker repository (T096): loads the verified items of the source
 * execution to reverse, and persists the rollback run's item/execution/plan
 * statuses.
 */
export function createRollbackWorkerRepository(client: DatabaseClient): RollbackWorkerRepository {
  const db = client.db;
  return {
    async loadRollbackWork(executionId) {
      const [exec] = await db
        .select({
          planId: repairExecutions.planId,
          status: repairExecutions.status,
          sourceExecutionId: repairExecutions.sourceExecutionId,
        })
        .from(repairExecutions)
        .where(eq(repairExecutions.id, executionId))
        .limit(1);
      if (
        !exec ||
        !exec.sourceExecutionId ||
        (exec.status !== "queued" && exec.status !== "running")
      ) {
        return null;
      }
      const rows = await db
        .select({
          productExternalId: repairExecutionItems.productExternalId,
          variantExternalId: repairExecutionItems.variantExternalId,
          field: repairExecutionItems.field,
          beforeValue: repairExecutionItems.beforeValue,
          afterValue: repairExecutionItems.afterValue,
        })
        .from(repairExecutionItems)
        .where(
          and(
            eq(repairExecutionItems.executionId, exec.sourceExecutionId),
            eq(repairExecutionItems.status, "verified"),
          ),
        );
      const items: RollbackSource[] = rows.map((r) => ({
        productExternalId: r.productExternalId,
        variantExternalId: r.variantExternalId,
        field: r.field,
        afterValue: r.afterValue,
        beforeValue: r.beforeValue,
        status: "verified",
      }));
      return { planId: exec.planId, items };
    },
    async markRunning(executionId) {
      await db
        .update(repairExecutions)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(repairExecutions.id, executionId));
    },
    async persistRollbackOutcome(executionId, planId, outcome) {
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
            status: (item.status === "succeeded" ? "rolled_back" : "failed") as
              "rolled_back" | "failed",
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
      const planStatus: RepairPlanStatusDTO = outcome.succeeded > 0 ? "rolled_back" : "failed";
      await db.update(repairPlans).set({ status: planStatus }).where(eq(repairPlans.id, planId));
    },
  };
}
