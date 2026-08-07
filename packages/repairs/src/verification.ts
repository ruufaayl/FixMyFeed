/**
 * Verification and partial-success handling (task T095).
 *
 * After a writeback run (T094), confirms each successful change actually took
 * effect by comparing the field's re-observed value against the value we wrote.
 * Failed writeback items stay failed; successful-but-unconfirmed items are
 * downgraded to failed (the write did not stick). Preserves partial success —
 * every item's final state is explicit. Pure; the caller supplies observed
 * values (e.g. a re-fetched catalog) and persists the updated item statuses.
 */
import type { RepairExecutionStatus, RepairItemStatus } from "@fixmyfeed/database";
import {
  resolveExecutionStatus,
  type ExecutionOutcome,
  type WritebackInstruction,
} from "./executor.js";

/** Reads the field's current value for an instruction; null when unknown/absent. */
export type ObserveValue = (instruction: WritebackInstruction) => string | null;

export interface VerifiedItem {
  readonly instruction: WritebackInstruction;
  /** Final item status: `verified`, or `failed` (write failed or did not stick). */
  readonly status: Extract<RepairItemStatus, "verified" | "failed">;
  /** The re-observed value, when verification ran for this item. */
  readonly observed: string | null;
  readonly error: string | null;
}

export interface VerificationOutcome {
  readonly items: readonly VerifiedItem[];
  /** Items confirmed to have taken effect. */
  readonly verified: number;
  /** Items that failed to write or did not stick. */
  readonly failed: number;
  readonly status: RepairExecutionStatus;
}

/**
 * Verifies an execution outcome. Each `succeeded` item is confirmed by comparing
 * its observed value to the value written (`after`); a match is `verified`, a
 * mismatch or missing observation is `failed`. Items that already `failed` the
 * write stay failed. The overall status is completed / partially_completed /
 * failed by verified-vs-failed counts.
 */
export function verifyExecution(
  outcome: ExecutionOutcome,
  observe: ObserveValue,
): VerificationOutcome {
  const items: VerifiedItem[] = [];
  let verified = 0;
  let failed = 0;

  for (const item of outcome.items) {
    if (item.status === "failed") {
      failed += 1;
      items.push({
        instruction: item.instruction,
        status: "failed",
        observed: null,
        error: item.error,
      });
      continue;
    }
    const observed = observe(item.instruction);
    if (observed === item.instruction.after) {
      verified += 1;
      items.push({ instruction: item.instruction, status: "verified", observed, error: null });
    } else {
      failed += 1;
      items.push({
        instruction: item.instruction,
        status: "failed",
        observed,
        error: "not_verified",
      });
    }
  }

  return { items, verified, failed, status: resolveExecutionStatus(verified, failed) };
}

/** Whether a verification confirmed every item (nothing failed or unverified). */
export function isFullyVerified(outcome: VerificationOutcome): boolean {
  return outcome.failed === 0 && outcome.verified === outcome.items.length;
}

/** The items that need human review — failed to write or did not stick. */
export function unresolvedItems(outcome: VerificationOutcome): VerifiedItem[] {
  return outcome.items.filter((item) => item.status === "failed");
}
