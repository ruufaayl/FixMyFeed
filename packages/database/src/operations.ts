/**
 * Operation resource lifecycle logic (task T025).
 *
 * Pure and deterministic: builds a queued operation record and validates state
 * transitions against the allowed lifecycle graph, so the same inputs always
 * yield the same result. Persistence is the caller's concern (a tenant
 * repository / the operations API in a later task) — this module never does I/O.
 */
import { randomUUID } from "node:crypto";
import {
  OPERATION_STATUSES,
  OPERATION_TERMINAL_STATUSES,
  type OperationStatus,
} from "./operation-schema.js";

export const OPERATION_ERROR_CODE = {
  INVALID_OPERATION: "OPERATION_INVALID",
  INVALID_TRANSITION: "OPERATION_INVALID_TRANSITION",
} as const;
export type OperationErrorCode = (typeof OPERATION_ERROR_CODE)[keyof typeof OPERATION_ERROR_CODE];

export class OperationError extends Error {
  readonly code: OperationErrorCode;
  constructor(message: string, code: OperationErrorCode) {
    super(message);
    this.name = "OperationError";
    this.code = code;
  }
}

export interface NewOperationInput {
  readonly organizationId: string;
  readonly operationType: string;
  readonly resourceType?: string | null;
  readonly resourceId?: string | null;
}

export interface OperationRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly operationType: string;
  readonly status: OperationStatus;
  readonly progress: number | null;
  readonly resourceType: string | null;
  readonly resourceId: string | null;
  readonly result: unknown;
  readonly error: unknown;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly version: number;
}

/** True if `status` is terminal (no further transitions allowed). */
export function isTerminalOperationStatus(status: OperationStatus): boolean {
  return (OPERATION_TERMINAL_STATUSES as readonly string[]).includes(status);
}

/** Allowed transitions between operation states. Terminal states have no outgoing edges. */
const ALLOWED_TRANSITIONS: Readonly<Record<OperationStatus, readonly OperationStatus[]>> = {
  queued: ["running", "cancelled", "failed"],
  running: ["retrying", "blocked", "completed", "partially_completed", "cancelled", "failed"],
  retrying: ["running", "blocked", "completed", "partially_completed", "cancelled", "failed"],
  blocked: ["running", "retrying", "cancelled", "failed"],
  completed: [],
  partially_completed: [],
  cancelled: [],
  failed: [],
};

/** True if a transition from `from` to `to` is permitted. */
export function canTransitionOperation(from: OperationStatus, to: OperationStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Builds a validated, queued operation record (to be inserted by the caller). */
export function createOperation(
  input: NewOperationInput,
  generateId: () => string = randomUUID,
): OperationRecord {
  if (typeof input.organizationId !== "string" || input.organizationId.length === 0) {
    throw new OperationError("organizationId is required", OPERATION_ERROR_CODE.INVALID_OPERATION);
  }
  if (typeof input.operationType !== "string" || input.operationType.length === 0) {
    throw new OperationError("operationType is required", OPERATION_ERROR_CODE.INVALID_OPERATION);
  }
  return {
    id: generateId(),
    organizationId: input.organizationId,
    operationType: input.operationType,
    status: "queued",
    progress: null,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    result: null,
    error: null,
    startedAt: null,
    completedAt: null,
    version: 1,
  };
}

export interface OperationTransition {
  readonly status: OperationStatus;
  /** 0–100; ignored unless provided. */
  readonly progress?: number;
  readonly result?: unknown;
  readonly error?: unknown;
}

/**
 * Applies a validated transition, returning the next record. Throws
 * OPERATION_INVALID_TRANSITION when the move is not allowed (including any move
 * out of a terminal state). Stamps `startedAt` on first entry to `running` and
 * `completedAt` when entering a terminal state; bumps the optimistic version.
 */
export function transitionOperation(
  current: OperationRecord,
  transition: OperationTransition,
  now: () => Date = () => new Date(),
): OperationRecord {
  const { status: to } = transition;
  if (!(OPERATION_STATUSES as readonly string[]).includes(to)) {
    throw new OperationError(
      `unknown operation status: ${to}`,
      OPERATION_ERROR_CODE.INVALID_TRANSITION,
    );
  }
  if (!canTransitionOperation(current.status, to)) {
    throw new OperationError(
      `illegal operation transition: ${current.status} -> ${to}`,
      OPERATION_ERROR_CODE.INVALID_TRANSITION,
    );
  }
  if (transition.progress !== undefined) {
    if (
      !Number.isInteger(transition.progress) ||
      transition.progress < 0 ||
      transition.progress > 100
    ) {
      throw new OperationError(
        "progress must be an integer between 0 and 100",
        OPERATION_ERROR_CODE.INVALID_OPERATION,
      );
    }
  }
  const at = now();
  return {
    ...current,
    status: to,
    progress: transition.progress ?? current.progress,
    result: transition.result ?? current.result,
    error: transition.error ?? current.error,
    startedAt: current.startedAt ?? (to === "running" ? at : null),
    completedAt: isTerminalOperationStatus(to) ? at : current.completedAt,
    version: current.version + 1,
  };
}
