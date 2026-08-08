/**
 * Authenticated Shopify Admin GraphQL client (task T160).
 *
 * A thin, transport-injected client for the Shopify Admin API. It never fetches
 * directly (the transport is supplied by the caller so credentials/network stay
 * at the application edge) and it never logs, returns, or embeds the access token
 * in an error — the token is only ever placed in the request header. Failures are
 * normalized to canonical `ConnectorError` categories (T030); throttling (HTTP 429
 * or a GraphQL `THROTTLED` extension) becomes `rate_limit`. Pure aside from the
 * injected transport.
 */
import { ConnectorError, categoryFromHttpStatus } from "../errors.js";
import { SHOPIFY_DEFAULT_API_VERSION } from "./contract.js";
import { normalizeShopDomain } from "./oauth.js";

/** Minimal response shape the transport must provide (no header enumeration). */
export interface ShopifyHttpResponse {
  readonly status: number;
  readonly ok: boolean;
  /** Case-insensitive single-header lookup (e.g. `retry-after`). */
  header(name: string): string | null;
  json(): Promise<unknown>;
}

export interface ShopifyHttpRequest {
  readonly url: string;
  readonly method: "POST";
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

/** Injected HTTP transport (a `fetch` wrapper lives in the application layer). */
export interface ShopifyHttpTransport {
  send(request: ShopifyHttpRequest): Promise<ShopifyHttpResponse>;
}

export interface ShopifyAdminClientOptions {
  readonly shop: string;
  readonly accessToken: string;
  readonly transport: ShopifyHttpTransport;
  readonly apiVersion?: string;
}

export interface ShopifyAdminClient {
  readonly shop: string;
  graphql<T = unknown>(query: string, variables?: Readonly<Record<string, unknown>>): Promise<T>;
}

interface GraphqlEnvelope<T> {
  readonly data?: T | null;
  readonly errors?: ReadonlyArray<{
    readonly message?: string;
    readonly extensions?: { readonly code?: string };
  }>;
}

const THROTTLED_CODE = "THROTTLED";

/**
 * Builds an authenticated Admin GraphQL client bound to one shop + access token.
 * Construct it inside the credential vault callback so the token's lifetime is
 * scoped to the operation and never persisted or serialized.
 */
export function createShopifyAdminClient(options: ShopifyAdminClientOptions): ShopifyAdminClient {
  const shop = normalizeShopDomain(options.shop);
  if (typeof options.accessToken !== "string" || options.accessToken.length === 0) {
    throw new ConnectorError("Shopify access token is required", "authentication");
  }
  const apiVersion = options.apiVersion ?? SHOPIFY_DEFAULT_API_VERSION;
  const endpoint = `https://${shop}/admin/api/${apiVersion}/graphql.json`;

  return {
    shop,
    async graphql<T>(query: string, variables?: Readonly<Record<string, unknown>>): Promise<T> {
      let response: ShopifyHttpResponse;
      try {
        response = await options.transport.send({
          url: endpoint,
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": options.accessToken,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({ query, variables: variables ?? {} }),
        });
      } catch {
        // Never surface the raw error — it can echo request headers (the token).
        throw new ConnectorError("Shopify request failed to send", "network");
      }

      if (!response.ok) {
        const category = categoryFromHttpStatus(response.status);
        const retryAfter = response.header("retry-after");
        const retryAfterMs =
          retryAfter !== null && Number.isFinite(Number(retryAfter))
            ? Number(retryAfter) * 1000
            : undefined;
        throw new ConnectorError(`Shopify Admin API returned HTTP ${response.status}`, category, {
          providerCode: response.status,
          ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
        });
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ConnectorError("Shopify returned a non-JSON response", "upstream");
      }

      const envelope = (payload ?? {}) as GraphqlEnvelope<T>;
      if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
        if (envelope.errors.some((e) => e?.extensions?.code === THROTTLED_CODE)) {
          throw new ConnectorError("Shopify API throttled the request", "rate_limit");
        }
        // Only the provider messages (already safe) — never the variables/token.
        const message = envelope.errors.map((e) => e?.message ?? "error").join("; ");
        throw new ConnectorError(`Shopify GraphQL error: ${message}`, "upstream");
      }

      if (envelope.data === undefined || envelope.data === null) {
        throw new ConnectorError("Shopify response contained no data", "upstream");
      }
      return envelope.data;
    },
  };
}
