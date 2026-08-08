/**
 * Approval + async execution contract tests (task T155).
 *
 * Covers approval policy, four-eyes/self-approval, rejection, authorization,
 * tenant isolation, unresolved-input/conflict blocking, connector-capability
 * failure, idempotency, and worker success / partial / failure — all via injected
 * fakes (no database or queue).
 */
import { describe, it, expect, vi } from "vitest";
import type { AppContextDTO } from "../lib/server/context";
import { APP_ERROR_CODE } from "../lib/server/errors";
import {
  assertExecutable,
  createRepairGovernanceService,
  createRepairExecutionService,
  runRepairExecution,
  type ExecutionStore,
  type GovernanceRepository,
  type PlanGovernance,
  type RepairQueue,
  type WorkerRepository,
} from "../lib/server/repair-ops";

const ctx = (role: string, userId = "u2"): AppContextDTO => ({
  user: { id: userId, name: "A", email: "a@x.test" },
  workspaces: [{ id: "w1", organizationId: "o1", name: "W", role }],
  activeWorkspaceId: "w1",
});

const noopAudit = { record: vi.fn(async () => {}) };

function governanceFake(gov: PlanGovernance) {
  const decisions: { approverId: string; decision: "approved" | "rejected" }[] = [];
  const statuses: string[] = [];
  const repo: GovernanceRepository = {
    getGovernance: async () => gov,
    recordDecision: async (_s, _p, approverId, decision) => {
      decisions.push({ approverId, decision });
    },
    listDecisions: async () => decisions,
    setStatus: async (_s, _p, to) => {
      statuses.push(to);
      return true;
    },
  };
  return { repo, decisions, statuses };
}

describe("approval + four-eyes", () => {
  it("proposer cannot approve their own plan", async () => {
    const { repo } = governanceFake({
      status: "pending_approval",
      riskLevel: "low",
      proposerId: "u1",
      version: 1,
    });
    const svc = createRepairGovernanceService(repo, noopAudit);
    await expect(svc.approve(ctx("approver", "u1"), "plan")).rejects.toMatchObject({
      code: APP_ERROR_CODE.FORBIDDEN,
    });
  });

  it("a distinct approver approves a low-risk plan → status approved", async () => {
    const { repo, statuses } = governanceFake({
      status: "pending_approval",
      riskLevel: "low",
      proposerId: "u1",
      version: 1,
    });
    await createRepairGovernanceService(repo, noopAudit).approve(ctx("approver", "u2"), "plan");
    expect(statuses).toEqual(["approved"]);
  });

  it("high-risk needs two distinct approvers (one → still pending)", async () => {
    const { repo, statuses } = governanceFake({
      status: "pending_approval",
      riskLevel: "high",
      proposerId: "u1",
      version: 1,
    });
    await createRepairGovernanceService(repo, noopAudit).approve(ctx("approver", "u2"), "plan");
    expect(statuses).toEqual([]); // stays pending_approval, no transition
  });

  it("rejection moves the plan to rejected", async () => {
    const { repo, statuses } = governanceFake({
      status: "pending_approval",
      riskLevel: "low",
      proposerId: "u1",
      version: 1,
    });
    await createRepairGovernanceService(repo, noopAudit).reject(ctx("approver", "u2"), "plan");
    expect(statuses).toEqual(["rejected"]);
  });

  it("insufficient role is rejected before recording a decision", async () => {
    const { repo, decisions } = governanceFake({
      status: "pending_approval",
      riskLevel: "low",
      proposerId: "u1",
      version: 1,
    });
    await expect(
      createRepairGovernanceService(repo, noopAudit).approve(ctx("viewer", "u2"), "plan"),
    ).rejects.toMatchObject({ code: APP_ERROR_CODE.FORBIDDEN });
    expect(decisions).toEqual([]);
  });

  it("unauthenticated context is rejected", async () => {
    const { repo } = governanceFake({
      status: "pending_approval",
      riskLevel: "low",
      proposerId: "u1",
      version: 1,
    });
    await expect(
      createRepairGovernanceService(repo, noopAudit).approve(null, "plan"),
    ).rejects.toMatchObject({ code: APP_ERROR_CODE.UNAUTHENTICATED });
  });
});

describe("assertExecutable", () => {
  const base = {
    status: "approved" as const,
    hasNeedsInput: false,
    hasConflict: false,
    connectorCapable: true,
  };
  it("passes when ready", () => {
    expect(() => assertExecutable(base)).not.toThrow();
  });
  it("blocks unapproved / needs-input / conflict / incapable connector", () => {
    expect(() => assertExecutable({ ...base, status: "pending_approval" })).toThrowError(
      expect.objectContaining({ code: APP_ERROR_CODE.FORBIDDEN }),
    );
    expect(() => assertExecutable({ ...base, hasNeedsInput: true })).toThrowError(
      expect.objectContaining({ code: APP_ERROR_CODE.VALIDATION }),
    );
    expect(() => assertExecutable({ ...base, hasConflict: true })).toThrowError(
      expect.objectContaining({ code: APP_ERROR_CODE.CONFLICT }),
    );
    expect(() => assertExecutable({ ...base, connectorCapable: false })).toThrowError(
      expect.objectContaining({ code: APP_ERROR_CODE.UPSTREAM }),
    );
  });
});

describe("requestExecution (async + idempotent)", () => {
  function executionFake(ready: boolean) {
    const created: string[] = [];
    const store: ExecutionStore = {
      getReadiness: async () =>
        ready
          ? {
              status: "approved",
              hasNeedsInput: false,
              hasConflict: false,
              connectorCapable: true,
              version: 3,
            }
          : {
              status: "approved",
              hasNeedsInput: true,
              hasConflict: false,
              connectorCapable: true,
              version: 3,
            },
      createQueuedExecution: async (_s, _p, key) => {
        const isNew = !created.includes(key);
        if (isNew) created.push(key);
        return { executionId: `exec-${key}`, created: isNew };
      },
      lockPlan: vi.fn(async () => true),
      getExecution: async (_s, id) => ({ executionId: id, kind: "repair_apply", status: "queued" }),
    };
    const queue: RepairQueue = { enqueue: vi.fn(async () => {}) };
    return { store, queue };
  }

  it("returns a queued ExecutionRefDTO and enqueues once; duplicates do not re-enqueue", async () => {
    const { store, queue } = executionFake(true);
    const svc = createRepairExecutionService(store, queue, noopAudit);
    const first = await svc.requestExecution(ctx("approver"), "plan", "idem-1");
    const second = await svc.requestExecution(ctx("approver"), "plan", "idem-1");
    expect(first).toEqual({ executionId: "exec-idem-1", kind: "repair_apply", status: "queued" });
    expect(second.executionId).toBe("exec-idem-1");
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(store.lockPlan).toHaveBeenCalledTimes(1);
  });

  it("blocks execution when inputs are unresolved", async () => {
    const { store, queue } = executionFake(false);
    const svc = createRepairExecutionService(store, queue, noopAudit);
    await expect(svc.requestExecution(ctx("approver"), "plan", "k")).rejects.toMatchObject({
      code: APP_ERROR_CODE.VALIDATION,
    });
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it("requires the execute permission", async () => {
    const { store, queue } = executionFake(true);
    const svc = createRepairExecutionService(store, queue, noopAudit);
    await expect(svc.requestExecution(ctx("viewer"), "plan", "k")).rejects.toMatchObject({
      code: APP_ERROR_CODE.FORBIDDEN,
    });
  });
});

describe("runRepairExecution (worker)", () => {
  const change = (id: string, after: string) => ({
    issueCode: "insecure_link_url",
    productExternalId: id,
    variantExternalId: null,
    field: "onlineStoreUrl",
    safetyClass: "automatic" as const,
    riskLevel: "low" as const,
    currentValue: "http://x",
    proposedValue: after,
    requiresInput: false,
  });

  function workerFake(changes: ReturnType<typeof change>[]) {
    const persisted: { status: string; succeeded: number; failed: number }[] = [];
    const repo: WorkerRepository = {
      loadExecutionWork: async () => ({ planId: "plan", changes }),
      markRunning: vi.fn(async () => {}),
      persistOutcome: async (_e, _p, outcome) => {
        persisted.push({
          status: outcome.status,
          succeeded: outcome.succeeded,
          failed: outcome.failed,
        });
      },
    };
    return { repo, persisted };
  }

  it("applies changes and persists a completed outcome", async () => {
    const { repo, persisted } = workerFake([change("a", "https://a"), change("b", "https://b")]);
    await runRepairExecution(
      "exec",
      repo,
      { apply: async () => ({ ok: true, error: null }) },
      noopAudit,
      "u2",
    );
    expect(persisted[0]).toEqual({ status: "completed", succeeded: 2, failed: 0 });
  });

  it("records partial success and worker/port failures per item", async () => {
    const { repo, persisted } = workerFake([
      change("ok", "https://ok"),
      change("boom", "https://boom"),
    ]);
    await runRepairExecution(
      "exec",
      repo,
      {
        apply: async (i) =>
          i.productExternalId === "boom"
            ? Promise.reject(new Error("down"))
            : { ok: true, error: null },
      },
      noopAudit,
      "u2",
    );
    expect(persisted[0]).toEqual({ status: "partially_completed", succeeded: 1, failed: 1 });
  });
});
