/**
 * Destructive-boundary re-enforcement tests (task T163).
 *
 * evaluateDestructiveBoundary is deny-first: safety → capability → scope →
 * approval. Pure (no DB); the DB re-read is covered by the certification harness.
 */
import { describe, it, expect } from "vitest";
import {
  contractSupportsProductWriteback,
  evaluateDestructiveBoundary,
  REQUIRED_WRITEBACK_SCOPE,
} from "../lib/server/adapters/writeback-guard";

const ok = { allowed: true, reason: "dev_store" } as const;
const scopes = [REQUIRED_WRITEBACK_SCOPE, "read_products"];

describe("contractSupportsProductWriteback", () => {
  it("confirms the Shopify contract permits product + variant writes", () => {
    expect(contractSupportsProductWriteback()).toBe(true);
  });
});

describe("evaluateDestructiveBoundary", () => {
  it("authorizes when safety, capability, scope, and approval all pass", () => {
    expect(evaluateDestructiveBoundary({ eligibility: ok, scopes, approvedPlan: true })).toEqual({
      allowed: true,
      reason: "authorized",
    });
  });

  it("blocks when the safety mode denies (carries its reason)", () => {
    expect(
      evaluateDestructiveBoundary({
        eligibility: { allowed: false, reason: "not_a_dev_store" },
        scopes,
        approvedPlan: true,
      }),
    ).toEqual({ allowed: false, reason: "not_a_dev_store" });
  });

  it("blocks when the write scope was not granted", () => {
    expect(
      evaluateDestructiveBoundary({
        eligibility: ok,
        scopes: ["read_products"],
        approvedPlan: true,
      }),
    ).toEqual({ allowed: false, reason: "missing_write_scope" });
  });

  it("blocks when the plan is not in an approved state", () => {
    expect(evaluateDestructiveBoundary({ eligibility: ok, scopes, approvedPlan: false })).toEqual({
      allowed: false,
      reason: "plan_not_approved",
    });
  });

  it("checks safety before scope/approval (deny-first ordering)", () => {
    const decision = evaluateDestructiveBoundary({
      eligibility: { allowed: false, reason: "writeback_disabled" },
      scopes: [],
      approvedPlan: false,
    });
    expect(decision.reason).toBe("writeback_disabled");
  });
});
