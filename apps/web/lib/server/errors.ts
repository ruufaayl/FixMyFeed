/**
 * Application error contract (task T151).
 *
 * The single failure shape crossing the application boundary. Every service
 * normalizes domain/infrastructure failures into an `AppError` with a stable
 * machine code — React never sees raw database, connector, or queue errors, and
 * never sees secrets or stack traces.
 */

export const APP_ERROR_CODE = {
  VALIDATION: "VALIDATION",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  UPSTREAM: "UPSTREAM",
  UNAVAILABLE: "UNAVAILABLE",
  INTERNAL: "INTERNAL",
} as const;

export type AppErrorCode = (typeof APP_ERROR_CODE)[keyof typeof APP_ERROR_CODE];

const RETRYABLE_CODES: ReadonlySet<AppErrorCode> = new Set([
  APP_ERROR_CODE.RATE_LIMITED,
  APP_ERROR_CODE.UPSTREAM,
  APP_ERROR_CODE.UNAVAILABLE,
]);

export interface AppErrorOptions {
  /** Non-sensitive, machine-readable detail (never secrets or raw values). */
  readonly details?: Readonly<Record<string, string | number | boolean>>;
  /** Overrides the code's default retryability. */
  readonly retryable?: boolean;
}

/** The canonical application error. */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, string | number | boolean>>;

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.retryable = options.retryable ?? RETRYABLE_CODES.has(code);
    if (options.details) this.details = options.details;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/** Convenience constructors for the common cases. */
export const appError = {
  validation: (message: string, details?: AppErrorOptions["details"]) =>
    new AppError(APP_ERROR_CODE.VALIDATION, message, { details }),
  unauthenticated: (message = "Not signed in") =>
    new AppError(APP_ERROR_CODE.UNAUTHENTICATED, message),
  forbidden: (message = "Not permitted") => new AppError(APP_ERROR_CODE.FORBIDDEN, message),
  notFound: (message = "Not found") => new AppError(APP_ERROR_CODE.NOT_FOUND, message),
} as const;

/**
 * Normalizes any thrown value into an `AppError`. Existing `AppError`s pass
 * through; everything else becomes an opaque `INTERNAL` error — the original
 * message is NOT surfaced (it may contain secrets or infrastructure detail).
 */
export function normalizeError(value: unknown): AppError {
  if (isAppError(value)) return value;
  return new AppError(APP_ERROR_CODE.INTERNAL, "An unexpected error occurred");
}

/** A serializable envelope for returning an error across the boundary. */
export interface AppErrorEnvelope {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}

export function toErrorEnvelope(error: AppError): AppErrorEnvelope {
  return {
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    ...(error.details ? { details: error.details } : {}),
  };
}
