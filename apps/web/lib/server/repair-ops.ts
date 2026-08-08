/**
 * Repair approval + asynchronous writeback execution (task T155).
 *
 * The application-boundary contract wiring T093 (approval/four-eyes) and T094
 * (writeback executor) behind injected ports. Approval and execution are separate
 * explicit actions — approval NEVER triggers writeback. Execution is asynchronous:
 * it validates, creates a durable queued `repair_execution`, enqueues a job that
 * carries only the execution id, and returns an `ExecutionRefDTO` immediately; a
 * worker re-reads authoritative state and runs T094 through a concrete
 * `WritebackPort`. Idempotent; the plan is locked from mutation during execution.
 * All I/O is injected (unit-testable); concrete Drizzle/queue/connector adapters
 * are wired in the runtime and verified end-to-end in T159.
 */
import { can, isRole, type Role } from "@fixmyfeed/domain";
import {
  buildRollbackInstructions,
  buildWritebackInstructions,
  evaluateApproval,
  executeRollback,
  executeWriteback,
  planRiskLevel,
  resolvePlanApprovalStatus,
  verifyExecution,
  type ApprovalRecord,
  type ExecutionOutcome,
  type RepairChange,
  type RiskLevel,
  type RollbackSource,
  type VerificationOutcome,
  type WritebackInstruction,
  type WritebackPort,
} from "@fixmyfeed/repairs";
import type { AppContextDTO } from "./context";
import type { ExecutionRefDTO, RepairPlanStatusDTO } from "./dto";
import { appError, AppError, APP_ERROR_CODE } from "./errors";
import { resolveScope, type TenantScope } from "./tenant-scope";

// ── Governance (approval / rejection) ────────────────────────────────────────

/** Server-only plan facts needed for governance (never sent to the client). */
export interface PlanGovernance {
  readonly status: RepairPlanStatusDTO;
  readonly riskLevel: RiskLevel;
  readonly proposerId: string;
  readonly version: number;
}

export interface RepairAuditEvent {
  readonly action:
    | "repair.approved"
    | "repair.rejected"
    | "repair.execution_requested"
    | "repair.execution_started"
    | "repair.execution_completed"
    | "repair.execution_failed"
    | "repair.retry_requested"
    | "repair.rollback_requested"
    | "repair.rollback_completed"
    | "repair.verification_completed";
  readonly planId: string;
  readonly actorId: string;
  readonly executionId?: string;
  readonly outcome: "success" | "failure";
}

export interface AuditSink {
  record(event: RepairAuditEvent): Promise<void>;
}

export interface GovernanceRepository {
  getGovernance(scope: TenantScope, planId: string): Promise<PlanGovernance | null>;
  recordDecision(
    scope: TenantScope,
    planId: string,
    approverId: string,
    decision: "approved" | "rejected",
    note: string | null,
  ): Promise<void>;
  listDecisions(scope: TenantScope, planId: string): Promise<readonly ApprovalRecord[]>;
  setStatus(
    scope: TenantScope,
    planId: string,
    to: RepairPlanStatusDTO,
    expectedVersion: number,
  ): Promise<boolean>;
}

function actorRoles(scope: TenantScope): Role[] {
  return isRole(scope.role) ? [scope.role] : [];
}

/** The approval permission required for a plan's risk level. */
function approvalPermission(
  risk: RiskLevel,
): "repair:approve-low-risk" | "repair:approve-high-risk" {
  return risk === "high" ? "repair:approve-high-risk" : "repair:approve-low-risk";
}

export interface RepairGovernanceService {
  approve(context: AppContextDTO | null, planId: string, note?: string): Promise<void>;
  reject(context: AppContextDTO | null, planId: string, note?: string): Promise<void>;
}

export function createRepairGovernanceService(
  repo: GovernanceRepository,
  audit: AuditSink,
): RepairGovernanceService {
  async function decide(
    context: AppContextDTO | null,
    planId: string,
    decision: "approved" | "rejected",
    note: string | undefined,
  ): Promise<void> {
    const scope = resolveScope(context);
    const gov = await repo.getGovernance(scope, planId);
    if (gov === null) throw appError.notFound("Repair plan not found");
    if (gov.status !== "pending_approval" && gov.status !== "draft") {
      throw appError.validation("Plan is not open for approval", { status: gov.status });
    }
    // Four-eyes: the proposer can never approve their own plan.
    if (decision === "approved" && gov.proposerId === scope.userId) {
      throw appError.forbidden("Proposer cannot approve their own plan");
    }
    const separationOk = gov.proposerId !== scope.userId;
    const permitted = can(actorRoles(scope), approvalPermission(gov.riskLevel), {
      tenantScoped: true,
      requireProposerSeparation: gov.riskLevel === "high",
      proposerSeparationSatisfied: separationOk,
    });
    if (!permitted) throw appError.forbidden("Not permitted to approve this plan");

    await repo.recordDecision(scope, planId, scope.userId, decision, note ?? null);
    const decisions = await repo.listDecisions(scope, planId);
    const evaluation = evaluateApproval({
      proposerId: gov.proposerId,
      riskLevel: gov.riskLevel,
      approvals: decisions,
    });
    const target = resolvePlanApprovalStatus(evaluation);
    if (target !== gov.status) await repo.setStatus(scope, planId, target, gov.version);
    await audit.record({
      action: decision === "approved" ? "repair.approved" : "repair.rejected",
      planId,
      actorId: scope.userId,
      outcome: "success",
    });
  }

  return {
    approve: (context, planId, note) => decide(context, planId, "approved", note),
    reject: (context, planId, note) => decide(context, planId, "rejected", note),
  };
}

// ── Execution readiness guard (pure) ─────────────────────────────────────────

export interface ExecutionReadiness {
  readonly status: RepairPlanStatusDTO;
  readonly hasNeedsInput: boolean;
  readonly hasConflict: boolean;
  readonly connectorCapable: boolean;
}

/**
 * Throws unless the plan may execute: it must be `approved`, have no unresolved
 * assisted inputs, no conflicts, and a capable connector. Deterministic.
 */
export function assertExecutable(readiness: ExecutionReadiness): void {
  if (readiness.status !== "approved") {
    throw new AppError(APP_ERROR_CODE.FORBIDDEN, "Plan is not approved for execution", {
      details: { status: readiness.status },
    });
  }
  if (readiness.hasNeedsInput) {
    throw appError.validation("Resolve all assisted inputs before executing");
  }
  if (readiness.hasConflict) {
    throw new AppError(APP_ERROR_CODE.CONFLICT, "Resolve all conflicts before executing");
  }
  if (!readiness.connectorCapable) {
    throw new AppError(APP_ERROR_CODE.UPSTREAM, "Connector cannot accept writeback right now");
  }
}

// ── Asynchronous execution ───────────────────────────────────────────────────

export interface ExecutionStore {
  /** Authoritative readiness + version for the plan. */
  getReadiness(
    scope: TenantScope,
    planId: string,
  ): Promise<(ExecutionReadiness & { version: number }) | null>;
  /**
   * Idempotently creates a queued execution for (plan, idempotencyKey). Returns
   * the durable execution id and whether it was newly created.
   */
  createQueuedExecution(
    scope: TenantScope,
    planId: string,
    idempotencyKey: string,
  ): Promise<{ executionId: string; created: boolean }>;
  /** Locks the plan (status → executing) for the expected version. */
  lockPlan(scope: TenantScope, planId: string, expectedVersion: number): Promise<boolean>;
  getExecution(scope: TenantScope, executionId: string): Promise<ExecutionRefDTO | null>;
  /** How many items of a source execution failed (are retryable). */
  getRetryTarget(
    scope: TenantScope,
    sourceExecutionId: string,
  ): Promise<{ planId: string; failedItems: number } | null>;
  /**
   * Idempotently creates a queued `apply` execution that re-applies only the
   * failed items of `sourceExecutionId` (a new durable execution id).
   */
  createRetryExecution(
    scope: TenantScope,
    sourceExecutionId: string,
    idempotencyKey: string,
  ): Promise<{ executionId: string; created: boolean }>;
  /** How many items of a source execution verified (are reversible). */
  getRollbackTarget(
    scope: TenantScope,
    sourceExecutionId: string,
  ): Promise<{ planId: string; reversibleItems: number } | null>;
  /**
   * Idempotently creates a queued `rollback` execution that reverses the verified
   * items of `sourceExecutionId` (a new durable execution id).
   */
  createRollbackExecution(
    scope: TenantScope,
    sourceExecutionId: string,
    idempotencyKey: string,
  ): Promise<{ executionId: string; created: boolean }>;
}

export interface RepairQueue {
  enqueue(job: {
    readonly executionId: string;
    readonly tenantId: string;
    readonly principalUserId: string;
  }): Promise<void>;
}

export interface RepairExecutionService {
  requestExecution(
    context: AppContextDTO | null,
    planId: string,
    idempotencyKey: string,
  ): Promise<ExecutionRefDTO>;
  /** Re-applies only the failed items of a prior execution (new execution id). */
  retryExecution(
    context: AppContextDTO | null,
    sourceExecutionId: string,
    idempotencyKey: string,
  ): Promise<ExecutionRefDTO>;
  /**
   * Reverses the verified items of a prior execution (a `rollback`-kind
   * execution). Requires a recent re-authentication (`rollback:execute`).
   */
  rollbackExecution(
    context: AppContextDTO | null,
    sourceExecutionId: string,
    idempotencyKey: string,
    options: { readonly recentlyAuthenticated: boolean },
  ): Promise<ExecutionRefDTO>;
  getExecution(context: AppContextDTO | null, executionId: string): Promise<ExecutionRefDTO>;
}

export function createRepairExecutionService(
  store: ExecutionStore,
  queue: RepairQueue,
  audit: AuditSink,
): RepairExecutionService {
  return {
    async requestExecution(context, planId, idempotencyKey) {
      const scope = resolveScope(context);
      if (
        !can(actorRoles(scope), "writeback:execute", { tenantScoped: true, approvedPlan: true })
      ) {
        throw appError.forbidden("Not permitted to execute repairs");
      }
      const readiness = await store.getReadiness(scope, planId);
      if (readiness === null) throw appError.notFound("Repair plan not found");
      assertExecutable(readiness);

      // Idempotent: duplicate requests return the same execution, no re-enqueue.
      const { executionId, created } = await store.createQueuedExecution(
        scope,
        planId,
        idempotencyKey,
      );
      if (created) {
        await store.lockPlan(scope, planId, readiness.version);
        await queue.enqueue({
          executionId,
          tenantId: scope.organizationId,
          principalUserId: scope.userId,
        });
        await audit.record({
          action: "repair.execution_requested",
          planId,
          actorId: scope.userId,
          executionId,
          outcome: "success",
        });
      }
      return { executionId, kind: "repair_apply", status: "queued" };
    },
    async retryExecution(context, sourceExecutionId, idempotencyKey) {
      const scope = resolveScope(context);
      if (
        !can(actorRoles(scope), "writeback:execute", { tenantScoped: true, approvedPlan: true })
      ) {
        throw appError.forbidden("Not permitted to execute repairs");
      }
      const target = await store.getRetryTarget(scope, sourceExecutionId);
      if (target === null) throw appError.notFound("Execution not found");
      if (target.failedItems === 0) {
        throw appError.validation("No failed items to retry");
      }
      const { executionId, created } = await store.createRetryExecution(
        scope,
        sourceExecutionId,
        idempotencyKey,
      );
      if (created) {
        await queue.enqueue({
          executionId,
          tenantId: scope.organizationId,
          principalUserId: scope.userId,
        });
        await audit.record({
          action: "repair.retry_requested",
          planId: target.planId,
          actorId: scope.userId,
          executionId,
          outcome: "success",
        });
      }
      return { executionId, kind: "repair_apply", status: "queued" };
    },
    async rollbackExecution(context, sourceExecutionId, idempotencyKey, options) {
      const scope = resolveScope(context);
      if (
        !can(actorRoles(scope), "rollback:execute", {
          tenantScoped: true,
          recentAuthentication: options.recentlyAuthenticated,
        })
      ) {
        throw appError.forbidden("Not permitted to roll back repairs");
      }
      const target = await store.getRollbackTarget(scope, sourceExecutionId);
      if (target === null) throw appError.notFound("Execution not found");
      if (target.reversibleItems === 0) {
        throw appError.validation("No verified items to roll back");
      }
      const { executionId, created } = await store.createRollbackExecution(
        scope,
        sourceExecutionId,
        idempotencyKey,
      );
      if (created) {
        await queue.enqueue({
          executionId,
          tenantId: scope.organizationId,
          principalUserId: scope.userId,
        });
        await audit.record({
          action: "repair.rollback_requested",
          planId: target.planId,
          actorId: scope.userId,
          executionId,
          outcome: "success",
        });
      }
      return { executionId, kind: "repair_rollback", status: "queued" };
    },
    async getExecution(context, executionId) {
      const scope = resolveScope(context);
      const execution = await store.getExecution(scope, executionId);
      if (execution === null) throw appError.notFound("Execution not found");
      return execution;
    },
  };
}

// ── Worker orchestration (T094 inside the worker) ────────────────────────────

export interface WorkerRepository {
  /** Re-reads authoritative plan changes for a queued/running execution. */
  loadExecutionWork(
    executionId: string,
  ): Promise<{ planId: string; changes: readonly RepairChange[] } | null>;
  markRunning(executionId: string): Promise<void>;
  persistOutcome(
    executionId: string,
    planId: string,
    outcome: Awaited<ReturnType<typeof executeWriteback>>,
  ): Promise<void>;
}

/**
 * Runs a queued repair execution inside the worker: re-reads authoritative state,
 * builds instructions, applies them through the concrete `WritebackPort` (T094),
 * and persists item results + counters/status. Never trusts a serialized plan
 * from the job — the job carries only the execution id.
 */
export async function runRepairExecution(
  executionId: string,
  repo: WorkerRepository,
  port: WritebackPort,
  audit: AuditSink,
  actorId: string,
): Promise<void> {
  const work = await repo.loadExecutionWork(executionId);
  if (work === null) return; // already finalized or missing
  await repo.markRunning(executionId);
  await audit.record({
    action: "repair.execution_started",
    planId: work.planId,
    actorId,
    executionId,
    outcome: "success",
  });
  const instructions = buildWritebackInstructions(work.changes);
  const outcome = await executeWriteback(instructions, port);
  await repo.persistOutcome(executionId, work.planId, outcome);
  await audit.record({
    action: outcome.status === "failed" ? "repair.execution_failed" : "repair.execution_completed",
    planId: work.planId,
    actorId,
    executionId,
    outcome: outcome.status === "failed" ? "failure" : "success",
  });
}

// ── Verification (T095 inside the worker) ────────────────────────────────────

/** Re-observes a field's live value for an instruction (connector/catalog read). */
export interface ObservePort {
  observe(instruction: WritebackInstruction): Promise<string | null>;
}

export interface VerificationWorkerRepository {
  /** Reconstructs the apply outcome (succeeded/failed items) for an execution. */
  loadVerificationWork(
    executionId: string,
  ): Promise<{ planId: string; outcome: ExecutionOutcome } | null>;
  /** Persists per-item `verified`/`failed` statuses and the execution status. */
  persistVerification(
    executionId: string,
    planId: string,
    verification: VerificationOutcome,
  ): Promise<void>;
}

function instructionKey(instruction: WritebackInstruction): string {
  return `${instruction.productExternalId} ${instruction.variantExternalId ?? ""} ${instruction.field}`;
}

/**
 * Verifies a completed apply execution inside the worker: re-observes each
 * written field and, via T095 `verifyExecution`, marks items `verified` or
 * `failed` (the write did not stick). This is the ONLY place that reports
 * "verified." Observation is pre-fetched (async), then handed to the pure
 * verifier. Returns null when the execution is missing/finalized.
 */
export async function runRepairVerification(
  executionId: string,
  repo: VerificationWorkerRepository,
  observe: ObservePort,
  audit: AuditSink,
  actorId: string,
): Promise<VerificationOutcome | null> {
  const work = await repo.loadVerificationWork(executionId);
  if (work === null) return null;
  const observed = new Map<string, string | null>();
  for (const item of work.outcome.items) {
    if (item.status !== "succeeded") continue;
    observed.set(instructionKey(item.instruction), await observe.observe(item.instruction));
  }
  const verification = verifyExecution(work.outcome, (instruction) => {
    const key = instructionKey(instruction);
    return observed.has(key) ? (observed.get(key) ?? null) : null;
  });
  await repo.persistVerification(executionId, work.planId, verification);
  await audit.record({
    action: "repair.verification_completed",
    planId: work.planId,
    actorId,
    executionId,
    outcome: verification.failed === 0 ? "success" : "failure",
  });
  return verification;
}

// ── Rollback (T096 inside the worker) ────────────────────────────────────────

export interface RollbackWorkerRepository {
  /** The verified items of the source execution this rollback reverses. */
  loadRollbackWork(
    executionId: string,
  ): Promise<{ planId: string; items: readonly RollbackSource[] } | null>;
  markRunning(executionId: string): Promise<void>;
  persistRollbackOutcome(
    executionId: string,
    planId: string,
    outcome: ExecutionOutcome,
  ): Promise<void>;
}

/**
 * Runs a queued rollback execution inside the worker: re-reads the source
 * execution's verified items, builds inverse instructions (T096), applies them
 * through the concrete `WritebackPort`, and persists item results + status.
 * Never trusts a serialized plan — the job carries only the execution id.
 */
export async function runRepairRollback(
  executionId: string,
  repo: RollbackWorkerRepository,
  port: WritebackPort,
  audit: AuditSink,
  actorId: string,
): Promise<void> {
  const work = await repo.loadRollbackWork(executionId);
  if (work === null) return;
  await repo.markRunning(executionId);
  const instructions = buildRollbackInstructions(work.items);
  const outcome = await executeRollback(instructions, port);
  await repo.persistRollbackOutcome(executionId, work.planId, outcome);
  await audit.record({
    action: outcome.status === "failed" ? "repair.execution_failed" : "repair.rollback_completed",
    planId: work.planId,
    actorId,
    executionId,
    outcome: outcome.status === "failed" ? "failure" : "success",
  });
}

/** Re-export for adapters computing a plan's risk from its changes. */
export { planRiskLevel };
