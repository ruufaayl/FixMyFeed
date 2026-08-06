/**
 * Tenant-scoped key namespacing and trust-boundary validation (task T023).
 *
 * Every object is addressed by an `ObjectRef` = { organizationId, key }. The
 * organization id is prefixed onto the physical key so a tenant can never read
 * or overwrite another tenant's objects (deny-by-default tenant isolation), and
 * the logical key is validated to reject path traversal, control characters,
 * and absolute/backslash paths — which also keeps the filesystem driver safe.
 *
 * Pure and deterministic: no I/O, no clock, no randomness.
 */
import { StorageError, STORAGE_ERROR_CODE } from "./errors.js";

/** Addresses a single object within a tenant's namespace. */
export interface ObjectRef {
  readonly organizationId: string;
  /** Logical, tenant-relative key, e.g. "snapshots/2026-08/report.json". */
  readonly key: string;
}

/** Max logical key length (keeps physical paths bounded on every driver). */
export const MAX_KEY_LENGTH = 1024;

/** Organization ids are UUIDs in this system; accept the canonical UUID shape. */
const ORGANIZATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A logical key is a "/"-separated path of non-empty segments. Each segment is
 * restricted to the S3 "safe characters" set (letters, digits, and
 * `! - _ . * ' ( )`). No segment may be "." or "..", and control characters,
 * backslashes, and leading/trailing slashes are rejected.
 */
const KEY_SEGMENT_PATTERN = /^[A-Za-z0-9!\-_.*'()]+$/;

/** True if the string contains any C0 control char (0x00–0x1F) or DEL (0x7F). */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function invalid(message: string): never {
  throw new StorageError(message, STORAGE_ERROR_CODE.INVALID_INPUT);
}

/** Validates an organization id at the trust boundary. */
export function assertOrganizationId(organizationId: unknown): asserts organizationId is string {
  if (typeof organizationId !== "string" || !ORGANIZATION_ID_PATTERN.test(organizationId)) {
    invalid("organizationId must be a valid UUID");
  }
}

/**
 * Validates a logical key and returns its normalized form. Throws
 * `STORAGE_INVALID_INPUT` on any traversal, absolute path, or illegal character.
 */
export function normalizeKey(key: unknown): string {
  if (typeof key !== "string" || key.length === 0) {
    invalid("key must be a non-empty string");
  }
  if (key.length > MAX_KEY_LENGTH) {
    invalid(`key exceeds ${MAX_KEY_LENGTH} characters`);
  }
  if (hasControlChar(key)) {
    invalid("key must not contain control characters");
  }
  if (key.includes("\\")) {
    invalid("key must not contain backslashes");
  }
  if (key.startsWith("/") || key.endsWith("/")) {
    invalid("key must not start or end with a slash");
  }
  const segments = key.split("/");
  for (const segment of segments) {
    if (segment.length === 0) {
      invalid("key must not contain empty path segments");
    }
    if (segment === "." || segment === "..") {
      invalid("key must not contain '.' or '..' path segments");
    }
    if (!KEY_SEGMENT_PATTERN.test(segment)) {
      invalid(`key segment "${segment}" contains unsupported characters`);
    }
  }
  return segments.join("/");
}

/** Validates a ref and returns it with a normalized key. */
export function normalizeRef(ref: ObjectRef): ObjectRef {
  assertOrganizationId(ref?.organizationId);
  return { organizationId: ref.organizationId, key: normalizeKey(ref?.key) };
}

/**
 * Physical key = "org/<organizationId>/<key>". Deterministic and stable so the
 * same ref always maps to the same stored object across drivers and restarts.
 */
export function toPhysicalKey(ref: ObjectRef): string {
  const normalized = normalizeRef(ref);
  return `org/${normalized.organizationId}/${normalized.key}`;
}

/** Physical prefix for a tenant, optionally narrowed by a logical key prefix. */
export function toPhysicalPrefix(organizationId: string, keyPrefix?: string): string {
  assertOrganizationId(organizationId);
  const base = `org/${organizationId}/`;
  if (keyPrefix === undefined || keyPrefix.length === 0) return base;
  // A prefix may end at a segment boundary; validate it as a key but allow a
  // trailing slash to mean "everything under this folder".
  const hasTrailingSlash = keyPrefix.endsWith("/");
  const trimmed = hasTrailingSlash ? keyPrefix.slice(0, -1) : keyPrefix;
  return `${base}${normalizeKey(trimmed)}${hasTrailingSlash ? "/" : ""}`;
}
