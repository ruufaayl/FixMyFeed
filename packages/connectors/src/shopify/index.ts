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

export {
  SHOPIFY_BULK_STATUSES,
  SHOPIFY_PRODUCT_BULK_QUERY,
  isBulkTerminal,
  isBulkComplete,
  buildProductBulkRunMutation,
  mapShopifyProduct,
  parseBulkJsonl,
} from "./bulk-import.js";
export type {
  ShopifyBulkStatus,
  NormalizedProduct,
  NormalizedProductStatus,
  NormalizedVariant,
  NormalizedImage,
  RawShopifyProduct,
  RawShopifyVariant,
  RawShopifyImage,
} from "./bulk-import.js";

export {
  SHOPIFY_WEBHOOK_HEADERS,
  SHOPIFY_WEBHOOK_TOPICS,
  SHOPIFY_EVENT_KINDS,
  classifyShopifyTopic,
  verifyShopifyWebhook,
  parseShopifyWebhookHeaders,
  mapShopifyRestProduct,
} from "./webhooks.js";
export type {
  ShopifyWebhookTopic,
  ShopifyEventKind,
  ShopifyWebhookEnvelope,
  RestShopifyProduct,
} from "./webhooks.js";

export {
  shopifyProductFingerprint,
  reconcileShopifyCatalog,
  buildIncrementalProductsQuery,
  maxUpdatedAt,
} from "./reconciliation.js";
export type { IncrementalQueryOptions } from "./reconciliation.js";

export {
  WRITEBACK_ALLOWED_PRODUCT_FIELDS,
  WRITEBACK_ALLOWED_VARIANT_FIELDS,
  validateProductWriteback,
  validateVariantWriteback,
  assertWritebackAuthorized,
  detectWritebackConflict,
  assertNoWritebackConflict,
  buildProductUpdateMutation,
  buildVariantUpdateMutation,
  userErrorsToConnectorError,
} from "./writeback.js";
export type {
  WritebackProductField,
  WritebackVariantField,
  ProductWritebackInput,
  VariantWritebackInput,
  WritebackApproval,
  WritebackPlan,
  ShopifyUserError,
} from "./writeback.js";
