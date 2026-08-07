/**
 * Shopify connector contract (task T040).
 *
 * The concrete capability descriptor for the Shopify connector, validated
 * against the shared T030 contract. Later Shopify tasks (catalog import,
 * webhooks, reconciliation, writeback) read this to know what the connector
 * supports.
 */
import { validateConnectorContract, type ConnectorContract } from "../capabilities.js";

/** Supported Shopify Admin API versions (YYYY-MM), newest last. */
export const SHOPIFY_API_VERSIONS = ["2025-01", "2025-04", "2025-07"] as const;

/** Default (newest) Shopify Admin API version. */
export const SHOPIFY_DEFAULT_API_VERSION = "2025-07";

/**
 * The Shopify connector's published contract. Rate limit models Shopify's
 * REST leaky bucket (40 burst, ~2/sec sustained → 40 per 20s); webhooks are
 * HMAC-verified; pagination is cursor (opaque `page_info`) based.
 */
export const shopifyConnectorContract: ConnectorContract = validateConnectorContract({
  connectorId: "shopify",
  displayName: "Shopify",
  authModes: ["oauth2"],
  objects: [
    { type: "product", scopes: ["read", "write"] },
    { type: "variant", scopes: ["read", "write"] },
    { type: "collection", scopes: ["read"] },
    { type: "inventory", scopes: ["read", "write"] },
    { type: "price", scopes: ["read", "write"] },
    { type: "image", scopes: ["read", "write"] },
  ],
  rateLimit: { requestsPerWindow: 40, windowSeconds: 20, retryAfterHonored: true },
  webhooks: { supported: true, verification: "hmac" },
  cursor: "opaque",
  apiVersions: {
    supported: [...SHOPIFY_API_VERSIONS],
    default: SHOPIFY_DEFAULT_API_VERSION,
  },
});
