/**
 * Google Merchant aggregate status and product data ingestion (task T062).
 *
 * Beyond per-product issues (T061), the Merchant API reports account-level
 * aggregate product status per destination/country — how many products are
 * active, pending, disapproved, or expiring, plus the item-issue counts driving
 * disapprovals (aggregate-product-status-integration.md). It also exposes the
 * product view (the data Google received). This module builds the requests and
 * normalizes both. Pure; the worker performs HTTP paging.
 */
import { ConnectorError } from "../errors.js";
import { GOOGLE_MERCHANT_API_BASE } from "./oauth.js";

export interface AggregateIssue {
  readonly code: string;
  readonly servability: string;
  readonly attributeName: string | null;
  readonly count: number;
}

export interface NormalizedAggregateStatus {
  readonly destination: string;
  readonly country: string | null;
  readonly active: number;
  readonly pending: number;
  readonly disapproved: number;
  readonly expiring: number;
  readonly issues: readonly AggregateIssue[];
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

/** Builds the Merchant API request for account-level aggregate product statuses. */
export function buildAggregateStatusRequest(
  accountId: string,
  pageToken?: string,
): { readonly url: string; readonly method: "GET" } {
  if (typeof accountId !== "string" || accountId.length === 0) {
    throw new ConnectorError("accountId is required", "validation");
  }
  const url = new URL(
    `${GOOGLE_MERCHANT_API_BASE}/products/v1beta/accounts/${accountId}/aggregateProductStatuses`,
  );
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  return { url: url.toString(), method: "GET" };
}

interface RawItemIssue {
  readonly code?: string;
  readonly servability?: string;
  readonly attribute?: string;
  readonly count?: number | string;
}
interface RawAggregate {
  readonly reportingContext?: string;
  readonly country?: string;
  readonly stats?: {
    readonly activeCount?: number | string;
    readonly pendingCount?: number | string;
    readonly disapprovedCount?: number | string;
    readonly expiringCount?: number | string;
  };
  readonly itemLevelIssues?: readonly RawItemIssue[];
}

const asInt = (v: unknown): number => {
  if (typeof v === "number") return num(v);
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
};

/** Parses an aggregate-product-status response into per-destination/country rows. */
export function parseAggregateStatuses(raw: {
  readonly aggregateProductStatuses?: readonly RawAggregate[];
}): NormalizedAggregateStatus[] {
  const list = Array.isArray(raw?.aggregateProductStatuses) ? raw.aggregateProductStatuses : [];
  return list.map((a) => ({
    destination: str(a.reportingContext) ?? "unknown",
    country: str(a.country),
    active: asInt(a.stats?.activeCount),
    pending: asInt(a.stats?.pendingCount),
    disapproved: asInt(a.stats?.disapprovedCount),
    expiring: asInt(a.stats?.expiringCount),
    issues: (a.itemLevelIssues ?? []).map((i: RawItemIssue) => ({
      code: str(i.code) ?? "unknown",
      servability: str(i.servability) ?? "unaffected",
      attributeName: str(i.attribute),
      count: asInt(i.count),
    })),
  }));
}

// ---------------------------------------------------------------------------
// Product data (the view Google received)
// ---------------------------------------------------------------------------

export interface NormalizedGoogleProduct {
  readonly offerId: string;
  readonly title: string | null;
  readonly gtin: string | null;
  readonly price: string | null;
  readonly availability: string | null;
  readonly link: string | null;
  readonly imageLink: string | null;
}

interface RawGoogleProduct {
  readonly offerId?: string;
  readonly name?: string;
  readonly attributes?: {
    readonly title?: string;
    readonly gtin?: string;
    readonly price?: { readonly amountMicros?: string | number; readonly currencyCode?: string };
    readonly availability?: string;
    readonly link?: string;
    readonly imageLink?: string;
  };
}

/** Builds the Merchant API request to list product views (submitted product data). */
export function buildProductsRequest(
  accountId: string,
  options: { readonly pageToken?: string; readonly pageSize?: number } = {},
): { readonly url: string; readonly method: "GET" } {
  if (typeof accountId !== "string" || accountId.length === 0) {
    throw new ConnectorError("accountId is required", "validation");
  }
  const url = new URL(`${GOOGLE_MERCHANT_API_BASE}/products/v1beta/accounts/${accountId}/products`);
  if (options.pageSize) url.searchParams.set("pageSize", String(Math.min(1000, options.pageSize)));
  if (options.pageToken) url.searchParams.set("pageToken", options.pageToken);
  return { url: url.toString(), method: "GET" };
}

/** Normalizes a Merchant API product into the fields relevant to feed diagnostics. */
export function mapGoogleProduct(raw: RawGoogleProduct): NormalizedGoogleProduct {
  const offerId = str(raw?.offerId) ?? str(raw?.name);
  if (offerId === null) {
    throw new ConnectorError("Google product is missing an offerId", "validation");
  }
  const attrs = raw.attributes ?? {};
  const price =
    attrs.price?.amountMicros !== undefined && attrs.price?.currencyCode
      ? `${(asInt(attrs.price.amountMicros) / 1_000_000).toFixed(2)} ${attrs.price.currencyCode}`
      : null;
  return {
    offerId,
    title: str(attrs.title),
    gtin: str(attrs.gtin),
    price,
    availability: str(attrs.availability),
    link: str(attrs.link),
    imageLink: str(attrs.imageLink),
  };
}
