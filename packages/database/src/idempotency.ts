/**
 * Idempotency-key logic (task T025).
 *
 * Pure and deterministic. `computeRequestFingerprint` canonicalizes a request
 * into a stable SHA-256 so the same request always hashes the same way and a
 * different request under the same key is detectable. `decideIdempotency` is a
 * pure decision function over the (optional) existing row + the new request +
 * the current time — it does no I/O, so the persistence layer (a tenant
 * repository / the API in a later task) owns the insert/update and races.
 */
import { createHash } from "node:crypto";
import type { IdempotencyStatus } from "./idempotency-schema.js";

export const IDEMPOTENCY_ERROR_CODE = {
  INVALID_INPUT: "IDEMPOTENCY_INVALID_INPUT",
  /** Same key replayed with a materially different request. */
  CONFLICT: "IDEMPOTENCY_CONFLICT",
} as const;
export type IdempotencyErrorCode =
  (typeof IDEMPOTENCY_ERROR_CODE)[keyof typeof IDEMPOTENCY_ERROR_CODE];

export class IdempotencyError extends Error {
  readonly code: IdempotencyErrorCode;
  constructor(message: string, code: IdempotencyErrorCode) {
    super(message);
    this.name = "IdempotencyError";
    this.code = code;
  }
}

export interface IdempotentRequest {
  readonly method: string;
  readonly path: string;
  /** Parsed request body (or undefined for bodyless requests). */
  readonly body?: unknown;
}

/** Recursively sorts object keys so logically-equal requests canonicalize identically. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

/** Deterministic fingerprint of a request (method + path + canonical body). */
export function computeRequestFingerprint(request: IdempotentRequest): string {
  if (typeof request?.method !== "string" || request.method.length === 0) {
    throw new IdempotencyError("method is required", IDEMPOTENCY_ERROR_CODE.INVALID_INPUT);
  }
  if (typeof request.path !== "string" || request.path.length === 0) {
    throw new IdempotencyError("path is required", IDEMPOTENCY_ERROR_CODE.INVALID_INPUT);
  }
  const canonical = JSON.stringify({
    method: request.method.toUpperCase(),
    path: request.path,
    body: canonicalize(request.body ?? null),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export interface IdempotencyRecordInput {
  readonly organizationId: string;
  readonly idempotencyKey: string;
  readonly request: IdempotentRequest;
}

export interface IdempotencyRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly idempotencyKey: string;
  readonly requestMethod: string;
  readonly requestPath: string;
  readonly requestFingerprint: string;
  readonly status: IdempotencyStatus;
  readonly responseStatus: number | null;
  readonly responseBody: unknown;
  readonly operationId: string | null;
  readonly expiresAt: Date;
}

/** Default retention window for an idempotency key: 24 hours. */
export const DEFAULT_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Builds a validated, pending idempotency row (to be inserted by the caller). */
export function createIdempotencyRecord(
  input: IdempotencyRecordInput,
  generateId: () => string,
  now: () => Date = () => new Date(),
  ttlMs: number = DEFAULT_IDEMPOTENCY_TTL_MS,
): IdempotencyRecord {
  if (typeof input.organizationId !== "string" || input.organizationId.length === 0) {
    throw new IdempotencyError("organizationId is required", IDEMPOTENCY_ERROR_CODE.INVALID_INPUT);
  }
  if (typeof input.idempotencyKey !== "string" || input.idempotencyKey.length === 0) {
    throw new IdempotencyError("idempotencyKey is required", IDEMPOTENCY_ERROR_CODE.INVALID_INPUT);
  }
  const fingerprint = computeRequestFingerprint(input.request);
  return {
    id: generateId(),
    organizationId: input.organizationId,
    idempotencyKey: input.idempotencyKey,
    requestMethod: input.request.method.toUpperCase(),
    requestPath: input.request.path,
    requestFingerprint: fingerprint,
    status: "pending",
    responseStatus: null,
    responseBody: null,
    operationId: null,
    expiresAt: new Date(now().getTime() + ttlMs),
  };
}

export type IdempotencyDecision =
  | { readonly action: "proceed" }
  | { readonly action: "in_progress"; readonly record: IdempotencyRecord }
  | {
      readonly action: "replay";
      readonly record: IdempotencyRecord;
      readonly responseStatus: number | null;
      readonly responseBody: unknown;
    };

/**
 * Decides how to handle an incoming request given the existing row (or null):
 * - no row, or an expired row → `proceed` (caller inserts pending and processes);
 * - a fresh completed row with a matching fingerprint → `replay` the stored response;
 * - a fresh pending row with a matching fingerprint → `in_progress`;
 * - any fresh row whose fingerprint differs → throws IDEMPOTENCY_CONFLICT.
 */
export function decideIdempotency(
  existing: IdempotencyRecord | null,
  request: IdempotentRequest,
  now: () => Date = () => new Date(),
): IdempotencyDecision {
  if (existing === null) return { action: "proceed" };
  if (existing.expiresAt.getTime() <= now().getTime()) return { action: "proceed" };

  const fingerprint = computeRequestFingerprint(request);
  if (fingerprint !== existing.requestFingerprint) {
    throw new IdempotencyError(
      "idempotency key reused with a different request",
      IDEMPOTENCY_ERROR_CODE.CONFLICT,
    );
  }
  if (existing.status === "completed") {
    return {
      action: "replay",
      record: existing,
      responseStatus: existing.responseStatus,
      responseBody: existing.responseBody,
    };
  }
  return { action: "in_progress", record: existing };
}

/** Builds the patch that finalizes a pending key with its response snapshot. */
export function completeIdempotencyRecord(
  responseStatus: number,
  responseBody: unknown,
  operationId: string | null = null,
): Pick<IdempotencyRecord, "status" | "responseStatus" | "responseBody" | "operationId"> {
  if (!Number.isInteger(responseStatus) || responseStatus < 100 || responseStatus > 599) {
    throw new IdempotencyError(
      "responseStatus must be a valid HTTP status code",
      IDEMPOTENCY_ERROR_CODE.INVALID_INPUT,
    );
  }
  return { status: "completed", responseStatus, responseBody, operationId };
}
