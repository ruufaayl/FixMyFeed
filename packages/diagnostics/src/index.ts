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

// T071 streaming CSV/TSV/XML/JSON parsers.
export { parseDelimited, parseCsv, parseTsv, parseJson, parseXml, parseFeed } from "./parsers.js";
export type { FeedRecord } from "./parsers.js";

// T072 schema mapping + import preview.
export {
  FEED_ATTRIBUTES,
  REQUIRED_FEED_ATTRIBUTES,
  inferMapping,
  applyMapping,
  buildImportPreview,
} from "./schema-mapping.js";
export type { FeedAttribute, SchemaMapping, ImportPreview } from "./schema-mapping.js";

// T074 product identity + variant matching.
export {
  normalizeGtin,
  normalizeSku,
  variantIdentityKeys,
  productIdentityKeys,
  matchProducts,
  matchVariants,
} from "./identity-matching.js";
export type { ProductMatch, ProductMatchResult, VariantMatch } from "./identity-matching.js";

// T075 incremental synchronization checkpoints.
export {
  fingerprintIndex,
  computeCatalogDelta,
  deltaHasChanges,
  buildSyncCheckpoint,
} from "./sync-checkpoints.js";
export type {
  FingerprintRow,
  CatalogDelta,
  SyncCheckpoint,
  SyncCheckpointCounts,
} from "./sync-checkpoints.js";

// T076 full reconciliation + discrepancy records.
export { DISCREPANCY_KINDS, reconcileCatalogs, toCatalogDiscrepancyRow } from "./reconciliation.js";
export type {
  CatalogDiscrepancy,
  ReconciliationResult,
  ReconciliationSummary,
} from "./reconciliation.js";
