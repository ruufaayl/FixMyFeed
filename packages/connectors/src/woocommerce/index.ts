/**
 * WooCommerce connector (tasks T050–T054).
 *
 * Credential connection (T050), catalog sync (T051), webhook ingestion (T052),
 * reconciliation + hosting-fault handling (T053), and controlled writeback
 * (T054). Re-exported under the `woocommerce` namespace from the connectors
 * package root. Produces the shared `NormalizedProduct` shape so diagnostics are
 * source-neutral across Shopify and WooCommerce.
 */
export {
  WOO_API_BASE,
  normalizeStoreUrl,
  validateWooCredentials,
  buildWooAuthHeader,
  buildWooApiUrl,
  buildWooCredentialTestRequest,
} from "./auth.js";
export type { WooCredentials } from "./auth.js";

export { buildWooProductsUrl, mapWooProduct, wooProductGid, wooModifiedAt } from "./catalog.js";
export type { WooListOptions, WooProduct, WooVariation } from "./catalog.js";

export {
  WOO_WEBHOOK_HEADERS,
  WOO_WEBHOOK_TOPICS,
  WOO_EVENT_KINDS,
  classifyWooTopic,
  verifyWooWebhook,
  parseWooWebhookHeaders,
} from "./webhooks.js";
export type { WooWebhookTopic, WooEventKind, WooWebhookEnvelope } from "./webhooks.js";

export {
  wooProductFingerprint,
  reconcileWooCatalog,
  maxModifiedAt,
  looksLikeHtml,
  classifyWooResponse,
} from "./reconciliation.js";
export type { WooResponseInput } from "./reconciliation.js";

export {
  WOO_WRITEBACK_ALLOWED_FIELDS,
  validateWooWriteback,
  assertWooWritebackAuthorized,
  detectWooWritebackConflict,
  assertNoWooWritebackConflict,
  buildWooProductUpdateRequest,
} from "./writeback.js";
export type {
  WooWritebackField,
  WooWritebackInput,
  WooWritebackApproval,
  WooWritebackPlan,
} from "./writeback.js";
