/**
 * Normalized connector error taxonomy (task T030).
 *
 * Connector methods return canonical errors so callers never see raw provider
 * SDK objects (connector-contract.md, connector-error-normalization.md). Every
 * error carries a stable category, a machine-readable code, and a `retryable`
 * flag derived from the category, so retry/backoff, circuit-breaking, and user
 * messaging can be decided uniformly across providers.
 *
 * Pure and deterministic; `normalizeConnectorError` takes only primitives, which
 * is what keeps provider SDK types from escaping the adapter boundary.
 */

export const CONNECTOR_ERROR_CATEGORIES = [
  "authentication", // credentials missing/invalid/expired (401)
  "authorization", // authenticated but not permitted (403)
  "rate_limit", // throttled; retry after a delay (429)
  "quota", // hard quota/plan limit exhausted
  "not_found", // target resource does not exist (404)
  "validation", // request rejected as malformed (400/422)
  "conflict", // version/state conflict (409)
  "unsupported", // operation not supported by this connector
  "network", // transport failure before a response
  "upstream", // provider server error (5xx)
  "unknown", // unclassifiable
] as const;
export type ConnectorErrorCategory = (typeof CONNECTOR_ERROR_CATEGORIES)[number];

/** Categories whose failures may succeed on retry. */
export const RETRYABLE_CONNECTOR_CATEGORIES: readonly ConnectorErrorCategory[] = [
  "rate_limit",
  "quota",
  "network",
  "upstream",
];

/** True when a failure of this category may succeed if retried. */
export function isRetryableCategory(category: ConnectorErrorCategory): boolean {
  return RETRYABLE_CONNECTOR_CATEGORIES.includes(category);
}

/** Stable machine-readable code for a category, e.g. `CONNECTOR_RATE_LIMIT`. */
export function connectorErrorCode(category: ConnectorErrorCategory): string {
  return `CONNECTOR_${category.toUpperCase()}`;
}

export interface ConnectorErrorOptions {
  /** Override the category-derived retryability (rare). */
  readonly retryable?: boolean;
  /** Provider-native status/code, kept as a safe primitive for diagnostics. */
  readonly providerCode?: string | number;
  /** Suggested delay before retrying (from a Retry-After header, etc.). */
  readonly retryAfterMs?: number;
  readonly cause?: unknown;
}

export class ConnectorError extends Error {
  readonly category: ConnectorErrorCategory;
  readonly code: string;
  readonly retryable: boolean;
  readonly providerCode?: string | number;
  readonly retryAfterMs?: number;
  constructor(
    message: string,
    category: ConnectorErrorCategory,
    options: ConnectorErrorOptions = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ConnectorError";
    this.category = category;
    this.code = connectorErrorCode(category);
    this.retryable = options.retryable ?? isRetryableCategory(category);
    this.providerCode = options.providerCode;
    this.retryAfterMs = options.retryAfterMs;
  }
}

/** Raw signals from a provider response/exception (primitives only). */
export interface RawConnectorFailure {
  /** HTTP status code, when the provider returned a response. */
  readonly httpStatus?: number;
  /** Provider-native error code/string. */
  readonly providerCode?: string | number;
  /** Human-readable message (already provider-safe). */
  readonly message?: string;
  /** Explicit category override when the caller already knows it. */
  readonly category?: ConnectorErrorCategory;
  /** True when the failure was a transport error before any response. */
  readonly networkError?: boolean;
  readonly retryAfterMs?: number;
  readonly cause?: unknown;
}

/** Maps an HTTP status to a canonical category. */
export function categoryFromHttpStatus(status: number): ConnectorErrorCategory {
  if (status === 401) return "authentication";
  if (status === 403) return "authorization";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limit";
  if (status === 400 || status === 422) return "validation";
  if (status >= 500) return "upstream";
  if (status >= 400) return "validation";
  return "unknown";
}

/**
 * Normalizes a raw provider failure (primitives only) into a canonical
 * `ConnectorError`. An explicit `category` wins; otherwise a transport error
 * maps to `network`, an HTTP status maps via `categoryFromHttpStatus`, and
 * anything else is `unknown`.
 */
export function normalizeConnectorError(raw: RawConnectorFailure): ConnectorError {
  let category: ConnectorErrorCategory;
  if (raw.category !== undefined) {
    category = raw.category;
  } else if (raw.networkError) {
    category = "network";
  } else if (typeof raw.httpStatus === "number") {
    category = categoryFromHttpStatus(raw.httpStatus);
  } else {
    category = "unknown";
  }
  const message = raw.message ?? `connector ${category} error`;
  return new ConnectorError(message, category, {
    providerCode: raw.providerCode ?? raw.httpStatus,
    retryAfterMs: raw.retryAfterMs,
    cause: raw.cause,
  });
}
