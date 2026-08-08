/**
 * Repair outbox consumer tests (task T159).
 *
 * Dispatch by execution kind (apply → worker, rollback → worker), publish on
 * success, retry then dead-letter on failure, and the pure catalog-writeback
 * payload transform — all via injected fakes (no database).
 */
import { describe, it, expect, vi } from "vitest";
import {
  runRepairOutboxOnce,
  type RepairOutboxEvent,
  type RepairOutboxStore,
  type RepairWorkerPorts,
} from "../lib/server/repair-consumer";
import { applyInstructionToPayload } from "../lib/server/adapters/repair-ops-adapters";

const event = (over: Partial<RepairOutboxEvent> = {}): RepairOutboxEvent => ({
  eventId: "ev1",
  organizationId: "o1",
  executionId: "x1",
  principalUserId: "u1",
  attemptCount: 0,
  ...over,
});

function fakeStore(
  events: RepairOutboxEvent[],
  kind: "apply" | "rollback" | null,
  overrides: Partial<RepairOutboxStore> = {},
) {
  const store: RepairOutboxStore = {
    fetchPending: async () => events,
    markPublished: vi.fn(async () => {}),
    markFailed: vi.fn(async () => {}),
    getExecutionKind: async () => kind,
    ...overrides,
  };
  return store;
}

const noopPorts = (): RepairWorkerPorts => ({
  runApply: vi.fn(async () => {}),
  runRollback: vi.fn(async () => {}),
});

describe("runRepairOutboxOnce", () => {
  it("runs the apply worker for an apply execution and publishes the event", async () => {
    const store = fakeStore([event()], "apply");
    const ports = noopPorts();
    const result = await runRepairOutboxOnce(store, ports);
    expect(ports.runApply).toHaveBeenCalledTimes(1);
    expect(ports.runRollback).not.toHaveBeenCalled();
    expect(store.markPublished).toHaveBeenCalledWith("ev1");
    expect(result.processed).toBe(1);
  });

  it("runs the rollback worker for a rollback execution", async () => {
    const store = fakeStore([event()], "rollback");
    const ports = noopPorts();
    await runRepairOutboxOnce(store, ports);
    expect(ports.runRollback).toHaveBeenCalledTimes(1);
    expect(ports.runApply).not.toHaveBeenCalled();
  });

  it("publishes without running a worker when the execution is gone", async () => {
    const store = fakeStore([event()], null);
    const ports = noopPorts();
    const result = await runRepairOutboxOnce(store, ports);
    expect(ports.runApply).not.toHaveBeenCalled();
    expect(store.markPublished).toHaveBeenCalledWith("ev1");
    expect(result.processed).toBe(1);
  });

  it("retries a failing event below the attempt ceiling", async () => {
    const store = fakeStore([event({ attemptCount: 1 })], "apply");
    const ports: RepairWorkerPorts = {
      runApply: vi.fn(async () => {
        throw new Error("transport down");
      }),
      runRollback: vi.fn(async () => {}),
    };
    const result = await runRepairOutboxOnce(store, ports, { maxAttempts: 8 });
    expect(store.markFailed).toHaveBeenCalledWith("ev1", 2, false);
    expect(store.markPublished).not.toHaveBeenCalled();
    expect(result.retried).toBe(1);
  });

  it("dead-letters a failing event at the attempt ceiling", async () => {
    const store = fakeStore([event({ attemptCount: 7 })], "apply");
    const ports: RepairWorkerPorts = {
      runApply: vi.fn(async () => {
        throw new Error("still down");
      }),
      runRollback: vi.fn(async () => {}),
    };
    const result = await runRepairOutboxOnce(store, ports, { maxAttempts: 8 });
    expect(store.markFailed).toHaveBeenCalledWith("ev1", 8, true);
    expect(result.deadLettered).toBe(1);
  });
});

describe("applyInstructionToPayload", () => {
  it("sets a top-level product field", () => {
    const { payload, applied } = applyInstructionToPayload(
      { title: "Old", handle: "h" },
      {
        productExternalId: "p1",
        variantExternalId: null,
        field: "title",
        before: "Old",
        after: "New",
      },
    );
    expect(applied).toBe(true);
    expect(payload).toMatchObject({ title: "New", handle: "h" });
  });

  it("sets a variant field by external id without mutating the input", () => {
    const input = { title: "T", variants: [{ externalId: "v1", price: "9.99" }] };
    const { payload, applied } = applyInstructionToPayload(input, {
      productExternalId: "p1",
      variantExternalId: "v1",
      field: "price",
      before: "9.99",
      after: "12.00",
    });
    expect(applied).toBe(true);
    expect((payload.variants as { price: string }[])[0]!.price).toBe("12.00");
    expect(input.variants[0]!.price).toBe("9.99"); // original untouched
  });

  it("is a no-op when the target variant is absent", () => {
    const { applied } = applyInstructionToPayload(
      { variants: [{ externalId: "v1" }] },
      {
        productExternalId: "p1",
        variantExternalId: "missing",
        field: "price",
        before: null,
        after: "1.00",
      },
    );
    expect(applied).toBe(false);
  });
});
