/**
 * Writeback failure taxonomy + bounded retry tests (task T164).
 */
import { describe, it, expect, vi } from "vitest";
import type { WritebackPort, WritebackResult } from "@fixmyfeed/repairs";
import {
  classifyWritebackFailure,
  isRetryableFailure,
  withBoundedRetry,
} from "../lib/server/adapters/writeback-failures";

describe("classifyWritebackFailure", () => {
  it("maps codes to dispositions", () => {
    expect(classifyWritebackFailure("rate_limit").disposition).toBe("retry");
    expect(classifyWritebackFailure("network").disposition).toBe("retry");
    expect(classifyWritebackFailure("authentication").disposition).toBe("reconnect");
    expect(classifyWritebackFailure("missing_write_scope").disposition).toBe("reconnect");
    expect(classifyWritebackFailure("conflict_stale_baseline").disposition).toBe("recalculate");
    expect(classifyWritebackFailure("unsupported_field").disposition).toBe("terminal");
    expect(classifyWritebackFailure("plan_not_approved").disposition).toBe("terminal");
  });

  it("fails closed on unknown codes (terminal, never a retry storm)", () => {
    expect(classifyWritebackFailure("something_new").disposition).toBe("terminal");
    expect(classifyWritebackFailure(null).disposition).toBe("terminal");
    expect(isRetryableFailure("something_new")).toBe(false);
  });
});

function scriptedPort(results: WritebackResult[]): { port: WritebackPort; calls: () => number } {
  let i = 0;
  return {
    calls: () => i,
    port: {
      async apply() {
        const result = results[Math.min(i, results.length - 1)]!;
        i += 1;
        return result;
      },
    },
  };
}

const noSleep = () => Promise.resolve();

describe("withBoundedRetry", () => {
  it("returns immediately on success (no retry)", async () => {
    const { port, calls } = scriptedPort([{ ok: true, error: null }]);
    const wrapped = withBoundedRetry(port, { sleep: noSleep });
    const result = await wrapped.apply({} as never);
    expect(result.ok).toBe(true);
    expect(calls()).toBe(1);
  });

  it("retries a transient failure then succeeds", async () => {
    const { port, calls } = scriptedPort([
      { ok: false, error: "rate_limit" },
      { ok: true, error: null },
    ]);
    const wrapped = withBoundedRetry(port, { sleep: noSleep });
    const result = await wrapped.apply({} as never);
    expect(result.ok).toBe(true);
    expect(calls()).toBe(2);
  });

  it("bounds retries at maxAttempts and returns the last failure", async () => {
    const { port, calls } = scriptedPort([{ ok: false, error: "upstream" }]);
    const sleep = vi.fn(noSleep);
    const wrapped = withBoundedRetry(port, { maxAttempts: 3, sleep });
    const result = await wrapped.apply({} as never);
    expect(result).toEqual({ ok: false, error: "upstream" });
    expect(calls()).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2); // between the 3 attempts
  });

  it("does not retry a terminal failure", async () => {
    const { port, calls } = scriptedPort([{ ok: false, error: "unsupported_field" }]);
    const wrapped = withBoundedRetry(port, { sleep: noSleep });
    const result = await wrapped.apply({} as never);
    expect(result).toEqual({ ok: false, error: "unsupported_field" });
    expect(calls()).toBe(1);
  });

  it("does not retry a reconnect (auth) failure", async () => {
    const { port, calls } = scriptedPort([{ ok: false, error: "authentication" }]);
    const wrapped = withBoundedRetry(port, { sleep: noSleep });
    await wrapped.apply({} as never);
    expect(calls()).toBe(1);
  });
});
