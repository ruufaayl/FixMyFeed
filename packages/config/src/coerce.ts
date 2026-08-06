/**
 * Primitive value coercion and validation (task T003).
 *
 * Each coercer receives an already-present, whitespace-trimmed raw string and
 * returns either a typed value or a secret-free failure message. Presence and
 * defaulting are handled by the loader before these are called.
 */

export type CoerceResult<T> = { ok: true; value: T } | { ok: false; message: string };

const ok = <T>(value: T): CoerceResult<T> => ({ ok: true, value });
const fail = (message: string): CoerceResult<never> => ({ ok: false, message });

const TRUE_VALUES = new Set(["true", "1", "yes"]);
const FALSE_VALUES = new Set(["false", "0", "no"]);

export function coerceBoolean(raw: string): CoerceResult<boolean> {
  const v = raw.toLowerCase();
  if (TRUE_VALUES.has(v)) return ok(true);
  if (FALSE_VALUES.has(v)) return ok(false);
  return fail("must be a boolean (true or false)");
}

export function coerceInteger(
  raw: string,
  range?: { min?: number; max?: number },
): CoerceResult<number> {
  if (!/^-?\d+$/.test(raw)) return fail("must be an integer");
  const value = Number.parseInt(raw, 10);
  if (range?.min !== undefined && value < range.min) return fail(`must be >= ${range.min}`);
  if (range?.max !== undefined && value > range.max) return fail(`must be <= ${range.max}`);
  return ok(value);
}

export function coerceDecimal(raw: string, range?: { min?: number }): CoerceResult<number> {
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return fail("must be a decimal number");
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return fail("must be a finite number");
  if (range?.min !== undefined && value < range.min) return fail(`must be >= ${range.min}`);
  return ok(value);
}

export function coerceEnum<T extends string>(raw: string, values: readonly T[]): CoerceResult<T> {
  if ((values as readonly string[]).includes(raw)) return ok(raw as T);
  return fail(`must be one of: ${values.join(", ")}`);
}

export function coerceUrl(raw: string, opts?: { requireHttps?: boolean }): CoerceResult<string> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail("must be a valid absolute URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return fail("must be an http(s) URL");
  }
  if (opts?.requireHttps && url.protocol !== "https:") {
    return fail("must use https");
  }
  return ok(url.toString().replace(/\/$/, ""));
}

export function coerceDsn(raw: string): CoerceResult<string> {
  if (!/^postgres(ql)?:\/\//.test(raw)) {
    return fail("must be a postgres:// or postgresql:// connection string");
  }
  return ok(raw);
}

/** Validates a base64-encoded key that must decode to exactly `bytes` bytes. */
export function coerceBase64Key(raw: string, bytes: number): CoerceResult<string> {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return fail("must be base64-encoded");
  const decodedLength = Buffer.from(raw, "base64").length;
  if (decodedLength !== bytes) return fail(`must decode to exactly ${bytes} bytes`);
  return ok(raw);
}

/** Minimum-length opaque secret (e.g. AUTH_SECRET requires 32+ bytes). */
export function coerceSecret(raw: string, minBytes: number): CoerceResult<string> {
  if (Buffer.byteLength(raw, "utf8") < minBytes) return fail(`must be at least ${minBytes} bytes`);
  return ok(raw);
}

const MAILBOX_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function coerceMailbox(raw: string): CoerceResult<string> {
  // Accepts either "a@b.com" or "Name <a@b.com>".
  const angle = raw.match(/<([^>]+)>\s*$/);
  const captured = angle?.[1];
  const address = captured !== undefined ? captured.trim() : raw;
  if (!MAILBOX_RE.test(address)) return fail("must be a valid email mailbox");
  return ok(raw);
}

export function coerceHostname(raw: string): CoerceResult<string> {
  if (!/^[A-Za-z0-9.-]+$/.test(raw)) return fail("must be a valid hostname");
  return ok(raw);
}

export function coerceString(raw: string): CoerceResult<string> {
  return ok(raw);
}
