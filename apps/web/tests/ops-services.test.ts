/**
 * Monitoring / Reports / Integrations service tests (task T158).
 *
 * Mapping (derived provenance), CSV export permission-gating (report:export),
 * and tenant-scope resolution — all via injected fake repositories.
 */
import { describe, it, expect } from "vitest";
import type { AppContextDTO } from "../lib/server/context";
import { APP_ERROR_CODE } from "../lib/server/errors";
import {
  createMonitoringService,
  createReportsService,
  createIntegrationsService,
  type MonitoringRepository,
  type ReportsRepository,
  type IntegrationsRepository,
} from "../lib/server/services";

const ctx = (role: string): AppContextDTO => ({
  user: { id: "u1", name: "A", email: "a@x.test" },
  workspaces: [{ id: "w1", organizationId: "o1", name: "W", role }],
  activeWorkspaceId: "w1",
});

describe("MonitoringService", () => {
  const repo: MonitoringRepository = {
    loadMonitoring: async () => ({
      metrics: [{ id: "m1", label: "Open issues", value: "12", caption: null }],
      events: [
        {
          id: "e1",
          title: "Repair completed",
          meta: "3 changes",
          at: "2026-01-01T00:00:00.000Z",
          tone: "healthy",
        },
      ],
    }),
  };

  it("tags metric values as derived", async () => {
    const svc = createMonitoringService(repo);
    const dto = await svc.getMonitoring(ctx("viewer"), {});
    expect(dto.metrics[0]!.value).toEqual({ value: "12", provenance: "derived" });
    expect(dto.events[0]!.tone).toBe("healthy");
  });

  it("rejects an unauthenticated context", async () => {
    const svc = createMonitoringService(repo);
    await expect(svc.getMonitoring(null, {})).rejects.toMatchObject({
      code: APP_ERROR_CODE.UNAUTHENTICATED,
    });
  });
});

describe("ReportsService", () => {
  const repo: ReportsRepository = {
    listReports: async () => [
      { id: "r1", title: "Catalog health", description: "score", stat: "82" },
      { id: "r2", title: "Open issues", description: null, stat: "1,248" },
    ],
  };

  it("maps report summaries with derived stats", async () => {
    const svc = createReportsService(repo);
    const dtos = await svc.listReports(ctx("viewer"));
    expect(dtos[0]!.stat).toEqual({ value: "82", provenance: "derived" });
  });

  it("exports CSV for a permitted role (report:export = minRank 2)", async () => {
    const svc = createReportsService(repo);
    const csv = await svc.exportCsv(ctx("operator"));
    expect(csv.split("\n")[0]).toBe("Report,Description,Value");
    expect(csv).toContain("Catalog health,score,82");
    expect(csv).toContain('Open issues,,"1,248"'); // comma value is quoted
  });

  it("forbids CSV export for a viewer (insufficient rank)", async () => {
    const svc = createReportsService(repo);
    await expect(svc.exportCsv(ctx("viewer"))).rejects.toMatchObject({
      code: APP_ERROR_CODE.FORBIDDEN,
    });
  });
});

describe("IntegrationsService", () => {
  const repo: IntegrationsRepository = {
    listIntegrations: async () => [
      {
        id: "i1",
        name: "Acme Shopify",
        kind: "source",
        connectState: "connected",
        detail: "shopify",
        lastSyncAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };

  it("returns integrations for a member", async () => {
    const svc = createIntegrationsService(repo);
    const dtos = await svc.listIntegrations(ctx("viewer"));
    expect(dtos[0]).toMatchObject({ name: "Acme Shopify", connectState: "connected" });
  });

  it("rejects an unauthenticated context", async () => {
    const svc = createIntegrationsService(repo);
    await expect(svc.listIntegrations(null)).rejects.toMatchObject({
      code: APP_ERROR_CODE.UNAUTHENTICATED,
    });
  });
});
