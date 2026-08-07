/**
 * WooCommerce reconciliation and hosting-fault handling (task T053).
 *
 * Incremental reconciliation over the shared `NormalizedProduct` shape (T034
 * reconcile), plus classification of the flaky responses self-hosted WordPress
 * stores commonly return (woocommerce-rate-limit-handling.md,
 * wordpress-hosting-constraints.md): an HTML error/maintenance page instead of
 * JSON, 5xx from an overloaded host, a WAF/host challenge, or a timeout — each
 * mapped to a canonical retryable/non-retryable `ConnectorError` so the T033
 * circuit breaker and retry policy behave correctly.
 *
 * Pure and deterministic.
 */
import { createHash } from "node:crypto";
import { ConnectorError, categoryFromHttpStatus } from "../errors.js";
import { reconcile, type ReconciliationResult } from "../reconciliation.js";
import type { NormalizedProduct } from "../shopify/bulk-import.js";

/** Canonicalizes a normalized product's diagnostic fields for stable hashing. */
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
export function wooProductFingerprint(product: NormalizedProduct): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalProduct(product)))
    .digest("hex");
}

/** Reconciles local vs remote WooCommerce products by externalId + fingerprint. */
export function reconcileWooCatalog(
  local: readonly NormalizedProduct[],
  remote: readonly NormalizedProduct[],
): ReconciliationResult<NormalizedProduct, NormalizedProduct> {
  return reconcile(local, remote, {
    keyOfLocal: (p) => p.externalId,
    keyOfRemote: (p) => p.externalId,
    fingerprintOfLocal: wooProductFingerprint,
    fingerprintOfRemote: wooProductFingerprint,
  });
}

/** Monotonic `date_modified` watermark: latest valid ISO among current + candidates. */
export function maxModifiedAt(
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
  return bestMs === Number.NEGATIVE_INFINITY ? null : new Date(bestMs).toISOString();
}

// ---------------------------------------------------------------------------
// Hosting fault handling
// ---------------------------------------------------------------------------

export interface WooResponseInput {
  /** HTTP status, if a response was received. */
  readonly status?: number;
  /** Response Content-Type header. */
  readonly contentType?: string;
  /** A prefix of the response body (enough to detect an HTML page). */
  readonly bodyText?: string;
  /** True when the request failed before any response (timeout/DNS/reset). */
  readonly networkError?: boolean;
}

/** True if a response looks like an HTML page rather than a JSON API result. */
export function looksLikeHtml(
  contentType: string | undefined,
  bodyText: string | undefined,
): boolean {
  if (typeof contentType === "string" && /text\/html|application\/xhtml/i.test(contentType)) {
    return true;
  }
  if (typeof bodyText === "string") {
    const trimmed = bodyText.trimStart().toLowerCase();
    if (trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")) return true;
  }
  return false;
}

/**
 * Classifies a WooCommerce/WordPress response. Returns a canonical
 * `ConnectorError` for a fault, or `null` when the response is a healthy JSON
 * result. A network error is retryable; an HTML page (maintenance/WAF/host
 * error) is treated as a transient upstream fault even on a 2xx status; HTTP
 * statuses map through the shared taxonomy.
 */
export function classifyWooResponse(input: WooResponseInput): ConnectorError | null {
  if (input.networkError) {
    return new ConnectorError("WooCommerce request failed (network)", "network", {
      retryable: true,
    });
  }
  if (typeof input.status === "number" && input.status >= 400) {
    const category = categoryFromHttpStatus(input.status);
    return new ConnectorError(`WooCommerce responded ${input.status}`, category, {
      providerCode: input.status,
    });
  }
  if (looksLikeHtml(input.contentType, input.bodyText)) {
    // A host returning HTML (maintenance page, WAF challenge, PHP fatal wrapped
    // in HTML) is a transient hosting fault, not valid API data.
    return new ConnectorError(
      "WooCommerce returned an HTML page instead of JSON (hosting fault)",
      "upstream",
      { retryable: true, providerCode: input.status },
    );
  }
  return null;
}
