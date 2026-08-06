/**
 * S3-compatible object store over an injected client port (task T023).
 *
 * ADR-008 mandates a provider-neutral S3-compatible adapter. Rather than bind
 * this package to a specific SDK (and its credentials), the adapter depends on a
 * minimal `S3ClientLike` port that any S3-compatible SDK can satisfy; the
 * application constructs the concrete client with owner-supplied credentials and
 * injects it. This keeps secrets, provider SDKs, and endpoint configuration out
 * of the storage package entirely and makes the adapter fully unit-testable.
 *
 * The port speaks in PHYSICAL keys (already tenant-prefixed); the adapter maps
 * logical refs to physical keys and back so callers only ever see tenant-
 * relative keys.
 */
import { StorageError, STORAGE_ERROR_CODE } from "./errors.js";
import {
  normalizeRef,
  toPhysicalKey,
  toPhysicalPrefix,
  assertOrganizationId,
  type ObjectRef,
} from "./keys.js";
import {
  resolveListLimit,
  type ListOptions,
  type ListPage,
  type ObjectMetadata,
  type ObjectStore,
  type PutObjectInput,
  type StoredObject,
} from "./store.js";

/** Bytes and metadata returned by the client for a read. */
export interface S3GetResult {
  readonly body: Uint8Array;
  readonly contentType?: string;
  readonly contentLength?: number;
}

/** Metadata-only result for a head request. */
export interface S3HeadResult {
  readonly contentType?: string;
  readonly contentLength?: number;
}

/** One page of a raw (physical-key) listing. */
export interface S3ListResult {
  /** Physical keys returned by the provider. */
  readonly keys: readonly string[];
  /** Provider continuation token for the next page, if any. */
  readonly nextToken?: string;
}

/**
 * The minimal, provider-neutral surface the adapter needs. A `null` return from
 * `getObject`/`headObject` means "no such key"; any thrown error is treated as
 * an upstream failure.
 */
export interface S3ClientLike {
  putObject(input: {
    bucket: string;
    key: string;
    body: Uint8Array;
    contentType?: string;
  }): Promise<void>;
  getObject(input: { bucket: string; key: string }): Promise<S3GetResult | null>;
  headObject(input: { bucket: string; key: string }): Promise<S3HeadResult | null>;
  deleteObject(input: { bucket: string; key: string }): Promise<void>;
  listObjects(input: {
    bucket: string;
    prefix: string;
    continuationToken?: string;
    maxKeys: number;
  }): Promise<S3ListResult>;
}

function wrapUpstream(operation: string, error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  // Network/5xx failures from object storage are typically transient.
  return new StorageError(`s3 ${operation} failed`, STORAGE_ERROR_CODE.UPSTREAM, {
    retryable: true,
    cause: error,
  });
}

/** Builds an S3-compatible ObjectStore backed by `client` and `bucket`. */
export function createS3ObjectStore(client: S3ClientLike, bucket: string): ObjectStore {
  if (typeof bucket !== "string" || bucket.length === 0) {
    throw new StorageError("bucket must be a non-empty string", STORAGE_ERROR_CODE.UNAVAILABLE);
  }

  return {
    async put(input: PutObjectInput): Promise<ObjectMetadata> {
      const ref = normalizeRef(input.ref);
      if (!(input.body instanceof Uint8Array)) {
        throw new StorageError("body must be a Uint8Array", STORAGE_ERROR_CODE.INVALID_INPUT);
      }
      try {
        await client.putObject({
          bucket,
          key: toPhysicalKey(ref),
          body: input.body,
          contentType: input.contentType,
        });
      } catch (error) {
        throw wrapUpstream("put", error);
      }
      return { key: ref.key, size: input.body.byteLength, contentType: input.contentType };
    },

    async get(ref: ObjectRef): Promise<StoredObject> {
      const normalized = normalizeRef(ref);
      let result: S3GetResult | null;
      try {
        result = await client.getObject({ bucket, key: toPhysicalKey(normalized) });
      } catch (error) {
        throw wrapUpstream("get", error);
      }
      if (result === null) {
        throw new StorageError("object not found", STORAGE_ERROR_CODE.NOT_FOUND);
      }
      return {
        key: normalized.key,
        size: result.contentLength ?? result.body.byteLength,
        contentType: result.contentType,
        body: result.body,
      };
    },

    async head(ref: ObjectRef): Promise<ObjectMetadata> {
      const normalized = normalizeRef(ref);
      let result: S3HeadResult | null;
      try {
        result = await client.headObject({ bucket, key: toPhysicalKey(normalized) });
      } catch (error) {
        throw wrapUpstream("head", error);
      }
      if (result === null) {
        throw new StorageError("object not found", STORAGE_ERROR_CODE.NOT_FOUND);
      }
      return {
        key: normalized.key,
        size: result.contentLength ?? 0,
        contentType: result.contentType,
      };
    },

    async exists(ref: ObjectRef): Promise<boolean> {
      const normalized = normalizeRef(ref);
      try {
        return (await client.headObject({ bucket, key: toPhysicalKey(normalized) })) !== null;
      } catch (error) {
        throw wrapUpstream("exists", error);
      }
    },

    async delete(ref: ObjectRef): Promise<void> {
      const normalized = normalizeRef(ref);
      try {
        await client.deleteObject({ bucket, key: toPhysicalKey(normalized) });
      } catch (error) {
        throw wrapUpstream("delete", error);
      }
    },

    async list(organizationId: string, options: ListOptions = {}): Promise<ListPage> {
      assertOrganizationId(organizationId);
      const limit = resolveListLimit(options.limit);
      const physicalPrefix = toPhysicalPrefix(organizationId, options.prefix);
      const prefixLen = `org/${organizationId}/`.length;
      let result: S3ListResult;
      try {
        result = await client.listObjects({
          bucket,
          prefix: physicalPrefix,
          continuationToken: options.cursor,
          maxKeys: limit,
        });
      } catch (error) {
        throw wrapUpstream("list", error);
      }
      const keys = result.keys
        .filter((physicalKey) => physicalKey.length > prefixLen)
        .map((physicalKey) => physicalKey.slice(prefixLen));
      return { keys, nextCursor: result.nextToken };
    },
  };
}
