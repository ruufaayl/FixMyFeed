/**
 * @fixmyfeed/storage
 *
 * Provider-neutral, tenant-scoped object storage abstraction (task T023).
 *
 * Consumers code against the `ObjectStore` port and address objects by
 * `ObjectRef` = { organizationId, key }. Two drivers implement the port: a
 * `filesystem` bootstrap driver (no paid API) and an `s3` driver over an
 * injected `S3ClientLike` port (ADR-008 provider-neutral S3-compatible adapter).
 * Credentials and provider SDKs live in the application, never in this package.
 *
 * Boundary: this package may depend only on domain/contracts/config/observability
 * (see /boundaries.json and docs/04-system-architecture/monorepo-architecture.md).
 */
export const workspaceName = "@fixmyfeed/storage" as const;
export const workspaceKind = "package" as const;

export { StorageError, STORAGE_ERROR_CODE } from "./errors.js";
export type { StorageErrorCode } from "./errors.js";

export {
  MAX_KEY_LENGTH,
  assertOrganizationId,
  normalizeKey,
  normalizeRef,
  toPhysicalKey,
  toPhysicalPrefix,
} from "./keys.js";
export type { ObjectRef } from "./keys.js";

export {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  resolveListLimit,
  createObjectStore,
} from "./store.js";
export type {
  ObjectStore,
  ObjectStorageSettings,
  ObjectStoreDeps,
  PutObjectInput,
  ObjectMetadata,
  StoredObject,
  ListOptions,
  ListPage,
} from "./store.js";

export { createFilesystemObjectStore } from "./filesystem-store.js";

export { createS3ObjectStore } from "./s3-store.js";
export type { S3ClientLike, S3GetResult, S3HeadResult, S3ListResult } from "./s3-store.js";
