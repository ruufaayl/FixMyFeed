/**
 * Connector writeback executor (task T094).
 *
 * Turns an approved plan's ready changes (T092) into per-field writeback
 * instructions and applies them through an injected `WritebackPort` — the package
 * performs no network I/O itself, so the adapter builds the connector-specific
 * request (Shopify/Woo writeback, which re-enforce their field allow-lists) and
 * makes the call. Results aggregate into a partial-success-aware outcome and
 * `repair_executions` / `repair_execution_items` rows. Deny-by-default: only
 * ready, computed changes become instructions.
 */
import type {
  NewRepairExecutionItemRow,
  NewRepairExecutionRow,
  RepairExecutionKind,
  RepairExecutionStatus,
} from "@fixmyfeed/database";
import type { RepairChange } from "./plan.js";

export interface WritebackInstruction {
  readonly productExternalId: string;
  readonly variantExternalId: string | null;
  readonly field: string;
  readonly before: string | null;
  readonly after: string;
}

/**
 * Ready, computed changes → writeback instructions. Changes that still require
 * input or have no proposed value are skipped (never guessed).
 */
export function buildWritebackInstructions(
  changes: readonly RepairChange[],
): WritebackInstruction[] {
  const instructions: WritebackInstruction[] = [];
  for (const change of changes) {
    if (change.requiresInput || change.proposedValue === null) continue;
    instructions.push({
      productExternalId: change.productExternalId,
      variantExternalId: change.variantExternalId,
      field: change.field,
      before: change.currentValue,
      after: change.proposedValue,
    });
  }
  return instructions;
}

export interface WritebackResult {
  readonly ok: boolean;
  readonly error: string | null;
}

/**
 * Port that applies one writeback instruction to the connector. The adapter MUST
 * re-check the connector's field allow-list and consent gate before writing.
 */
export interface WritebackPort {
  apply(instruction: WritebackInstruction): Promise<WritebackResult>;
}

export interface ExecutionItemOutcome {
  readonly instruction: WritebackInstruction;
  readonly status: "succeeded" | "failed";
  readonly error: string | null;
}

export interface ExecutionOutcome {
  readonly items: readonly ExecutionItemOutcome[];
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly status: RepairExecutionStatus;
}

/** Aggregate execution status from success/failure counts. */
export function resolveExecutionStatus(succeeded: number, failed: number): RepairExecutionStatus {
  if (failed === 0) return "completed";
  if (succeeded === 0) return "failed";
  return "partially_completed";
}

/**
 * Applies each instruction through `port`, preserving successful work and
 * recording every failure (partial success). A port that throws is captured as a
 * failed item — the run never aborts midway. Deterministic given a deterministic
 * port.
 */
export async function executeWriteback(
  instructions: readonly WritebackInstruction[],
  port: WritebackPort,
): Promise<ExecutionOutcome> {
  const items: ExecutionItemOutcome[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const instruction of instructions) {
    let result: WritebackResult;
    try {
      result = await port.apply(instruction);
    } catch (error) {
      result = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    if (result.ok) {
      succeeded += 1;
      items.push({ instruction, status: "succeeded", error: null });
    } else {
      failed += 1;
      items.push({ instruction, status: "failed", error: result.error });
    }
  }

  return {
    items,
    total: instructions.length,
    succeeded,
    failed,
    status: resolveExecutionStatus(succeeded, failed),
  };
}

/** Builds a `repair_executions` insert row (status `queued`). */
export function toRepairExecutionRow(
  organizationId: string,
  planId: string,
  kind: RepairExecutionKind,
  totalItems: number,
): NewRepairExecutionRow {
  return { organizationId, planId, kind, status: "queued", totalItems };
}

/** Builds a `repair_execution_items` insert row from an instruction + outcome. */
export function toRepairExecutionItemRow(
  organizationId: string,
  executionId: string,
  outcome: ExecutionItemOutcome,
): NewRepairExecutionItemRow {
  return {
    organizationId,
    executionId,
    productExternalId: outcome.instruction.productExternalId,
    variantExternalId: outcome.instruction.variantExternalId,
    field: outcome.instruction.field,
    beforeValue: outcome.instruction.before,
    afterValue: outcome.instruction.after,
    status: outcome.status,
    error: outcome.error,
  };
}
