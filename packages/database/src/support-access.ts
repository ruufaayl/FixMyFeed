/**
 * Support access grant lifecycle logic (task T017).
 *
 * Pure and deterministic — evaluates whether a time-boxed grant is currently
 * effective, derives its lifecycle status from the clock, and validates grant
 * inputs. No database access; persistence is the repository's concern.
 */
import {
  SUPPORT_ACCESS_SCOPES,
  type SupportAccessScope,
  type SupportAccessStatus,
} from "./support-access-schema.js";

export const SUPPORT_ACCESS_ERROR_CODE = {
  INVALID_GRANT: "SUPPORT_ACCESS_INVALID_GRANT",
} as const;

export type SupportAccessErrorCode =
  (typeof SUPPORT_ACCESS_ERROR_CODE)[keyof typeof SUPPORT_ACCESS_ERROR_CODE];

export class SupportAccessError extends Error {
  readonly code: SupportAccessErrorCode;

  constructor(
    message: string,
    code: SupportAccessErrorCode = SUPPORT_ACCESS_ERROR_CODE.INVALID_GRANT,
  ) {
    super(message);
    this.name = "SupportAccessError";
    this.code = code;
  }
}

/** The stored fields needed to reason about a grant's effectiveness. */
export interface SupportGrantState {
  readonly status: SupportAccessStatus;
  readonly grantedAt: Date;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

/**
 * A grant is effective only while it is `active`, not revoked, and the clock is
 * within [grantedAt, expiresAt). Deny by default for anything else.
 */
export function isSupportGrantActive(grant: SupportGrantState, now: Date = new Date()): boolean {
  if (grant.status !== "active") return false;
  if (grant.revokedAt !== null) return false;
  const t = now.getTime();
  return t >= grant.grantedAt.getTime() && t < grant.expiresAt.getTime();
}

/**
 * Derives the lifecycle status implied by the clock and revocation, independent
 * of the stored `status` — useful for a sweep that transitions expired grants.
 */
export function deriveSupportGrantStatus(
  grant: SupportGrantState,
  now: Date = new Date(),
): SupportAccessStatus {
  if (grant.revokedAt !== null) return "revoked";
  if (now.getTime() >= grant.expiresAt.getTime()) return "expired";
  return "active";
}

export interface SupportGrantInput {
  readonly organizationId: string;
  readonly supportUserId: string;
  readonly grantedByUserId: string;
  readonly reason: string;
  readonly scope: string;
  readonly grantedAt: Date;
  readonly expiresAt: Date;
  /** Upper bound on grant duration in milliseconds (time-boxing guard). */
  readonly maxDurationMs?: number;
}

const DEFAULT_MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Validates a proposed grant: required actors, bounded reason, a known scope,
 * a positive and bounded time window. Throws SupportAccessError on failure so
 * an invalid grant is never persisted.
 */
export function validateSupportGrantInput(input: SupportGrantInput): void {
  const required: [keyof SupportGrantInput, unknown][] = [
    ["organizationId", input.organizationId],
    ["supportUserId", input.supportUserId],
    ["grantedByUserId", input.grantedByUserId],
  ];
  for (const [field, value] of required) {
    if (typeof value !== "string" || value.length === 0) {
      throw new SupportAccessError(`${String(field)} is required`);
    }
  }
  if (input.supportUserId === input.grantedByUserId) {
    throw new SupportAccessError("a support user may not grant access to themselves");
  }
  const reason = input.reason?.trim() ?? "";
  if (reason.length < 1 || reason.length > 500) {
    throw new SupportAccessError("reason must be 1–500 characters");
  }
  if (!(SUPPORT_ACCESS_SCOPES as readonly string[]).includes(input.scope)) {
    throw new SupportAccessError(`scope must be one of: ${SUPPORT_ACCESS_SCOPES.join(", ")}`);
  }
  const duration = input.expiresAt.getTime() - input.grantedAt.getTime();
  if (!(duration > 0)) {
    throw new SupportAccessError("expiresAt must be after grantedAt");
  }
  const max = input.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
  if (duration > max) {
    throw new SupportAccessError("grant duration exceeds the maximum allowed window");
  }
}

/** Effective support scopes for the given organization from a set of grants. */
export function activeSupportScopes(
  grants: readonly (SupportGrantState & { scope: SupportAccessScope })[],
  now: Date = new Date(),
): SupportAccessScope[] {
  return grants.filter((g) => isSupportGrantActive(g, now)).map((g) => g.scope);
}
