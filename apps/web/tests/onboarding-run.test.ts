/**
 * Onboarding journey orchestration tests (task T166).
 */
import { describe, it, expect, vi } from "vitest";
import {
  runOnboardingImportScan,
  type OnboardingPorts,
  type OnboardingStore,
} from "../lib/server/onboarding-run";

function fakeStore() {
  const calls: string[] = [];
  const store: OnboardingStore = {
    markRunning: vi.fn(async () => {
      calls.push("running");
    }),
    setProgress: vi.fn(async (_id, p) => {
      calls.push(`progress:${p}`);
    }),
    complete: vi.fn(async () => {
      calls.push("complete");
    }),
    fail: vi.fn(async () => {
      calls.push("fail");
    }),
  };
  return { store, calls };
}

describe("runOnboardingImportScan", () => {
  it("imports, scans, records progress, and completes with the first result", async () => {
    const { store, calls } = fakeStore();
    const ports: OnboardingPorts = {
      importCatalog: vi.fn(async () => ({ productCount: 42 })),
      runScan: vi.fn(async () => ({ healthScore: 87, issuesFound: 13 })),
    };
    const result = await runOnboardingImportScan("op1", store, ports);
    expect(result).toEqual({ productCount: 42, healthScore: 87, issuesFound: 13 });
    expect(calls).toEqual(["running", "progress:50", "complete"]);
    expect(store.complete).toHaveBeenCalledWith("op1", {
      productCount: 42,
      healthScore: 87,
      issuesFound: 13,
    });
  });

  it("fails terminally (never hangs) when import throws", async () => {
    const { store, calls } = fakeStore();
    const ports: OnboardingPorts = {
      importCatalog: vi.fn(async () => {
        throw new Error("shopify down");
      }),
      runScan: vi.fn(async () => ({ healthScore: 0, issuesFound: 0 })),
    };
    const result = await runOnboardingImportScan("op1", store, ports);
    expect(result).toBeNull();
    expect(store.fail).toHaveBeenCalledWith("op1", "shopify down");
    expect(ports.runScan).not.toHaveBeenCalled();
    expect(calls).toEqual(["running", "fail"]);
  });

  it("fails terminally when the scan throws (after a successful import)", async () => {
    const { store } = fakeStore();
    const ports: OnboardingPorts = {
      importCatalog: vi.fn(async () => ({ productCount: 5 })),
      runScan: vi.fn(async () => {
        throw new Error("scan error");
      }),
    };
    const result = await runOnboardingImportScan("op1", store, ports);
    expect(result).toBeNull();
    expect(store.fail).toHaveBeenCalledWith("op1", "scan error");
  });
});
