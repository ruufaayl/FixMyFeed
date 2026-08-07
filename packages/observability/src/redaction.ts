/**
 * Sensitive-value redaction (task T026).
 *
 * Sensitive data MUST be redacted before it reaches any log, metric, span, or
 * analytics payload (observability-standard.md, privacy requirements). This
 * module deep-clones a value, replacing values whose key looks sensitive with a
 * fixed placeholder. Matching is case-insensitive and ignores non-alphanumeric
 * separators, so `apiKey`, `api_key`, and `API-KEY` all match `apikey`.
 *
 * Pure and deterministic; bounded depth and cycle-safe so it can never hang or
 * blow the stack on hostile input.
 */

export const REDACTED_PLACEHOLDER = "[REDACTED]";

/** Default set of sensitive key fragments (normalized: lowercased, alphanumerics only). */
export const DEFAULT_REDACTED_KEYS: readonly string[] = [
  "password",
  "passwd",
  "secret",
  "token",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "clientsecret",
  "authorization",
  "cookie",
  "setcookie",
  "credential",
  "credentials",
  "privatekey",
  "sessionid",
  "otp",
  "ssn",
];

const MAX_DEPTH = 8;

const normalizeKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface RedactionOptions {
  /** Additional normalized key fragments to redact, merged with the defaults. */
  readonly additionalKeys?: readonly string[];
  /** Replace the default deny-list entirely instead of extending it. */
  readonly keys?: readonly string[];
  readonly maxDepth?: number;
}

/** True if a key matches any sensitive fragment (substring match on normalized forms). */
export function isSensitiveKey(key: string, options: RedactionOptions = {}): boolean {
  const base = options.keys ?? DEFAULT_REDACTED_KEYS;
  const all = options.additionalKeys ? [...base, ...options.additionalKeys] : base;
  const normalized = normalizeKey(key);
  if (normalized.length === 0) return false;
  return all.some((fragment) => normalized.includes(normalizeKey(fragment)));
}

/**
 * Returns a deep copy of `value` with sensitive fields replaced by
 * `REDACTED_PLACEHOLDER`. Non-plain objects (Date, etc.) are returned as-is;
 * cycles and depth beyond `maxDepth` collapse to a marker rather than recursing.
 */
export function redact(value: unknown, options: RedactionOptions = {}): unknown {
  const maxDepth = options.maxDepth ?? MAX_DEPTH;
  const seen = new WeakSet<object>();

  const walk = (input: unknown, depth: number): unknown => {
    if (input === null || typeof input !== "object") return input;
    if (input instanceof Date) return input;
    if (depth >= maxDepth) return "[TRUNCATED]";
    if (seen.has(input)) return "[CIRCULAR]";
    seen.add(input);

    if (Array.isArray(input)) {
      return input.map((item) => walk(item, depth + 1));
    }
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key, options) ? REDACTED_PLACEHOLDER : walk(val, depth + 1);
    }
    return out;
  };

  return walk(value, 0);
}

/** Redacts a flat/nested attribute bag, always returning a plain object. */
export function redactAttributes(
  attributes: Record<string, unknown> | undefined,
  options: RedactionOptions = {},
): Record<string, unknown> {
  if (attributes === undefined) return {};
  return redact(attributes, options) as Record<string, unknown>;
}
