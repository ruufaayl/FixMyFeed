/**
 * Shopify incremental reconciliation (task T043).
 *
 * After the initial full import (T041), the catalog is kept in sync
 * incrementally: fetch the products changed since the last watermark, diff them
 * against the local snapshot, and advance a monotonic `timestamp` sync cursor
 * (T034). This module is pure — it builds the incremental query, computes a
 * change-detection fingerprint, runs the T034 reconcile, and advances the
 * watermark. The worker performs the HTTP fetch and applies the result.
 */
import { createHash } from "node:crypto";
import { ConnectorError } from "../errors.js";
import { reconcile, type ReconciliationResult } from "../reconciliation.js";
import type { NormalizedProduct } from "./bulk-import.js";

/** Canonicalizes a product's diagnostic-relevant fields for stable hashing. */
function canonicalProduct(product: NormalizedProduct): unknown {
  return {
    title: product.title,
    description: product.description,
    status: product.status,
    productType: product.productType,
    vendor: product.vendor,
    onlineStoreUrl: product.onlineStoreUrl,
    tags: [...product.tags].sort(),
    images: product.images.map((i) => ({ id: i.externalId, url: i.url, alt: i.altText })),
    variants: product.variants
      .map((v) => ({
        id: v.externalId,
        sku: v.sku,
        barcode: v.barcode,
        title: v.title,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        availableForSale: v.availableForSale,
        inventoryQuantity: v.inventoryQuantity,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}

/** Deterministic change-detection fingerprint for a normalized product. */
export function shopifyProductFingerprint(product: NormalizedProduct): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalProduct(product)))
    .digest("hex");
}

/**
 * Reconciles a local catalog snapshot against the remote (source of truth) set
 * of products, keyed by `externalId` and compared by content fingerprint
 * (T034 `reconcile`): added / updated / removed / unchanged.
 */
export function reconcileShopifyCatalog(
  local: readonly NormalizedProduct[],
  remote: readonly NormalizedProduct[],
): ReconciliationResult<NormalizedProduct, NormalizedProduct> {
  return reconcile(local, remote, {
    keyOfLocal: (p) => p.externalId,
    keyOfRemote: (p) => p.externalId,
    fingerprintOfLocal: shopifyProductFingerprint,
    fingerprintOfRemote: shopifyProductFingerprint,
  });
}

export interface IncrementalQueryOptions {
  /** Page size (Shopify max 250). Default 250. */
  readonly pageSize?: number;
  /** GraphQL `after` cursor for pagination within a page loop. */
  readonly after?: string;
}

/**
 * Builds the GraphQL query that fetches products updated at/after `sinceIso`,
 * sorted by `UPDATED_AT` ascending so the watermark advances safely. Includes
 * `updatedAt` on each node so the caller can advance the cursor.
 */
export function buildIncrementalProductsQuery(
  sinceIso: string,
  options: IncrementalQueryOptions = {},
): string {
  if (typeof sinceIso !== "string" || Number.isNaN(Date.parse(sinceIso))) {
    throw new ConnectorError("sinceIso must be a valid ISO timestamp", "validation");
  }
  const pageSize = Math.min(Math.max(1, options.pageSize ?? 250), 250);
  const after = options.after ? `, after: ${JSON.stringify(options.after)}` : "";
  const filter = `updated_at:>='${sinceIso}'`;
  return `
{
  products(first: ${pageSize}${after}, query: ${JSON.stringify(filter)}, sortKey: UPDATED_AT) {
    edges {
      cursor
      node {
        id
        handle
        title
        descriptionHtml
        productType
        vendor
        status
        tags
        onlineStoreUrl
        updatedAt
        variants(first: 100) {
          edges { node { id sku barcode title price compareAtPrice availableForSale inventoryQuantity } }
        }
        media(first: 100) {
          edges { node { ... on MediaImage { id image { url altText } } } }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`.trim();
}

/**
 * Advances a `timestamp` watermark monotonically: returns the latest valid ISO
 * timestamp among `current` and `candidates`. Invalid or older candidates are
 * ignored, so a late/out-of-order page can never move the cursor backwards.
 */
export function maxUpdatedAt(
  current: string | null,
  candidates: readonly (string | null | undefined)[],
): string | null {
  let bestMs = current !== null ? Date.parse(current) : Number.NEGATIVE_INFINITY;
  if (Number.isNaN(bestMs)) bestMs = Number.NEGATIVE_INFINITY;
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const ms = Date.parse(candidate);
    if (Number.isNaN(ms)) continue;
    if (ms > bestMs) bestMs = ms;
  }
  // Always return canonical ISO (or null when there is no valid watermark).
  return bestMs === Number.NEGATIVE_INFINITY ? null : new Date(bestMs).toISOString();
}
