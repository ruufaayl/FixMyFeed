/**
 * Shopify webhook ingestion (task T042).
 *
 * Pure pipeline for authenticating, identifying, and normalizing an inbound
 * Shopify webhook (shopify-webhooks.md), built on the T032 webhook framework:
 *
 * - `verifyShopifyWebhook` — HMAC-SHA256 (base64) of the **raw body** with the
 *   app client secret, constant-time (T032 `verifyWebhookSignature`). This is the
 *   body HMAC, distinct from the OAuth query-string HMAC (T040).
 * - `parseShopifyWebhookHeaders` — extracts the topic, shop domain (validated),
 *   the `X-Shopify-Webhook-Id` (the dedup key for T032 `webhook_receipts`), API
 *   version, and trigger time.
 * - `classifyShopifyTopic` — maps a Shopify topic to a normalized event kind.
 * - `mapShopifyRestProduct` — normalizes a Shopify REST product webhook payload
 *   into the same `NormalizedProduct` shape as the bulk import (T041), using gid
 *   identifiers so both sources reconcile.
 *
 * No network and no persistence: the app captures the raw body/headers, and
 * dedup/storage go through the T032 `webhook_receipts` table.
 */
import { ConnectorError } from "../errors.js";
import { verifyWebhookSignature } from "../webhook.js";
import { normalizeShopDomain } from "./oauth.js";
import type {
  NormalizedProduct,
  NormalizedProductStatus,
  NormalizedVariant,
  NormalizedImage,
} from "./bulk-import.js";

/** Shopify webhook HTTP header names (lowercase). */
export const SHOPIFY_WEBHOOK_HEADERS = {
  topic: "x-shopify-topic",
  hmac: "x-shopify-hmac-sha256",
  shopDomain: "x-shopify-shop-domain",
  webhookId: "x-shopify-webhook-id",
  apiVersion: "x-shopify-api-version",
  triggeredAt: "x-shopify-triggered-at",
} as const;

/** Topics this connector subscribes to. */
export const SHOPIFY_WEBHOOK_TOPICS = [
  "products/create",
  "products/update",
  "products/delete",
  "app/uninstalled",
] as const;
export type ShopifyWebhookTopic = (typeof SHOPIFY_WEBHOOK_TOPICS)[number];

/** Normalized event kinds the rest of the system reasons about. */
export const SHOPIFY_EVENT_KINDS = [
  "product.upserted",
  "product.deleted",
  "app.uninstalled",
  "unknown",
] as const;
export type ShopifyEventKind = (typeof SHOPIFY_EVENT_KINDS)[number];

/** Maps a Shopify topic to a normalized event kind. */
export function classifyShopifyTopic(topic: string): ShopifyEventKind {
  switch (topic) {
    case "products/create":
    case "products/update":
      return "product.upserted";
    case "products/delete":
      return "product.deleted";
    case "app/uninstalled":
      return "app.uninstalled";
    default:
      return "unknown";
  }
}

/** Lower-cases header keys so lookups are case-insensitive (HTTP headers are). */
function lowerHeaders(
  headers: Readonly<Record<string, string | undefined>>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers)) out[key.toLowerCase()] = value;
  return out;
}

/**
 * Verifies a Shopify webhook body HMAC. Returns a boolean and never throws on a
 * bad/absent signature; throws (validation) only when the secret is missing.
 */
export function verifyShopifyWebhook(
  rawBody: string | Buffer,
  headers: Readonly<Record<string, string | undefined>>,
  clientSecret: string,
): boolean {
  const signature = lowerHeaders(headers)[SHOPIFY_WEBHOOK_HEADERS.hmac];
  return verifyWebhookSignature({
    payload: rawBody,
    signature,
    secret: clientSecret,
    algorithm: "sha256",
    encoding: "base64",
  });
}

export interface ShopifyWebhookEnvelope {
  readonly topic: string;
  readonly eventKind: ShopifyEventKind;
  readonly shopDomain: string;
  /** X-Shopify-Webhook-Id — the deduplication key. */
  readonly webhookId: string;
  readonly apiVersion: string | undefined;
  readonly triggeredAt: string | undefined;
}

/**
 * Parses and validates the Shopify webhook headers into a normalized envelope.
 * Throws `ConnectorError` (validation) when the topic, shop domain, or webhook
 * id is missing/invalid.
 */
export function parseShopifyWebhookHeaders(
  headers: Readonly<Record<string, string | undefined>>,
): ShopifyWebhookEnvelope {
  const h = lowerHeaders(headers);
  const topic = h[SHOPIFY_WEBHOOK_HEADERS.topic];
  if (typeof topic !== "string" || topic.length === 0) {
    throw new ConnectorError("missing X-Shopify-Topic header", "validation");
  }
  const webhookId = h[SHOPIFY_WEBHOOK_HEADERS.webhookId];
  if (typeof webhookId !== "string" || webhookId.length === 0) {
    throw new ConnectorError("missing X-Shopify-Webhook-Id header", "validation");
  }
  const shopDomain = normalizeShopDomain(h[SHOPIFY_WEBHOOK_HEADERS.shopDomain]);
  return {
    topic,
    eventKind: classifyShopifyTopic(topic),
    shopDomain,
    webhookId,
    apiVersion: h[SHOPIFY_WEBHOOK_HEADERS.apiVersion],
    triggeredAt: h[SHOPIFY_WEBHOOK_HEADERS.triggeredAt],
  };
}

// ---------------------------------------------------------------------------
// REST product payload mapping (webhook payloads are REST-shaped, not GraphQL)
// ---------------------------------------------------------------------------

interface RestVariant {
  readonly id?: string | number;
  readonly sku?: string | null;
  readonly barcode?: string | null;
  readonly title?: string | null;
  readonly price?: string | number | null;
  readonly compare_at_price?: string | number | null;
  readonly inventory_quantity?: number | null;
}
interface RestImage {
  readonly id?: string | number;
  readonly src?: string;
  readonly alt?: string | null;
}
export interface RestShopifyProduct {
  readonly id?: string | number;
  readonly handle?: string | null;
  readonly title?: string;
  readonly body_html?: string | null;
  readonly product_type?: string | null;
  readonly vendor?: string | null;
  readonly status?: string;
  readonly tags?: string | null;
  readonly variants?: readonly RestVariant[];
  readonly images?: readonly RestImage[];
}

const str = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

function mapStatus(raw: unknown): NormalizedProductStatus {
  const value = typeof raw === "string" ? raw.toUpperCase() : "";
  if (value === "ARCHIVED") return "archived";
  if (value === "DRAFT") return "draft";
  return "active";
}

/**
 * Normalizes a Shopify REST product webhook payload into a `NormalizedProduct`,
 * mapping numeric REST ids to gid form so it reconciles with the bulk import
 * (T041). Tags are a comma-separated string in REST.
 */
export function mapShopifyRestProduct(raw: RestShopifyProduct): NormalizedProduct {
  if (raw?.id === undefined || raw.id === null || String(raw.id).length === 0) {
    throw new ConnectorError("Shopify product is missing an id", "validation");
  }
  if (typeof raw.title !== "string" || raw.title.length === 0) {
    throw new ConnectorError("Shopify product is missing a title", "validation");
  }
  const images: NormalizedImage[] = (raw.images ?? [])
    .filter((img) => typeof img.src === "string")
    .map((img) => ({
      externalId: `gid://shopify/ProductImage/${img.id}`,
      url: img.src as string,
      altText: str(img.alt),
    }));
  const variants: NormalizedVariant[] = (raw.variants ?? []).map((v) => ({
    externalId: `gid://shopify/ProductVariant/${v.id}`,
    sku: str(v.sku),
    barcode: str(v.barcode),
    title: str(v.title),
    price: v.price === undefined || v.price === null ? null : String(v.price),
    compareAtPrice:
      v.compare_at_price === undefined || v.compare_at_price === null
        ? null
        : String(v.compare_at_price),
    availableForSale: typeof v.inventory_quantity === "number" && v.inventory_quantity > 0,
    inventoryQuantity: typeof v.inventory_quantity === "number" ? v.inventory_quantity : null,
  }));
  return {
    externalId: `gid://shopify/Product/${raw.id}`,
    handle: str(raw.handle),
    title: raw.title,
    description: str(raw.body_html),
    productType: str(raw.product_type),
    vendor: str(raw.vendor),
    status: mapStatus(raw.status),
    tags:
      typeof raw.tags === "string" && raw.tags.length > 0
        ? raw.tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : [],
    onlineStoreUrl: null,
    images,
    variants,
  };
}
