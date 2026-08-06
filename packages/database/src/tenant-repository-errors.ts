/**
 * Canonical error envelope for the tenant-aware repository framework (task T020).
 * Stable machine-readable codes; messages never expose secrets or persistence
 * internals.
 */
export const TENANT_REPOSITORY_ERROR_CODE = {
  SCOPE_REQUIRED: "TENANT_SCOPE_REQUIRED",
  INVALID_INPUT: "TENANT_REPOSITORY_INVALID_INPUT",
  NOT_FOUND: "TENANT_REPOSITORY_NOT_FOUND",
  VERSION_CONFLICT: "TENANT_REPOSITORY_VERSION_CONFLICT",
} as const;

export type TenantRepositoryErrorCode =
  (typeof TENANT_REPOSITORY_ERROR_CODE)[keyof typeof TENANT_REPOSITORY_ERROR_CODE];

export class TenantRepositoryError extends Error {
  readonly code: TenantRepositoryErrorCode;

  constructor(message: string, code: TenantRepositoryErrorCode) {
    super(message);
    this.name = "TenantRepositoryError";
    this.code = code;
  }
}
