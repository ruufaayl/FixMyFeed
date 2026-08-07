/**
 * Schema mapping and import preview (task T072).
 *
 * Maps arbitrary feed columns to the canonical Merchant Center product
 * attributes, auto-inferring the mapping from common header aliases, applying it
 * to parsed records, and building an import preview that shows coverage of the
 * required attributes before a full import (shopify/woocommerce/google
 * source-mapping specs). Pure and deterministic.
 */
import { DiagnosticsError } from "./errors.js";
import type { FeedRecord } from "./parsers.js";

/** Canonical Merchant Center product attributes we map feeds onto. */
export const FEED_ATTRIBUTES = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "additional_image_link",
  "price",
  "sale_price",
  "availability",
  "gtin",
  "mpn",
  "brand",
  "condition",
  "product_type",
  "google_product_category",
  "item_group_id",
] as const;
export type FeedAttribute = (typeof FEED_ATTRIBUTES)[number];

/** Attributes Merchant Center requires for a valid offer. */
export const REQUIRED_FEED_ATTRIBUTES: readonly FeedAttribute[] = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "price",
  "availability",
];

/** Header aliases (normalized) → canonical attribute. */
const ALIASES: Record<FeedAttribute, readonly string[]> = {
  id: ["id", "offerid", "productid", "itemid", "sku"],
  title: ["title", "name", "productname"],
  description: ["description", "desc", "bodyhtml", "shortdescription"],
  link: ["link", "url", "permalink", "producturl", "productlink"],
  image_link: ["imagelink", "image", "imageurl", "mainimage", "picture", "imagesrc"],
  additional_image_link: ["additionalimagelink", "additionalimages", "extraimages"],
  price: ["price", "regularprice", "amount"],
  sale_price: ["saleprice", "compareatprice", "discountprice"],
  availability: ["availability", "stockstatus", "instock", "stock"],
  gtin: ["gtin", "upc", "ean", "barcode", "globaluniqueid"],
  mpn: ["mpn", "manufacturerpartnumber", "partnumber"],
  brand: ["brand", "vendor", "manufacturer", "make"],
  condition: ["condition", "itemcondition"],
  product_type: ["producttype", "category", "categories", "productcategory"],
  google_product_category: ["googleproductcategory", "gpc", "googlecategory"],
  item_group_id: ["itemgroupid", "groupid", "parentid", "variantgroup"],
};

const normalize = (h: string): string => h.toLowerCase().replace(/[^a-z0-9]/g, "");

/** A mapping from a feed column name to a canonical attribute. */
export type SchemaMapping = Record<string, FeedAttribute>;

/**
 * Infers a column→attribute mapping from the feed headers. The first header that
 * matches an attribute's alias wins that attribute (a header maps to at most one
 * attribute; an attribute is claimed at most once).
 */
export function inferMapping(headers: readonly string[]): SchemaMapping {
  const mapping: SchemaMapping = {};
  const claimed = new Set<FeedAttribute>();
  for (const header of headers) {
    const norm = normalize(header);
    if (norm.length === 0) continue;
    for (const attr of FEED_ATTRIBUTES) {
      if (claimed.has(attr)) continue;
      if (ALIASES[attr].includes(norm)) {
        mapping[header] = attr;
        claimed.add(attr);
        break;
      }
    }
  }
  return mapping;
}

/** Applies a mapping to a parsed record, returning a record keyed by attribute. */
export function applyMapping(
  record: FeedRecord,
  mapping: SchemaMapping,
): Partial<Record<FeedAttribute, string>> {
  const out: Partial<Record<FeedAttribute, string>> = {};
  for (const [column, attribute] of Object.entries(mapping)) {
    const value = record[column];
    if (typeof value === "string" && value.length > 0) out[attribute] = value;
  }
  return out;
}

export interface ImportPreview {
  readonly totalRecords: number;
  readonly mappedColumns: SchemaMapping;
  readonly unmappedColumns: readonly string[];
  /** Which required attributes are covered by the mapping. */
  readonly requiredCoverage: Readonly<Record<string, boolean>>;
  /** True when every required attribute is mapped. */
  readonly ready: boolean;
  readonly sample: readonly Partial<Record<FeedAttribute, string>>[];
}

/**
 * Builds an import preview: the inferred/overridden mapping, unmapped columns,
 * required-attribute coverage, and a normalized sample of the first records.
 */
export function buildImportPreview(
  records: readonly FeedRecord[],
  options: { readonly mapping?: SchemaMapping; readonly sampleSize?: number } = {},
): ImportPreview {
  if (!Array.isArray(records)) {
    throw new DiagnosticsError("records must be an array", "INVALID_INPUT");
  }
  const headers = records.length > 0 ? Object.keys(records[0] ?? {}) : [];
  const mapping = options.mapping ?? inferMapping(headers);
  const mappedCols = new Set(Object.keys(mapping));
  const unmappedColumns = headers.filter((h) => !mappedCols.has(h));
  const mappedAttrs = new Set(Object.values(mapping));
  const requiredCoverage: Record<string, boolean> = {};
  for (const attr of REQUIRED_FEED_ATTRIBUTES) requiredCoverage[attr] = mappedAttrs.has(attr);
  const ready = REQUIRED_FEED_ATTRIBUTES.every((attr) => mappedAttrs.has(attr));
  const sampleSize = Math.min(Math.max(1, options.sampleSize ?? 5), 50);
  const sample = records.slice(0, sampleSize).map((r) => applyMapping(r, mapping));
  return {
    totalRecords: records.length,
    mappedColumns: mapping,
    unmappedColumns,
    requiredCoverage,
    ready,
    sample,
  };
}
