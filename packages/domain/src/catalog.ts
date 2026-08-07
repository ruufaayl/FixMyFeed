/**
 * Canonical normalized catalog shape (Epic E07).
 *
 * The source-neutral representation of a merchant's products used across the
 * platform: connectors (Shopify/WooCommerce) map their payloads into it, the
 * database persists it (T073), and the diagnostics engine (E08) validates it.
 * Living in the pure `domain` package lets every layer share one shape.
 *
 * Types only — no runtime, no dependencies.
 */

export const CATALOG_PRODUCT_STATUSES = ["active", "archived", "draft"] as const;
export type CatalogProductStatus = (typeof CATALOG_PRODUCT_STATUSES)[number];

export interface CatalogImage {
  /** Source-side identifier for the image. */
  readonly externalId: string;
  readonly url: string;
  readonly altText: string | null;
}

export interface CatalogVariant {
  readonly externalId: string;
  readonly sku: string | null;
  /** GTIN / UPC / EAN (Merchant Center `gtin`). */
  readonly gtin: string | null;
  readonly title: string | null;
  /** Decimal price as a string to avoid float drift. */
  readonly price: string | null;
  readonly compareAtPrice: string | null;
  readonly availableForSale: boolean;
  readonly inventoryQuantity: number | null;
}

export interface CatalogProduct {
  /** Stable source identifier (e.g. `gid://shopify/Product/1`, `woocommerce://product/1`). */
  readonly externalId: string;
  readonly handle: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly productType: string | null;
  readonly vendor: string | null;
  readonly status: CatalogProductStatus;
  readonly tags: readonly string[];
  readonly onlineStoreUrl: string | null;
  readonly images: readonly CatalogImage[];
  readonly variants: readonly CatalogVariant[];
}
