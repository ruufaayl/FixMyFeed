/**
 * Typed application boundary tests (task T151).
 *
 * Covers cross-tenant rejection, missing workspace, empty data, derived/estimated
 * values, pagination/filter/sort validation, and error normalization — using
 * injected fake repositories (no database).
 */
import { describe, it, expect } from "vitest";
import type { AppContextDTO } from "../lib/server/context";
import { APP_ERROR_CODE, AppError, isAppError, normalizeError } from "../lib/server/errors";
import { validatePageRequest, validateDateRange } from "../lib/server/query";
import { resolveScope } from "../lib/server/tenant-scope";
import {
  createCatalogService,
  createOverviewService,
  createIssuesService,
  type CatalogRepository,
  type OverviewRepository,
  type IssuesRepository,
} from "../lib/server/services";

const context: AppContextDTO = {
  user: { id: "u1", name: "A", email: "a@example.test" },
  workspaces: [
    { id: "w1", organizationId: "o1", name: "Acme", role: "owner" },
    { id: "w2", organizationId: "o2", name: "Globex", role: "editor" },
  ],
  activeWorkspaceId: "w1",
};

describe("resolveScope (tenant safety)", () => {
  it("throws UNAUTHENTICATED with no context", () => {
    expect(() => resolveScope(null)).toThrowError(
      expect.objectContaining({ code: APP_ERROR_CODE.UNAUTHENTICATED }),
    );
  });

  it("resolves org from the matched membership, not client input", () => {
    expect(resolveScope(context, "w2")).toMatchObject({ organizationId: "o2", workspaceId: "w2" });
    expect(resolveScope(context).organizationId).toBe("o1"); // active default
  });

  it("rejects a workspace the user does not belong to (cross-tenant)", () => {
    expect(() => resolveScope(context, "someone-elses")).toThrowError(
      expect.objectContaining({ code: APP_ERROR_CODE.FORBIDDEN }),
    );
  });

  it("throws NOT_FOUND when the user has no active/known workspace", () => {
    const noWs: AppContextDTO = { ...context, workspaces: [], activeWorkspaceId: null };
    expect(() => resolveScope(noWs)).toThrowError(
      expect.objectContaining({ code: APP_ERROR_CODE.NOT_FOUND }),
    );
  });
});

describe("query validation", () => {
  it("validatePageRequest enforces positive, bounded limits", () => {
    expect(validatePageRequest({ limit: 10 })).toEqual({ cursor: null, limit: 10 });
    expect(() => validatePageRequest({ limit: 0 })).toThrow(AppError);
    expect(() => validatePageRequest({ limit: 5000 })).toThrow(AppError);
  });

  it("validateDateRange rejects reversed/invalid ranges", () => {
    expect(validateDateRange({ from: "2026-01-01", to: "2026-02-01" }).from).toBe("2026-01-01");
    expect(() => validateDateRange({ from: "2026-02-01", to: "2026-01-01" })).toThrow(AppError);
    expect(() => validateDateRange({ from: "nope", to: "nope" })).toThrow(AppError);
  });
});

describe("error normalization", () => {
  it("passes AppError through and wraps unknown errors opaquely", () => {
    const app = new AppError(APP_ERROR_CODE.FORBIDDEN, "no");
    expect(normalizeError(app)).toBe(app);
    const wrapped = normalizeError(new Error("secret db dsn leaked"));
    expect(isAppError(wrapped)).toBe(true);
    expect(wrapped.code).toBe(APP_ERROR_CODE.INTERNAL);
    expect(wrapped.message).not.toContain("secret");
  });

  it("services normalize repository failures into AppError", async () => {
    const repo: OverviewRepository = {
      loadOverview: async () => {
        throw new Error("pg connection refused 127.0.0.1:5432");
      },
    };
    const service = createOverviewService(repo);
    await expect(service.getOverview(context)).rejects.toMatchObject({
      code: APP_ERROR_CODE.INTERNAL,
    });
  });
});

describe("CatalogService", () => {
  const repo: CatalogRepository = {
    listProducts: async (scope) => ({
      items:
        scope.organizationId === "o1"
          ? [
              {
                id: "p1",
                title: "Widget",
                sku: "W-1",
                price: "9.99",
                availability: "in_stock" as const,
                issueCount: 1,
                worstSeverity: "warning" as const,
              },
            ]
          : [],
      nextCursor: null,
      total: scope.organizationId === "o1" ? 1 : 0,
    }),
    getProductInspector: async () => null,
  };

  it("scopes list results by resolved tenant and returns a Page", async () => {
    const service = createCatalogService(repo);
    const page = await service.listProducts(context);
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(1);
  });

  it("returns empty data cleanly for a workspace with no products", async () => {
    const service = createCatalogService(repo);
    const page = await service.listProducts(context, { workspaceId: "w2" });
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("rejects unknown filter keys and bad pagination before hitting the repo", async () => {
    const service = createCatalogService(repo);
    await expect(service.listProducts(context, { filter: { bogus: "x" } })).rejects.toMatchObject({
      code: APP_ERROR_CODE.VALIDATION,
    });
    await expect(service.listProducts(context, { page: { limit: -1 } })).rejects.toMatchObject({
      code: APP_ERROR_CODE.VALIDATION,
    });
  });

  it("maps a missing product to NOT_FOUND", async () => {
    const service = createCatalogService(repo);
    await expect(service.getProductInspector(context, "missing")).rejects.toMatchObject({
      code: APP_ERROR_CODE.NOT_FOUND,
    });
  });
});

describe("OverviewService / IssuesService provenance", () => {
  it("tags derived + estimated values", async () => {
    const overviewRepo: OverviewRepository = {
      loadOverview: async () => ({
        healthScore: 82,
        productsAffected: 1248,
        criticalIssues: 37,
        repairable: 624,
        integrations: [],
        topSignals: [
          {
            id: "s1",
            title: "Price mismatch",
            severity: "critical",
            affectedCount: 312,
            exposure: 18420,
            confidence: 99,
            sources: [],
            detectedAt: null,
          },
        ],
        recentActivity: [],
      }),
    };
    const overview = await createOverviewService(overviewRepo).getOverview(context);
    expect(overview.healthScore.provenance).toBe("derived");
    expect(overview.productsAffected.provenance).toBe("authoritative");
    expect(overview.topSignals[0]?.exposure?.provenance).toBe("estimated");
  });

  it("issue group exposure is estimated; empty list is clean", async () => {
    const issuesRepo: IssuesRepository = {
      listGroups: async () => [
        {
          id: "g1",
          code: "price_mismatch",
          title: "Price mismatch",
          severity: "critical",
          affectedCount: 312,
          exposure: 18420,
          confidence: 99,
          repairable: true,
        },
      ],
      getEvidence: async () => null,
    };
    const service = createIssuesService(issuesRepo);
    const groups = await service.listGroups(context);
    expect(groups[0]?.exposure?.provenance).toBe("estimated");
    expect(groups[0]?.affectedCount.provenance).toBe("authoritative");
    await expect(service.getEvidence(context, "g1")).rejects.toMatchObject({
      code: APP_ERROR_CODE.NOT_FOUND,
    });
  });
});
