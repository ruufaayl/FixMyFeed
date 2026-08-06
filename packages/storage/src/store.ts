/**
 * Object store port and driver selector (task T023).
 *
 * `ObjectStore` is the provider-neutral abstraction every consumer codes
 * against (ADR-008: provider-neutral S3-compatible adapter). Two drivers
 * implement it: a `filesystem` bootstrap driver (this repo, no paid API) and an
 * `s3` driver over an injected client port. The concrete S3 SDK is wired by the
 * application, so this package never handles credentials and pulls no provider
 * SDK into its dependency graph.
 */
import type { ObjectStorageDriver } from "@fixmyfeed/config";
import { StorageError, STORAGE_ERROR_CODE } from "./errors.js";
import type { ObjectRef } from "./keys.js";

/** Bytes plus optional content metadata for a write. */
export interface PutObjectInput {
  readonly ref: ObjectRef;
  readonly body: Uint8Array;
  /** MIME type recorded with the object; returned on read. */
  readonly contentType?: string;
}

/** Metadata describing a stored object (never includes the bytes). */
export interface ObjectMetadata {
  readonly key: string;
  readonly size: number;
  readonly contentType: string | undefined;
}

/** A stored object's bytes plus its metadata. */
export interface StoredObject extends ObjectMetadata {
  readonly body: Uint8Array;
}

/** One page of a tenant-scoped listing. */
export interface ListPage {
  /** Logical (tenant-relative) keys, ascending. */
  readonly keys: readonly string[];
  /** Opaque cursor for the next page, or undefined when the listing is complete. */
  readonly nextCursor: string | undefined;
}

export interface ListOptions {
  /** Logical key prefix to narrow the listing (validated). */
  readonly prefix?: string;
  /** Opaque cursor from a previous page. */
  readonly cursor?: string;
  /** Max keys per page (bounded; see MAX_LIST_LIMIT). */
  readonly limit?: number;
}

/** The provider-neutral object storage contract. */
export interface ObjectStore {
  /** Writes bytes at `ref`, overwriting any existing object. Returns its metadata. */
  put(input: PutObjectInput): Promise<ObjectMetadata>;
  /** Reads the object at `ref`. Throws STORAGE_NOT_FOUND if absent. */
  get(ref: ObjectRef): Promise<StoredObject>;
  /** Reads metadata without the bytes. Throws STORAGE_NOT_FOUND if absent. */
  head(ref: ObjectRef): Promise<ObjectMetadata>;
  /** True if an object exists at `ref`. */
  exists(ref: ObjectRef): Promise<boolean>;
  /** Deletes the object at `ref`. Idempotent: deleting a missing key is a no-op. */
  delete(ref: ObjectRef): Promise<void>;
  /** Lists keys within a tenant's namespace, bounded and paginated. */
  list(organizationId: string, options?: ListOptions): Promise<ListPage>;
}

/** Default and maximum page sizes for `list` (List endpoints MUST be bounded). */
export const DEFAULT_LIST_LIMIT = 100;
export const MAX_LIST_LIMIT = 1000;

/** Clamps a caller-supplied list limit into the allowed, bounded range. */
export function resolveListLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIST_LIMIT;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new StorageError("limit must be a positive integer", STORAGE_ERROR_CODE.INVALID_INPUT);
  }
  return Math.min(limit, MAX_LIST_LIMIT);
}

/** Resolved storage settings passed to the selector (mirrors AppConfig.objectStorage). */
export interface ObjectStorageSettings {
  readonly driver: ObjectStorageDriver;
  readonly bucket: string | undefined;
}

/** Injected dependencies the app supplies to wire the concrete drivers. */
export interface ObjectStoreDeps {
  /** Absolute root directory for the `filesystem` driver. Required when driver=filesystem. */
  readonly filesystemRoot?: string;
  /** Factory that builds the `filesystem` store (injected so this module stays free of node:fs). */
  readonly createFilesystemStore?: (root: string) => ObjectStore;
  /** Factory that builds the `s3` store from the resolved bucket. Required when driver=s3. */
  readonly createS3Store?: (bucket: string) => ObjectStore;
}

/**
 * Selects and constructs the configured object store, or throws
 * STORAGE_UNAVAILABLE when the chosen driver cannot be wired (missing root,
 * bucket, or factory) — letting the application degrade safely and report a
 * truthful disabled state rather than failing mid-operation.
 */
export function createObjectStore(
  settings: ObjectStorageSettings,
  deps: ObjectStoreDeps,
): ObjectStore {
  if (settings.driver === "filesystem") {
    if (!deps.filesystemRoot || !deps.createFilesystemStore) {
      throw new StorageError(
        "filesystem driver requires filesystemRoot and createFilesystemStore",
        STORAGE_ERROR_CODE.UNAVAILABLE,
      );
    }
    return deps.createFilesystemStore(deps.filesystemRoot);
  }
  if (settings.driver === "s3") {
    if (!settings.bucket || !deps.createS3Store) {
      throw new StorageError(
        "s3 driver requires a configured bucket and createS3Store",
        STORAGE_ERROR_CODE.UNAVAILABLE,
      );
    }
    return deps.createS3Store(settings.bucket);
  }
  throw new StorageError(
    `unknown object storage driver: ${String(settings.driver)}`,
    STORAGE_ERROR_CODE.INVALID_INPUT,
  );
}
