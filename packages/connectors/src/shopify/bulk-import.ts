/**
 * Shopify bulk catalog import (task T041).
 *
 * Pure pipeline for importing a Shopify store's catalog via the GraphQL Admin
 * **Bulk Operations** API (shopify-bulk-operations.md, shopify-product-model.md,
 * shopify-source-mapping.md):
 *
 * 1. `buildProductBulkRunMutation` — the mutation that starts a bulk export of
 *    products (with nested variants and media).
 * 2. bulk-operation status helpers — classify CREATED/RUNNING/COMPLETED/… so the
 *    orchestrating job (a T025 operation) knows when the JSONL result is ready.
 * 3. `parseBulkJsonl` — reconstruct the product tree from Shopify's flattened
 *    JSONL (children reference their parent via `__parentId`).
 * 4. `mapShopifyProduct` — normalize a Shopify product into the internal catalog
 *    shape used by diagnostics and later persistence (T073).
 *
 * The app runs the GraphQL request and downloads the JSONL; this module only
 * builds requests and transforms text/objects. No network, no persistence, no
 * new dependency.
 */
import { ConnectorError } from "../errors.js";

// ---------------------------------------------------------------------------
// Bulk operation lifecycle
// ---------------------------------------------------------------------------

export const SHOPIFY_BULK_STATUSES = [
  "CREATED",
  "RUNNING",
  "COMPLETED",
  "CANCELING",
  "CANCELED",
  "FAILED",
  "EXPIRED",
] as const;
export type ShopifyBulkStatus = (typeof SHOPIFY_BULK_STATUSES)[number];

const TERMINAL_BULK: readonly ShopifyBulkStatus[] = ["COMPLETED", "CANCELED", "FAILED", "EXPIRED"];

/** True once the bulk operation has reached a terminal state. */
export function isBulkTerminal(status: ShopifyBulkStatus): boolean {
  return TERMINAL_BULK.includes(status);
}

/** True when the operation finished successfully and a result URL is available. */
export function isBulkComplete(status: ShopifyBulkStatus): boolean {
  return status === "COMPLETED";
}

/** GraphQL query exported by the bulk operation: products with variants and media. */
export const SHOPIFY_PRODUCT_BULK_QUERY = `
{
  products {
    edges {
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
        variants {
          edges {
            node {
              id
              sku
              barcode
              title
              price
              compareAtPrice
              availableForSale
              inventoryQuantity
            }
          }
        }
        media {
          edges {
            node {
              ... on MediaImage {
                id
                image { url altText }
              }
            }
          }
        }
      }
    }
  }
}`.trim();

/** Wraps a query in the `bulkOperationRunQuery` mutation string. */
export function buildProductBulkRunMutation(query: string = SHOPIFY_PRODUCT_BULK_QUERY): string {
  const escaped = JSON.stringify(query);
  return `mutation {
  bulkOperationRunQuery(query: ${escaped}) {
    bulkOperation { id status }
    userErrors { field message }
  }
}`;
}

// ---------------------------------------------------------------------------
// Normalized catalog shape (Shopify connector output)
// ---------------------------------------------------------------------------

export type NormalizedProductStatus = "active" | "archived" | "draft";

export interface NormalizedImage {
  readonly externalId: string;
  readonly url: string;
  readonly altText: string | null;
}

export interface NormalizedVariant {
  readonly externalId: string;
  readonly sku: string | null;
  /** Barcode — the GTIN/UPC/EAN used by Merchant Center diagnostics. */
  readonly barcode: string | null;
  readonly title: string | null;
  readonly price: string | null;
  readonly compareAtPrice: string | null;
  readonly availableForSale: boolean;
  readonly inventoryQuantity: number | null;
}

export interface NormalizedProduct {
  readonly externalId: string;
  readonly handle: string | null;
  readonly title: string;
  readonly description: string | null;
  readonly productType: string | null;
  readonly vendor: string | null;
  readonly status: NormalizedProductStatus;
  readonly tags: readonly string[];
  readonly onlineStoreUrl: string | null;
  readonly images: readonly NormalizedImage[];
  readonly variants: readonly NormalizedVariant[];
}

function mapStatus(raw: unknown): NormalizedProductStatus {
  const value = typeof raw === "string" ? raw.toUpperCase() : "";
  if (value === "ARCHIVED") return "archived";
  if (value === "DRAFT") return "draft";
  return "active";
}

const str = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

/** Maps a raw Shopify product node (with attached variants/images) to a NormalizedProduct. */
export function mapShopifyProduct(raw: RawShopifyProduct): NormalizedProduct {
  if (typeof raw?.id !== "string" || raw.id.length === 0) {
    throw new ConnectorError("Shopify product is missing an id", "validation");
  }
  if (typeof raw.title !== "string" || raw.title.length === 0) {
    throw new ConnectorError("Shopify product is missing a title", "validation");
  }
  return {
    externalId: raw.id,
    handle: str(raw.handle),
    title: raw.title,
    description: str(raw.descriptionHtml),
    productType: str(raw.productType),
    vendor: str(raw.vendor),
    status: mapStatus(raw.status),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === "string") : [],
    onlineStoreUrl: str(raw.onlineStoreUrl),
    images: (raw.images ?? []).map((img) => ({
      externalId: String(img.id),
      url: String(img.url),
      altText: str(img.altText),
    })),
    variants: (raw.variants ?? []).map((v) => ({
      externalId: String(v.id),
      sku: str(v.sku),
      barcode: str(v.barcode),
      title: str(v.title),
      price: v.price === undefined || v.price === null ? null : String(v.price),
      compareAtPrice:
        v.compareAtPrice === undefined || v.compareAtPrice === null
          ? null
          : String(v.compareAtPrice),
      availableForSale: v.availableForSale === true,
      inventoryQuantity: typeof v.inventoryQuantity === "number" ? v.inventoryQuantity : null,
    })),
  };
}

// ---------------------------------------------------------------------------
// JSONL reconstruction
// ---------------------------------------------------------------------------

export interface RawShopifyImage {
  readonly id: string | number;
  readonly url: string;
  readonly altText?: string | null;
}
export interface RawShopifyVariant {
  readonly id: string | number;
  readonly sku?: string | null;
  readonly barcode?: string | null;
  readonly title?: string | null;
  readonly price?: string | number | null;
  readonly compareAtPrice?: string | number | null;
  readonly availableForSale?: boolean;
  readonly inventoryQuantity?: number | null;
}
export interface RawShopifyProduct {
  readonly id: string;
  readonly handle?: string | null;
  readonly title?: string;
  readonly descriptionHtml?: string | null;
  readonly productType?: string | null;
  readonly vendor?: string | null;
  readonly status?: string;
  readonly tags?: readonly unknown[];
  readonly onlineStoreUrl?: string | null;
  variants?: RawShopifyVariant[];
  images?: RawShopifyImage[];
}

const isProductGid = (id: unknown): boolean =>
  typeof id === "string" && id.startsWith("gid://shopify/Product/");
const isVariantGid = (id: unknown): boolean =>
  typeof id === "string" && id.startsWith("gid://shopify/ProductVariant/");

/**
 * Reconstructs products from Shopify's flattened bulk **JSONL**: parents (no
 * `__parentId`) are products; child lines reference their product via
 * `__parentId`. Variant lines become variants; lines carrying an image become
 * images. Blank lines are ignored; a malformed line throws.
 */
export function parseBulkJsonl(jsonl: string): NormalizedProduct[] {
  const products = new Map<string, RawShopifyProduct>();
  const order: string[] = [];

  const lines = jsonl.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.trim();
    if (!line) continue;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(line) as Record<string, unknown>;
    } catch {
      throw new ConnectorError(`bulk JSONL line ${i + 1} is not valid JSON`, "validation");
    }

    const parentId = obj.__parentId;
    if (parentId === undefined || parentId === null) {
      // A top-level product line.
      if (!isProductGid(obj.id)) continue; // skip non-product roots
      const id = obj.id as string;
      products.set(id, { ...(obj as unknown as RawShopifyProduct), variants: [], images: [] });
      order.push(id);
      continue;
    }

    const parent = products.get(String(parentId));
    if (!parent) continue; // orphan child (parent filtered out) — skip

    if (isVariantGid(obj.id)) {
      parent.variants!.push(obj as unknown as RawShopifyVariant);
    } else if (obj.image && typeof obj.image === "object") {
      const image = obj.image as { url?: string; altText?: string | null };
      if (typeof image.url === "string") {
        parent.images!.push({
          id: obj.id as string,
          url: image.url,
          altText: image.altText ?? null,
        });
      }
    }
  }

  return order.map((id) => mapShopifyProduct(products.get(id)!));
}
