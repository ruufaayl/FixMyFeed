/**
 * Repair-rules service tests (task T157).
 *
 * RBAC (rule:manage for mutations), draft validation → AppError, CRUD delegation,
 * not-found mapping, and simulation — all via an injected fake repository.
 */
import { describe, it, expect, vi } from "vitest";
import type { AppContextDTO } from "../lib/server/context";
import { APP_ERROR_CODE } from "../lib/server/errors";
import { createRepairRulesService, type RepairRulesRepository } from "../lib/server/services";
import type { RepairRuleDTO, RuleDraftDTO, RuleSimulationDTO } from "../lib/server/dto";

const ctx = (role: string): AppContextDTO => ({
  user: { id: "u1", name: "A", email: "a@x.test" },
  workspaces: [{ id: "w1", organizationId: "o1", name: "W", role }],
  activeWorkspaceId: "w1",
});

const ruleDTO: RepairRuleDTO = {
  id: "r1",
  name: "R",
  enabled: true,
  priority: 0,
  definition: {
    match: "all",
    action: "flag",
    conditions: [{ field: "code", op: "eq", values: ["x"] }],
  },
};

const validDraft: RuleDraftDTO = {
  name: "R",
  enabled: true,
  priority: 0,
  definition: {
    match: "all",
    action: "flag",
    conditions: [{ field: "code", op: "eq", values: ["x"] }],
  },
};

function fakeRepo(overrides: Partial<RepairRulesRepository> = {}) {
  const repo: RepairRulesRepository = {
    list: vi.fn(async () => [ruleDTO]),
    create: vi.fn(async () => ruleDTO),
    update: vi.fn(async () => ruleDTO),
    setEnabled: vi.fn(async () => true),
    remove: vi.fn(async () => true),
    simulate: vi.fn(async (): Promise<RuleSimulationDTO> => ({
      entries: [],
      matchedIssues: 0,
      totalIssues: 0,
    })),
    ...overrides,
  };
  return repo;
}

describe("RepairRulesService reads", () => {
  it("lists rules for any member", async () => {
    const svc = createRepairRulesService(fakeRepo());
    expect(await svc.list(ctx("viewer"))).toEqual([ruleDTO]);
  });

  it("simulates for any member", async () => {
    const svc = createRepairRulesService(fakeRepo());
    expect(await svc.simulate(ctx("operator"))).toMatchObject({ totalIssues: 0 });
  });

  it("rejects an unauthenticated context", async () => {
    const svc = createRepairRulesService(fakeRepo());
    await expect(svc.list(null)).rejects.toMatchObject({ code: APP_ERROR_CODE.UNAUTHENTICATED });
  });
});

describe("RepairRulesService mutations (rule:manage)", () => {
  it("lets a manager create a valid rule", async () => {
    const repo = fakeRepo();
    const svc = createRepairRulesService(repo);
    await svc.create(ctx("manager"), validDraft);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it("forbids an operator (insufficient rank) from creating", async () => {
    const repo = fakeRepo();
    const svc = createRepairRulesService(repo);
    await expect(svc.create(ctx("operator"), validDraft)).rejects.toMatchObject({
      code: APP_ERROR_CODE.FORBIDDEN,
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("rejects a draft with no name before hitting the repo", async () => {
    const repo = fakeRepo();
    const svc = createRepairRulesService(repo);
    await expect(svc.create(ctx("manager"), { ...validDraft, name: "  " })).rejects.toMatchObject({
      code: APP_ERROR_CODE.VALIDATION,
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("rejects a draft with an unknown field (deny-by-default)", async () => {
    const repo = fakeRepo();
    const svc = createRepairRulesService(repo);
    await expect(
      svc.create(ctx("manager"), {
        ...validDraft,
        definition: {
          match: "all",
          action: "flag",
          conditions: [{ field: "bogus" as "code", op: "eq", values: ["x"] }],
        },
      }),
    ).rejects.toMatchObject({ code: APP_ERROR_CODE.VALIDATION });
  });

  it("maps a missing rule on update to NOT_FOUND", async () => {
    const repo = fakeRepo({ update: vi.fn(async () => null) });
    const svc = createRepairRulesService(repo);
    await expect(svc.update(ctx("manager"), "missing", validDraft)).rejects.toMatchObject({
      code: APP_ERROR_CODE.NOT_FOUND,
    });
  });

  it("maps a missing rule on delete to NOT_FOUND", async () => {
    const repo = fakeRepo({ remove: vi.fn(async () => false) });
    const svc = createRepairRulesService(repo);
    await expect(svc.remove(ctx("manager"), "missing")).rejects.toMatchObject({
      code: APP_ERROR_CODE.NOT_FOUND,
    });
  });

  it("toggles enabled through the repo", async () => {
    const repo = fakeRepo();
    const svc = createRepairRulesService(repo);
    await svc.setEnabled(ctx("administrator"), "r1", false);
    expect(repo.setEnabled).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "o1" }),
      "r1",
      false,
    );
  });
});
