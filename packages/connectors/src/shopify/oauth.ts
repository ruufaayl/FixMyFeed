/**
 * Shopify installation and OAuth (task T040).
 *
 * Implements the Shopify Admin OAuth authorization-code flow on top of the T031
 * framework, adding the Shopify-specific security checks that must be exact:
 *
 * - the `shop` parameter is strictly validated to `*.myshopify.com` (an open
 *   `shop` value is an SSRF / open-redirect / token-exfiltration vector);
 * - the install callback is authenticated by Shopify's **query-string HMAC**
 *   (distinct from the webhook body HMAC), compared in constant time;
 * - the `state` nonce is verified (CSRF);
 * - the token exchange request is built for the caller to POST (no network here)
 *   and the Shopify token response (comma-separated scopes, optional online
 *   session) is normalized.
 *
 * Pure and deterministic; the app performs the HTTP calls and persists the
 * resulting token in the T015 vault via an `oauth_connections` row (T031).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { ConnectorError } from "../errors.js";

/** A Shopify shop domain: `store.myshopify.com` (lowercase, no scheme/path). */
const SHOP_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

/** True if `shop` is a well-formed `*.myshopify.com` domain. */
export function isValidShopDomain(shop: unknown): shop is string {
  return typeof shop === "string" && shop.length <= 255 && SHOP_DOMAIN_PATTERN.test(shop);
}

/**
 * Normalizes and validates a shop domain, accepting a bare handle (`store`),
 * a full domain, or an `https://store.myshopify.com` URL. Throws
 * `ConnectorError` (validation) on anything that is not a real myshopify domain.
 */
export function normalizeShopDomain(input: unknown): string {
  if (typeof input !== "string" || input.length === 0) {
    throw new ConnectorError("shop is required", "validation");
  }
  let shop = input.trim().toLowerCase();
  shop = shop.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!shop.includes(".")) shop = `${shop}.myshopify.com`;
  if (!isValidShopDomain(shop)) {
    throw new ConnectorError("shop must be a valid myshopify.com domain", "validation");
  }
  return shop;
}

export interface ShopifyInstallInput {
  readonly shop: string;
  readonly clientId: string;
  readonly scopes: readonly string[];
  readonly redirectUri: string;
  /** CSRF nonce to persist and check on callback. */
  readonly state: string;
  /** Request an online (per-user) token instead of an offline token. Default false. */
  readonly online?: boolean;
}

/**
 * Builds the Shopify install authorization URL:
 * `https://{shop}/admin/oauth/authorize?...`. Scopes are comma-separated (the
 * Shopify convention). Returns the validated shop alongside the URL.
 */
export function buildShopifyInstallUrl(input: ShopifyInstallInput): {
  readonly url: string;
  readonly shop: string;
} {
  const shop = normalizeShopDomain(input.shop);
  if (typeof input.clientId !== "string" || input.clientId.length === 0) {
    throw new ConnectorError("clientId is required", "validation");
  }
  if (typeof input.redirectUri !== "string" || input.redirectUri.length === 0) {
    throw new ConnectorError("redirectUri is required", "validation");
  }
  if (!Array.isArray(input.scopes) || input.scopes.length === 0) {
    throw new ConnectorError("at least one scope is required", "validation");
  }
  if (typeof input.state !== "string" || input.state.length === 0) {
    throw new ConnectorError("state is required", "validation");
  }
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("scope", input.scopes.join(","));
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("grant_options[]", input.online ? "per-user" : "");
  return { url: url.toString(), shop };
}

/** Constant-time comparison of two hex strings; false on any length/format mismatch. */
function hexEquals(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/**
 * Verifies Shopify's OAuth/redirect **query-string HMAC**: HMAC-SHA256 (hex) of
 * the query parameters — excluding `hmac` and `signature` — sorted by key and
 * joined as `key=value&…`, compared to the `hmac` parameter in constant time.
 */
export function verifyShopifyOAuthHmac(
  params: Readonly<Record<string, string | undefined>>,
  clientSecret: string,
): boolean {
  if (typeof clientSecret !== "string" || clientSecret.length === 0) {
    throw new ConnectorError("clientSecret is required", "validation");
  }
  const provided = params.hmac;
  if (typeof provided !== "string" || provided.length === 0) return false;
  const message = Object.keys(params)
    .filter((key) => key !== "hmac" && key !== "signature" && params[key] !== undefined)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const digest = createHmac("sha256", clientSecret).update(message).digest("hex");
  return hexEquals(provided, digest);
}

export interface ShopifyCallbackInput {
  readonly params: Readonly<Record<string, string | undefined>>;
  readonly expectedState: string;
  readonly clientSecret: string;
}

/**
 * Verifies a Shopify install callback end to end: valid shop domain, authentic
 * query-string HMAC, and matching `state` nonce (constant time). Returns the
 * validated `shop` and authorization `code`; throws a canonical `ConnectorError`
 * otherwise.
 */
export function verifyShopifyInstallCallback(input: ShopifyCallbackInput): {
  readonly shop: string;
  readonly code: string;
} {
  const { params } = input;
  const shop = normalizeShopDomain(params.shop);

  if (!verifyShopifyOAuthHmac(params, input.clientSecret)) {
    throw new ConnectorError("Shopify HMAC verification failed", "authentication");
  }

  const state = params.state;
  if (
    typeof input.expectedState !== "string" ||
    input.expectedState.length === 0 ||
    typeof state !== "string" ||
    state.length !== input.expectedState.length ||
    !timingSafeEqual(Buffer.from(state), Buffer.from(input.expectedState))
  ) {
    throw new ConnectorError("Shopify OAuth state mismatch (possible CSRF)", "authorization");
  }

  const code = params.code;
  if (typeof code !== "string" || code.length === 0) {
    throw new ConnectorError("authorization code is missing", "validation");
  }
  return { shop, code };
}

export interface ShopifyTokenExchangeInput {
  readonly shop: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly code: string;
}

/**
 * Builds the Shopify access-token exchange request for the caller to POST.
 * (No network here — keeps the package pure and secret-free of transport.)
 */
export function buildShopifyTokenExchange(input: ShopifyTokenExchangeInput): {
  readonly url: string;
  readonly method: "POST";
  readonly body: Readonly<Record<string, string>>;
} {
  const shop = normalizeShopDomain(input.shop);
  if (!input.clientId || !input.clientSecret || !input.code) {
    throw new ConnectorError("clientId, clientSecret and code are required", "validation");
  }
  return {
    url: `https://${shop}/admin/oauth/access_token`,
    method: "POST",
    body: { client_id: input.clientId, client_secret: input.clientSecret, code: input.code },
  };
}

/** Raw Shopify token response (offline or online). */
export interface RawShopifyTokenResponse {
  readonly access_token?: string;
  /** Comma-separated granted scopes. */
  readonly scope?: string;
  /** Present for online (per-user) tokens. */
  readonly expires_in?: number;
  readonly associated_user_scope?: string;
}

export interface ShopifyToken {
  readonly accessToken: string;
  readonly scopes: readonly string[];
  readonly online: boolean;
  readonly expiresAt?: Date;
}

/** Normalizes a Shopify token response (comma-separated scopes, optional online session). */
export function parseShopifyTokenResponse(
  raw: RawShopifyTokenResponse,
  now: () => Date = () => new Date(),
): ShopifyToken {
  if (typeof raw?.access_token !== "string" || raw.access_token.length === 0) {
    throw new ConnectorError("Shopify token response is missing access_token", "authentication");
  }
  const online = typeof raw.expires_in === "number" && Number.isFinite(raw.expires_in);
  return {
    accessToken: raw.access_token,
    scopes:
      typeof raw.scope === "string" && raw.scope.length > 0
        ? raw.scope
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [],
    online,
    expiresAt: online ? new Date(now().getTime() + (raw.expires_in as number) * 1000) : undefined,
  };
}
