/**
 * Filesystem object store — the bootstrap driver (task T023).
 *
 * Stores objects on the local filesystem so the platform runs with no paid API
 * (IMPLEMENTATION_BASELINE bootstrap mode); the config layer forbids this driver
 * in production. Bytes live under `<root>/blobs/<physicalKey>` and metadata
 * under `<root>/meta/<physicalKey>.json`, so metadata never collides with, or
 * appears in, object listings.
 *
 * Physical keys are already tenant-prefixed and traversal-validated by keys.ts;
 * as defense in depth every resolved path is asserted to stay within its root.
 */
import { promises as fs } from "node:fs";
import { join, resolve, sep } from "node:path";

import { StorageError, STORAGE_ERROR_CODE } from "./errors.js";
import { normalizeRef, toPhysicalKey, toPhysicalPrefix, type ObjectRef } from "./keys.js";
import {
  resolveListLimit,
  type ListOptions,
  type ListPage,
  type ObjectMetadata,
  type ObjectStore,
  type PutObjectInput,
  type StoredObject,
} from "./store.js";

interface StoredMeta {
  readonly contentType: string | undefined;
  readonly size: number;
  readonly createdAt: string;
}

function isErrno(error: unknown, code: string): boolean {
  return (
    typeof error === "object" && error !== null && (error as NodeJS.ErrnoException).code === code
  );
}

function wrapUpstream(operation: string, error: unknown): StorageError {
  return new StorageError(
    `filesystem ${operation} failed`,
    STORAGE_ERROR_CODE.UPSTREAM,
    // A busy/locked file may succeed on retry; other errors are treated as permanent.
    { retryable: isErrno(error, "EBUSY") || isErrno(error, "EAGAIN"), cause: error },
  );
}

/**
 * Builds a filesystem-backed ObjectStore rooted at `root`. `now` is injectable
 * for deterministic timestamps in tests.
 */
export function createFilesystemObjectStore(
  root: string,
  now: () => Date = () => new Date(),
): ObjectStore {
  const rootAbs = resolve(root);
  const blobsRoot = join(rootAbs, "blobs");
  const metaRoot = join(rootAbs, "meta");

  /** Maps a physical key to an absolute path under `base`, asserting containment. */
  const pathFor = (base: string, physicalKey: string, suffix = ""): string => {
    const abs = join(base, ...physicalKey.split("/")) + suffix;
    const boundary = base + sep;
    if (abs !== base && !abs.startsWith(boundary)) {
      throw new StorageError(
        "resolved path escapes storage root",
        STORAGE_ERROR_CODE.INVALID_INPUT,
      );
    }
    return abs;
  };

  const blobPath = (ref: ObjectRef): string => pathFor(blobsRoot, toPhysicalKey(ref));
  const metaPath = (ref: ObjectRef): string => pathFor(metaRoot, toPhysicalKey(ref), ".json");

  const readMeta = async (ref: ObjectRef): Promise<StoredMeta | undefined> => {
    try {
      return JSON.parse(await fs.readFile(metaPath(ref), "utf8")) as StoredMeta;
    } catch (error) {
      if (isErrno(error, "ENOENT")) return undefined;
      throw wrapUpstream("read-meta", error);
    }
  };

  return {
    async put(input: PutObjectInput): Promise<ObjectMetadata> {
      const ref = normalizeRef(input.ref);
      if (!(input.body instanceof Uint8Array)) {
        throw new StorageError("body must be a Uint8Array", STORAGE_ERROR_CODE.INVALID_INPUT);
      }
      const blob = blobPath(ref);
      const meta = metaPath(ref);
      const record: StoredMeta = {
        contentType: input.contentType,
        size: input.body.byteLength,
        createdAt: now().toISOString(),
      };
      try {
        await fs.mkdir(join(blob, ".."), { recursive: true });
        await fs.mkdir(join(meta, ".."), { recursive: true });
        await fs.writeFile(blob, input.body);
        await fs.writeFile(meta, JSON.stringify(record), "utf8");
      } catch (error) {
        throw wrapUpstream("put", error);
      }
      return { key: ref.key, size: record.size, contentType: record.contentType };
    },

    async get(ref: ObjectRef): Promise<StoredObject> {
      const normalized = normalizeRef(ref);
      let body: Buffer;
      try {
        body = await fs.readFile(blobPath(normalized));
      } catch (error) {
        if (isErrno(error, "ENOENT")) {
          throw new StorageError("object not found", STORAGE_ERROR_CODE.NOT_FOUND);
        }
        throw wrapUpstream("get", error);
      }
      const meta = await readMeta(normalized);
      const bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
      return {
        key: normalized.key,
        size: meta?.size ?? bytes.byteLength,
        contentType: meta?.contentType,
        body: bytes,
      };
    },

    async head(ref: ObjectRef): Promise<ObjectMetadata> {
      const normalized = normalizeRef(ref);
      try {
        const stat = await fs.stat(blobPath(normalized));
        const meta = await readMeta(normalized);
        return {
          key: normalized.key,
          size: meta?.size ?? stat.size,
          contentType: meta?.contentType,
        };
      } catch (error) {
        if (isErrno(error, "ENOENT")) {
          throw new StorageError("object not found", STORAGE_ERROR_CODE.NOT_FOUND);
        }
        throw wrapUpstream("head", error);
      }
    },

    async exists(ref: ObjectRef): Promise<boolean> {
      const normalized = normalizeRef(ref);
      try {
        await fs.stat(blobPath(normalized));
        return true;
      } catch (error) {
        if (isErrno(error, "ENOENT")) return false;
        throw wrapUpstream("exists", error);
      }
    },

    async delete(ref: ObjectRef): Promise<void> {
      const normalized = normalizeRef(ref);
      for (const target of [blobPath(normalized), metaPath(normalized)]) {
        try {
          await fs.unlink(target);
        } catch (error) {
          if (!isErrno(error, "ENOENT")) throw wrapUpstream("delete", error);
        }
      }
    },

    async list(organizationId: string, options: ListOptions = {}): Promise<ListPage> {
      const limit = resolveListLimit(options.limit);
      const physicalPrefix = toPhysicalPrefix(organizationId, options.prefix);
      const tenantRoot = pathFor(blobsRoot, `org/${organizationId}`);

      // Collect every physical key under the tenant root, then filter by prefix.
      const found: string[] = [];
      const walk = async (dir: string, relSegments: string[]): Promise<void> => {
        let entries: Array<{ name: string; isDirectory: () => boolean }>;
        try {
          entries = await fs.readdir(dir, { withFileTypes: true });
        } catch (error) {
          if (isErrno(error, "ENOENT")) return; // no objects for this tenant yet
          throw wrapUpstream("list", error);
        }
        for (const entry of entries) {
          const next = [...relSegments, entry.name];
          if (entry.isDirectory()) {
            await walk(join(dir, entry.name), next);
          } else {
            found.push(`org/${organizationId}/${next.join("/")}`);
          }
        }
      };
      await walk(tenantRoot, []);

      const prefixLen = `org/${organizationId}/`.length;
      const matched = found
        .filter((physicalKey) => physicalKey.startsWith(physicalPrefix))
        .map((physicalKey) => physicalKey.slice(prefixLen))
        .sort();

      // Keyset pagination: return keys strictly greater than the cursor.
      const start = options.cursor ? matched.findIndex((key) => key > options.cursor!) : 0;
      const from = start === -1 ? matched.length : start;
      const page = matched.slice(from, from + limit);
      const nextCursor = from + limit < matched.length ? page[page.length - 1] : undefined;
      return { keys: page, nextCursor };
    },
  };
}
