/**
 * OAuth connection lifecycle logic (task T031).
 *
 * Pure and deterministic transitions over the connection status machine:
 * `pending → active`, `active ⇄ expired` (as the token expires or is refreshed),
 * and any non-revoked state → `revoked` (terminal). Tokens live in the T015
 * vault; this module reasons only about the connection record's status/expiry.
 */
import {
  OAUTH_CONNECTION_STATUSES,
  type OAuthConnectionStatus,
} from "./oauth-connection-schema.js";

export const OAUTH_CONNECTION_ERROR_CODE = {
  INVALID_INPUT: "OAUTH_CONNECTION_INVALID_INPUT",
  INVALID_TRANSITION: "OAUTH_CONNECTION_INVALID_TRANSITION",
} as const;
export type OAuthConnectionErrorCode =
  (typeof OAUTH_CONNECTION_ERROR_CODE)[keyof typeof OAUTH_CONNECTION_ERROR_CODE];

export class OAuthConnectionError extends Error {
  readonly code: OAuthConnectionErrorCode;
  constructor(message: string, code: OAuthConnectionErrorCode) {
    super(message);
    this.name = "OAuthConnectionError";
    this.code = code;
  }
}

/** `revoked` is terminal. */
export function isTerminalConnectionStatus(status: OAuthConnectionStatus): boolean {
  return status === "revoked";
}

const ALLOWED: Readonly<Record<OAuthConnectionStatus, readonly OAuthConnectionStatus[]>> = {
  pending: ["active", "revoked"],
  active: ["expired", "revoked"],
  expired: ["active", "revoked"],
  revoked: [],
};

/** True if a status transition is permitted. */
export function canTransitionConnection(
  from: OAuthConnectionStatus,
  to: OAuthConnectionStatus,
): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

/** Validates and returns a transition target, throwing on an illegal move. */
export function assertConnectionTransition(
  from: OAuthConnectionStatus,
  to: OAuthConnectionStatus,
): OAuthConnectionStatus {
  if (!(OAUTH_CONNECTION_STATUSES as readonly string[]).includes(to)) {
    throw new OAuthConnectionError(
      `unknown connection status: ${to}`,
      OAUTH_CONNECTION_ERROR_CODE.INVALID_TRANSITION,
    );
  }
  if (!canTransitionConnection(from, to)) {
    throw new OAuthConnectionError(
      `illegal connection transition: ${from} -> ${to}`,
      OAUTH_CONNECTION_ERROR_CODE.INVALID_TRANSITION,
    );
  }
  return to;
}

/**
 * Derives the effective status of an active/expired connection from its token
 * expiry. Terminal (`revoked`) and not-yet-active (`pending`) states are
 * returned unchanged; an `active`/`expired` connection flips based on `expiresAt`.
 */
export function deriveConnectionStatus(
  current: OAuthConnectionStatus,
  expiresAt: Date | null | undefined,
  now: () => Date = () => new Date(),
): OAuthConnectionStatus {
  if (current === "revoked" || current === "pending") return current;
  if (!expiresAt) return "active"; // no expiry known -> treat as active
  return expiresAt.getTime() <= now().getTime() ? "expired" : "active";
}
