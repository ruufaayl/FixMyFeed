/**
 * Shopify connector (task T040+).
 *
 * Installation/OAuth (T040) today; catalog import, webhooks, reconciliation, and
 * writeback added by later T04x tasks. Re-exported under the `shopify` namespace
 * from the connectors package root.
 */
export {
  SHOPIFY_API_VERSIONS,
  SHOPIFY_DEFAULT_API_VERSION,
  shopifyConnectorContract,
} from "./contract.js";

export {
  isValidShopDomain,
  normalizeShopDomain,
  buildShopifyInstallUrl,
  verifyShopifyOAuthHmac,
  verifyShopifyInstallCallback,
  buildShopifyTokenExchange,
  parseShopifyTokenResponse,
} from "./oauth.js";
export type {
  ShopifyInstallInput,
  ShopifyCallbackInput,
  ShopifyTokenExchangeInput,
  RawShopifyTokenResponse,
  ShopifyToken,
} from "./oauth.js";
