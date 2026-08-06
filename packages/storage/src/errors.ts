/**
 * Canonical error envelope for the object storage abstraction (task T023).
 *
 * Messages are secret-free (they never contain credentials, endpoints, or
 * object bytes) and every error carries a stable machine-readable `code` plus a
 * `retryable` flag so callers can distinguish transient from permanent failures
 * (Error States: retryable/non-retryable/authorization/validation/conflict/
 * upstream must remain distinguishable).
 */
export const STORAGE_ERROR_CODE = {
  /** Input failed trust-boundary validation (bad organization id or object key). */
  INVALID_INPUT: "STORAGE_INVALID_INPUT",
  /** The requested object does not exist. */
  NOT_FOUND: "STORAGE_NOT_FOUND",
  /** The storage driver is not configured/wireable (bootstrap-disabled or missing dependency). */
  UNAVAILABLE: "STORAGE_UNAVAILABLE",
  /** The underlying provider failed (network, permission, quota, or 5xx). */
  UPSTREAM: "STORAGE_UPSTREAM_ERROR",
} as const;

export type StorageErrorCode = (typeof STORAGE_ERROR_CODE)[keyof typeof STORAGE_ERROR_CODE];

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  /** True when retrying the same operation could reasonably succeed. */
  readonly retryable: boolean;
  constructor(
    message: string,
    code: StorageErrorCode,
    options: { retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "StorageError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}
