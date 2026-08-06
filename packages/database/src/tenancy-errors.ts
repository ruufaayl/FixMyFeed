/** Stable, redacted error contract for tenant persistence operations (task T012). */
export const TENANCY_ERROR_CODE = {
  INVALID_INPUT: "TENANCY_INVALID_INPUT",
  TENANT_SCOPE_REQUIRED: "TENANCY_TENANT_SCOPE_REQUIRED",
  NOT_FOUND: "TENANCY_NOT_FOUND",
  CONFLICT: "TENANCY_CONFLICT",
  VERSION_CONFLICT: "TENANCY_VERSION_CONFLICT",
  PERSISTENCE_FAILED: "TENANCY_PERSISTENCE_FAILED",
} as const;

export type TenancyErrorCode = (typeof TENANCY_ERROR_CODE)[keyof typeof TENANCY_ERROR_CODE];

const TENANCY_ERROR_MESSAGE: Readonly<Record<TenancyErrorCode, string>> = Object.freeze({
  TENANCY_INVALID_INPUT: "Tenancy input is invalid",
  TENANCY_TENANT_SCOPE_REQUIRED: "Explicit tenant scope is required",
  TENANCY_NOT_FOUND: "Tenancy resource was not found",
  TENANCY_CONFLICT: "Tenancy resource conflicts with existing state",
  TENANCY_VERSION_CONFLICT: "Tenancy resource version is stale",
  TENANCY_PERSISTENCE_FAILED: "Tenancy persistence failed",
});

export class TenancyError extends Error {
  readonly code: TenancyErrorCode;

  constructor(code: TenancyErrorCode, _options?: Readonly<{ cause?: unknown }>) {
    super(TENANCY_ERROR_MESSAGE[code]);
    this.name = "TenancyError";
    this.code = code;
  }
}
