/**
 * WooCommerce catalog synchronization (task T051).
 *
 * Pure pipeline to page through the WooCommerce REST products endpoint and map
 * each product into the shared `NormalizedProduct` shape (the same one the
 * Shopify connector produces, so diagnostics are source-neutral). Simple
 * products become a single synthetic variant; variable products map their
 * variations. The worker performs the HTTP fetch; this module builds the request
 * URL and transforms the JSON. No network here.
 */
import { ConnectorError } from "../errors.js";
import { buildWooApiUrl } from "./auth.js";
import type {
  NormalizedImage,
  NormalizedProduct,
  NormalizedProductStatus,
  NormalizedVariant,
} from "../shopify/bulk-import.js";

export interface WooListOptions {
  readonly page?: number;
  readonly perPage?: number;
  /** ISO timestamp for incremental sync (`modified_after`). */
  readonly modifiedAfter?: string;
}

/** Builds the products-list URL (paginated, ordered by modified for stable paging). */
export function buildWooProductsUrl(storeUrl: string, options: WooListOptions = {}): string {
  const page = Math.max(1, options.page ?? 1);
  const perPage = Math.min(Math.max(1, options.perPage ?? 100), 100);
  const query: Record<string, string | number | undefined> = {
    page,
    per_page: perPage,
    orderby: "modified",
    order: "asc",
  };
  if (options.modifiedAfter !== undefined) {
    if (Number.isNaN(Date.parse(options.modifiedAfter))) {
      throw new ConnectorError("modifiedAfter must be a valid ISO timestamp", "validation");
    }
    query.modified_after = options.modifiedAfter;
  }
  return buildWooApiUrl(storeUrl, "products", query);
}

interface WooCategory {
  readonly name?: string;
}
interface WooImage {
  readonly id?: string | number;
  readonly src?: string;
  readonly alt?: string | null;
}
export interface WooVariation {
  readonly id?: string | number;
  readonly sku?: string | null;
  readonly global_unique_id?: string | null;
  readonly price?: string | number | null;
  readonly regular_price?: string | number | null;
  readonly sale_price?: string | number | null;
  readonly stock_status?: string;
  readonly stock_quantity?: number | null;
  readonly description?: string | null;
}
export interface WooProduct {
  readonly id?: string | number;
  readonly name?: string;
  readonly slug?: string | null;
  readonly permalink?: string | null;
  readonly description?: string | null;
  readonly type?: string;
  readonly status?: string;
  readonly sku?: string | null;
  readonly global_unique_id?: string | null;
  readonly price?: string | number | null;
  readonly regular_price?: string | number | null;
  readonly sale_price?: string | number | null;
  readonly stock_status?: string;
  readonly stock_quantity?: number | null;
  readonly categories?: readonly WooCategory[];
  readonly tags?: readonly WooCategory[];
  readonly images?: readonly WooImage[];
  readonly date_modified_gmt?: string | null;
  readonly date_modified?: string | null;
}

const str = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

/** WooCommerce statuses → normalized status. */
function mapStatus(raw: unknown): NormalizedProductStatus {
  switch (typeof raw === "string" ? raw.toLowerCase() : "") {
    case "publish":
      return "active";
    case "private":
    case "trash":
      return "archived";
    default:
      return "draft"; // draft, pending, future, …
  }
}

const price = (v: unknown): string | null =>
  v === undefined || v === null || v === "" ? null : String(v);
const available = (stockStatus: unknown): boolean =>
  typeof stockStatus !== "string" || stockStatus === "instock";

/** Product external id in a stable, source-tagged form. */
export const wooProductGid = (id: string | number): string => `woocommerce://product/${id}`;
const wooVariationGid = (id: string | number): string => `woocommerce://variation/${id}`;

/**
 * Maps a WooCommerce product (and optional variations) into a NormalizedProduct.
 * A simple product yields one synthetic variant from its own sku/price/stock; a
 * variable product maps each supplied variation.
 */
export function mapWooProduct(
  raw: WooProduct,
  variations: readonly WooVariation[] = [],
): NormalizedProduct {
  if (raw?.id === undefined || raw.id === null || String(raw.id).length === 0) {
    throw new ConnectorError("WooCommerce product is missing an id", "validation");
  }
  if (typeof raw.name !== "string" || raw.name.length === 0) {
    throw new ConnectorError("WooCommerce product is missing a name", "validation");
  }
  const images: NormalizedImage[] = (raw.images ?? [])
    .filter((img) => typeof img.src === "string")
    .map((img) => ({
      externalId: `woocommerce://media/${img.id}`,
      url: img.src as string,
      altText: str(img.alt),
    }));

  let variants: NormalizedVariant[];
  if (variations.length > 0) {
    variants = variations.map((v) => ({
      externalId: wooVariationGid(String(v.id)),
      sku: str(v.sku),
      barcode: str(v.global_unique_id),
      title: null,
      price: price(v.regular_price ?? v.price),
      compareAtPrice: price(v.sale_price),
      availableForSale: available(v.stock_status),
      inventoryQuantity: typeof v.stock_quantity === "number" ? v.stock_quantity : null,
    }));
  } else {
    // A simple product is its own single variant.
    variants = [
      {
        externalId: wooProductGid(String(raw.id)),
        sku: str(raw.sku),
        barcode: str(raw.global_unique_id),
        title: null,
        price: price(raw.regular_price ?? raw.price),
        compareAtPrice: price(raw.sale_price),
        availableForSale: available(raw.stock_status),
        inventoryQuantity: typeof raw.stock_quantity === "number" ? raw.stock_quantity : null,
      },
    ];
  }

  return {
    externalId: wooProductGid(String(raw.id)),
    handle: str(raw.slug),
    title: raw.name,
    description: str(raw.description),
    productType: str(raw.categories?.[0]?.name),
    vendor: null,
    status: mapStatus(raw.status),
    tags: (raw.tags ?? [])
      .map((t) => t.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0),
    onlineStoreUrl: str(raw.permalink),
    images,
    variants,
  };
}

/** The `date_modified_gmt` (preferred) or `date_modified` for watermark advancement. */
export function wooModifiedAt(raw: WooProduct): string | null {
  return str(raw.date_modified_gmt) ?? str(raw.date_modified);
}
