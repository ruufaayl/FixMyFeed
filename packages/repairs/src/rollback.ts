/**
 * Rollback planning and execution (task T096).
 *
 * Builds the inverse of a completed writeback: for every change that actually
 * took effect (a `verified` execution item with a known prior value), it writes
 * the original value back. Items that never applied, or whose prior value is
 * unknown (was null), are skipped — a rollback never invents a value. Execution
 * reuses the T094 executor (as a `rollback`-kind run). Pure aside from the
 * injected writeback port.
 */
import type { RepairItemStatus } from "@fixmyfeed/database";
import {
  executeWriteback,
  toRepairExecutionRow,
  type ExecutionOutcome,
  type WritebackInstruction,
  type WritebackPort,
} from "./executor.js";

/** Minimal shape of a stored execution item needed to plan a rollback. */
export interface RollbackSource {
  readonly productExternalId: string;
  readonly variantExternalId: string | null;
  readonly field: string;
  /** The value written by the original repair (now the current value). */
  readonly afterValue: string | null;
  /** The value before the original repair (the value to restore). */
  readonly beforeValue: string | null;
  readonly status: RepairItemStatus;
}

/**
 * Inverse instructions for the items that applied. Only `verified` items with a
 * known `beforeValue` are reversible; everything else is skipped. The instruction
 * restores `beforeValue` (its `after`), from the current `afterValue` (its `before`).
 */
export function buildRollbackInstructions(
  items: readonly RollbackSource[],
): WritebackInstruction[] {
  const instructions: WritebackInstruction[] = [];
  for (const item of items) {
    if (item.status !== "verified") continue; // only roll back what actually applied
    if (item.beforeValue === null) continue; // cannot restore an unknown prior value
    instructions.push({
      productExternalId: item.productExternalId,
      variantExternalId: item.variantExternalId,
      field: item.field,
      before: item.afterValue,
      after: item.beforeValue,
    });
  }
  return instructions;
}

/** The reversible subset (for previewing how much a rollback would touch). */
export function reversibleItems(items: readonly RollbackSource[]): RollbackSource[] {
  return items.filter((item) => item.status === "verified" && item.beforeValue !== null);
}

/**
 * Executes a rollback: applies the inverse instructions through `port`,
 * partial-success aware (reuses the executor). The caller records the run as a
 * `rollback`-kind execution and transitions the plan to `rolled_back`.
 */
export async function executeRollback(
  instructions: readonly WritebackInstruction[],
  port: WritebackPort,
): Promise<ExecutionOutcome> {
  return executeWriteback(instructions, port);
}

/** Builds the `repair_executions` row for a rollback run. */
export function toRollbackExecutionRow(organizationId: string, planId: string, totalItems: number) {
  return toRepairExecutionRow(organizationId, planId, "rollback", totalItems);
}
