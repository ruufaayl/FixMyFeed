/**
 * WooCommerce credential connection (task T050).
 *
 * WooCommerce authenticates the REST API with a per-store **consumer key /
 * consumer secret** over HTTPS Basic auth (woocommerce-authentication.md). Unlike
 * Shopify there is no OAuth redirect: the merchant supplies their store URL and
 * an API key pair, which we validate and store in the T015 vault (referenced by
 * an `oauth_connections` row with connector_id="woocommerce").
 *
 * The store URL is merchant-supplied and therefore untrusted, so it is strictly
 * validated: HTTPS only, and obvious internal/private hosts are rejected as a
 * first-line SSRF guard (the app's fetch layer performs deep SSRF hardening).
 *
 * Pure and deterministic; no network here.
 */
import { ConnectorError } from "../errors.js";

/** Hostnames/IPs that must never be used as a store URL (basic SSRF guard). */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "::1" || h === "0.0.0.0") return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true; // link-local (cloud metadata)
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

/**
 * Normalizes and validates a WooCommerce store URL, returning its origin
 * (`https://host[:port]`). Throws `ConnectorError` (validation) for non-HTTPS,
 * malformed, or internal/private hosts.
 */
export function normalizeStoreUrl(input: unknown): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new ConnectorError("store URL is required", "validation");
  }
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new ConnectorError("store URL is not a valid URL", "validation");
  }
  if (url.protocol !== "https:") {
    throw new ConnectorError("store URL must use https", "validation");
  }
  if (url.hostname.length === 0 || isPrivateHost(url.hostname)) {
    throw new ConnectorError("store URL host is not allowed", "validation");
  }
  return url.origin;
}

export interface WooCredentials {
  readonly storeUrl: string;
  readonly consumerKey: string;
  readonly consumerSecret: string;
}

/** Validates a credential set: valid store URL and non-empty ck/cs. */
export function validateWooCredentials(input: WooCredentials): WooCredentials {
  const storeUrl = normalizeStoreUrl(input?.storeUrl);
  if (typeof input.consumerKey !== "string" || input.consumerKey.length === 0) {
    throw new ConnectorError("consumerKey is required", "validation");
  }
  if (typeof input.consumerSecret !== "string" || input.consumerSecret.length === 0) {
    throw new ConnectorError("consumerSecret is required", "validation");
  }
  return { storeUrl, consumerKey: input.consumerKey, consumerSecret: input.consumerSecret };
}

/** Builds the HTTP Basic `Authorization` header value for the credential pair. */
export function buildWooAuthHeader(credentials: WooCredentials): string {
  const { consumerKey, consumerSecret } = validateWooCredentials(credentials);
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
}

/** Base path for the WooCommerce REST API v3. */
export const WOO_API_BASE = "/wp-json/wc/v3";

/** Builds a WooCommerce REST API URL for `path` with optional query params. */
export function buildWooApiUrl(
  storeUrl: string,
  path: string,
  query: Readonly<Record<string, string | number | undefined>> = {},
): string {
  const origin = normalizeStoreUrl(storeUrl);
  const clean = path.replace(/^\/+/, "");
  const url = new URL(`${origin}${WOO_API_BASE}/${clean}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * Builds a lightweight request the app can use to verify credentials (a single
 * product fetch). Returns the URL, method, and Authorization header — no network.
 */
export function buildWooCredentialTestRequest(credentials: WooCredentials): {
  readonly url: string;
  readonly method: "GET";
  readonly headers: Readonly<Record<string, string>>;
} {
  const creds = validateWooCredentials(credentials);
  return {
    url: buildWooApiUrl(creds.storeUrl, "products", { per_page: 1 }),
    method: "GET",
    headers: { Authorization: buildWooAuthHeader(creds), Accept: "application/json" },
  };
}
