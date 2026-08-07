/**
 * Normalized catalog logic (task T073).
 *
 * Pure helpers to fingerprint a normalized product for change detection, build a
 * `catalog_products` row, and compute a deterministic, immutable catalog
 * snapshot (a content hash + count) for the append-only `catalog_snapshots`
 * table. No I/O.
 */
import { createHash } from "node:crypto";
import type { CatalogProduct } from "@fixmyfeed/domain";
import type { NewCatalogProductRow, NewCatalogSnapshot } from "./catalog-schema.js";

/** Canonicalizes a product's diagnostic-relevant fields for stable hashing. */
function canonicalProduct(product: CatalogProduct): unknown {
  return {
    externalId: product.externalId,
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
        gtin: v.gtin,
        title: v.title,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        availableForSale: v.availableForSale,
        inventoryQuantity: v.inventoryQuantity,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}

/** Deterministic content fingerprint for a normalized catalog product. */
export function catalogProductFingerprint(product: CatalogProduct): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalProduct(product)))
    .digest("hex");
}

/** Builds a `catalog_products` insert row from a normalized product. */
export function toCatalogProductRow(
  organizationId: string,
  catalogId: string,
  product: CatalogProduct,
): NewCatalogProductRow {
  return {
    organizationId,
    catalogId,
    externalId: product.externalId,
    fingerprint: catalogProductFingerprint(product),
    payload: product as unknown as NewCatalogProductRow["payload"],
  };
}

export interface CatalogSnapshotResult {
  readonly snapshotHash: string;
  readonly productCount: number;
}

/**
 * Computes a deterministic snapshot of a whole catalog: the SHA-256 over the
 * sorted per-product fingerprints, plus the product count. The same set of
 * products (in any order) always yields the same hash.
 */
export function buildCatalogSnapshot(products: readonly CatalogProduct[]): CatalogSnapshotResult {
  const fingerprints = products.map(catalogProductFingerprint).sort();
  const snapshotHash = createHash("sha256").update(fingerprints.join("\n")).digest("hex");
  return { snapshotHash, productCount: products.length };
}

/** Builds an immutable `catalog_snapshots` insert row. */
export function toCatalogSnapshotRow(
  organizationId: string,
  catalogId: string,
  snapshot: CatalogSnapshotResult,
  capturedAt: Date = new Date(),
): NewCatalogSnapshot {
  return {
    organizationId,
    catalogId,
    snapshotHash: snapshot.snapshotHash,
    productCount: snapshot.productCount,
    capturedAt,
  };
}
