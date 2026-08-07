/**
 * Connector sync cursor advancement logic (task T034).
 *
 * Pure and deterministic. The key safety property is monotonic advancement for
 * `timestamp` cursors: a cursor must never move backwards (a stale or
 * out-of-order value would silently skip or reprocess data), so `advanceCursor`
 * rejects a regressing timestamp. `opaque`/`page` cursors are provider-owned and
 * simply replaced; a `none` cursor never carries a value.
 */
import { SYNC_CURSOR_MODELS, type SyncCursorModel } from "./connector-sync-cursor-schema.js";

export const SYNC_CURSOR_ERROR_CODE = {
  INVALID_INPUT: "SYNC_CURSOR_INVALID_INPUT",
  REGRESSION: "SYNC_CURSOR_REGRESSION",
} as const;
export type SyncCursorErrorCode =
  (typeof SYNC_CURSOR_ERROR_CODE)[keyof typeof SYNC_CURSOR_ERROR_CODE];

export class SyncCursorError extends Error {
  readonly code: SyncCursorErrorCode;
  constructor(message: string, code: SyncCursorErrorCode) {
    super(message);
    this.name = "SyncCursorError";
    this.code = code;
  }
}

function assertModel(model: SyncCursorModel): void {
  if (!(SYNC_CURSOR_MODELS as readonly string[]).includes(model)) {
    throw new SyncCursorError(
      `unknown cursor model: ${model}`,
      SYNC_CURSOR_ERROR_CODE.INVALID_INPUT,
    );
  }
}

/**
 * Computes the next cursor value given the current value and a candidate.
 *
 * - `none`: always null (the connector has no incremental cursor).
 * - `timestamp`: must be a valid, **non-regressing** ISO timestamp; equal or
 *   forward is accepted, backward throws SYNC_CURSOR_REGRESSION.
 * - `opaque` / `page`: the provider owns the token; a non-empty candidate
 *   replaces the current value.
 */
export function advanceCursor(
  model: SyncCursorModel,
  current: string | null,
  candidate: string | null,
): string | null {
  assertModel(model);

  if (model === "none") return null;

  if (candidate === null || candidate === "") {
    throw new SyncCursorError("cursor candidate is required", SYNC_CURSOR_ERROR_CODE.INVALID_INPUT);
  }

  if (model === "timestamp") {
    const next = Date.parse(candidate);
    if (Number.isNaN(next)) {
      throw new SyncCursorError(
        "timestamp cursor must be a valid date",
        SYNC_CURSOR_ERROR_CODE.INVALID_INPUT,
      );
    }
    if (current !== null) {
      const prev = Date.parse(current);
      if (!Number.isNaN(prev) && next < prev) {
        throw new SyncCursorError(
          "timestamp cursor must not move backwards",
          SYNC_CURSOR_ERROR_CODE.REGRESSION,
        );
      }
    }
    return new Date(next).toISOString();
  }

  // opaque / page: replace with the provider-supplied token.
  return candidate;
}

/** True if a fresh (never-synced) cursor should perform a full sync. */
export function needsFullSync(cursorValue: string | null, lastFullSyncAt: Date | null): boolean {
  return cursorValue === null || lastFullSyncAt === null;
}
