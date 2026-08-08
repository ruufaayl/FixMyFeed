/**
 * Repairs repository adapter (task T154) — server-only.
 *
 * Implements `RepairsRepository` over Drizzle, scoped by `organizationId`. Loads a
 * repair plan, recomputes its change-set preview against the live catalog using
 * the domain engine (T092 `buildChangeSetPreview`, so `needs_input` and `conflict`
 * states are real), and maps approvals + latest execution to DTOs. Query behavior
 * is verified end-to-end in T159.
 */
import type { CatalogProduct } from "@fixmyfeed/domain";
import {
  catalogProducts,
  repairApprovals,
  repairExecutionItems,
  repairExecutions,
  repairPlans,
  type DatabaseClient,
} from "@fixmyfeed/database";
import { buildChangeSetPreview, type RepairChange } from "@fixmyfeed/repairs";
import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import { appError } from "../errors";
import type { ApprovalDTO, RepairExceptionDTO, RepairExecutionDTO, RepairPlanDTO } from "../dto";
import type { RepairsRepository } from "../services";
import type { TenantScope } from "../tenant-scope";
import {
  isDisplayableStatus,
  requiredApprovalsFor,
  toPreviewEntryDTO,
  toRepairChangeDTO,
} from "./repairs-mappers";

export function createRepairsRepository(client: DatabaseClient): RepairsRepository {
  const db = client.db;

  async function loadPlan(
    scope: TenantScope,
    where: SQL | undefined,
  ): Promise<RepairPlanDTO | null> {
    const [row] = await db
      .select({
        id: repairPlans.id,
        catalogId: repairPlans.catalogId,
        status: repairPlans.status,
        changeSet: repairPlans.changeSet,
        riskLevel: repairPlans.riskLevel,
        baselineFingerprints: repairPlans.baselineFingerprints,
      })
      .from(repairPlans)
      .where(where)
      .orderBy(desc(repairPlans.createdAt))
      .limit(1);
    if (!row) return null;

    const changes = (row.changeSet as RepairChange[]) ?? [];
    const productIds = [
      ...new Set(changes.map((c) => c.productExternalId).filter((id): id is string => id !== "")),
    ];
    const productRows =
      productIds.length === 0
        ? []
        : await db
            .select({ payload: catalogProducts.payload })
            .from(catalogProducts)
            .where(
              and(
                eq(catalogProducts.organizationId, scope.organizationId),
                eq(catalogProducts.catalogId, row.catalogId),
                inArray(catalogProducts.externalId, productIds),
              ),
            );
    const products = productRows.map((p) => p.payload as CatalogProduct);
    const baselineFingerprints = new Map(
      Object.entries((row.baselineFingerprints as Record<string, string>) ?? {}),
    );

    const preview = buildChangeSetPreview({
      plan: {
        changes,
        summary: { total: changes.length, automatic: 0, assisted: 0, manual: 0, requiresInput: 0 },
      },
      products,
      baselineFingerprints,
    });

    const approvalRows = await db
      .select({
        approverId: repairApprovals.approverId,
        decision: repairApprovals.decision,
        note: repairApprovals.note,
        createdAt: repairApprovals.createdAt,
      })
      .from(repairApprovals)
      .where(eq(repairApprovals.planId, row.id));
    const approvals: ApprovalDTO[] = approvalRows.map((a) => ({
      approverId: a.approverId,
      decision: a.decision,
      note: a.note,
      at: a.createdAt.toISOString(),
    }));

    const [execRow] = await db
      .select({
        id: repairExecutions.id,
        kind: repairExecutions.kind,
        status: repairExecutions.status,
        total: repairExecutions.totalItems,
        succeeded: repairExecutions.succeededItems,
        failed: repairExecutions.failedItems,
      })
      .from(repairExecutions)
      .where(eq(repairExecutions.planId, row.id))
      .orderBy(desc(repairExecutions.createdAt))
      .limit(1);
    const execution: RepairExecutionDTO | null = execRow
      ? {
          id: execRow.id,
          kind: execRow.kind,
          status: execRow.status,
          total: execRow.total,
          succeeded: execRow.succeeded,
          failed: execRow.failed,
        }
      : null;

    return {
      id: row.id,
      status: isDisplayableStatus(row.status) ? row.status : "draft",
      riskLevel: row.riskLevel,
      changes: changes.map(toRepairChangeDTO),
      preview: preview.entries.map(toPreviewEntryDTO),
      approvals,
      requiredApprovals: requiredApprovalsFor(row.riskLevel),
      execution,
    };
  }

  return {
    getPlan: (scope, planId) =>
      loadPlan(
        scope,
        and(eq(repairPlans.organizationId, scope.organizationId), eq(repairPlans.id, planId)),
      ),
    getLatestPlan: (scope) => loadPlan(scope, eq(repairPlans.organizationId, scope.organizationId)),
    async listExceptions(scope, executionId): Promise<readonly RepairExceptionDTO[]> {
      const rows = await db
        .select({
          itemId: repairExecutionItems.id,
          productExternalId: repairExecutionItems.productExternalId,
          variantExternalId: repairExecutionItems.variantExternalId,
          field: repairExecutionItems.field,
          before: repairExecutionItems.beforeValue,
          after: repairExecutionItems.afterValue,
          error: repairExecutionItems.error,
        })
        .from(repairExecutionItems)
        .where(
          and(
            eq(repairExecutionItems.organizationId, scope.organizationId),
            eq(repairExecutionItems.executionId, executionId),
            eq(repairExecutionItems.status, "failed"),
          ),
        );
      return rows.map((r) => {
        // Verification (T095) stores unstuck writes as `failed` with the sentinel
        // error "not_verified"; hard writeback failures carry the real error.
        const notVerified = r.error === "not_verified";
        return {
          itemId: r.itemId,
          productExternalId: r.productExternalId,
          variantExternalId: r.variantExternalId,
          field: r.field,
          status: (notVerified ? "not_verified" : "failed") as "not_verified" | "failed",
          error: notVerified ? null : r.error,
          before: r.before,
          after: r.after,
          observed: null,
        };
      });
    },
    async resolveChange(scope, planId, ref, value): Promise<void> {
      const [row] = await db
        .select({
          changeSet: repairPlans.changeSet,
          version: repairPlans.version,
          status: repairPlans.status,
        })
        .from(repairPlans)
        .where(
          and(eq(repairPlans.organizationId, scope.organizationId), eq(repairPlans.id, planId)),
        )
        .limit(1);
      if (!row) throw appError.notFound("Repair plan not found");
      // The plan is locked from change edits once it leaves the planning phase.
      if (row.status !== "draft" && row.status !== "pending_approval") {
        throw appError.validation("Plan can no longer be edited", { status: row.status });
      }

      const changes = (row.changeSet as RepairChange[]).map((c) =>
        c.productExternalId === ref.productExternalId && c.field === ref.field
          ? { ...c, proposedValue: value, requiresInput: false }
          : c,
      );
      await db
        .update(repairPlans)
        .set({
          changeSet: changes as unknown as (typeof repairPlans.$inferInsert)["changeSet"],
          version: row.version + 1,
        })
        .where(
          and(
            eq(repairPlans.organizationId, scope.organizationId),
            eq(repairPlans.id, planId),
            eq(repairPlans.version, row.version),
          ),
        );
    },
  };
}
