/**
 * @fixmyfeed/diagnostics
 *
 * Feed ingestion (E07) and the deterministic validator / diagnostic-scan engine
 * (E08). Operates on the canonical `CatalogProduct` shape from `domain`, so it is
 * source-neutral across Shopify, WooCommerce, and uploaded/URL feeds.
 */
export const workspaceName = "@fixmyfeed/diagnostics" as const;
export const workspaceKind = "package" as const;

export { DIAGNOSTICS_ERROR_CODE, DiagnosticsError } from "./errors.js";
export type { DiagnosticsErrorCode } from "./errors.js";

// T070 feed upload / remote acquisition.
export {
  FEED_FORMATS,
  FEED_SOURCE_KINDS,
  MAX_FEED_BYTES,
  validateFeedUrl,
  detectFeedFormat,
  validateFeedSource,
} from "./acquisition.js";
export type { FeedFormat, FeedSourceKind, FeedSourceInput, FeedSource } from "./acquisition.js";
