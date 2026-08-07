/**
 * WooCommerce webhook ingestion (task T052).
 *
 * Pure pipeline to authenticate, identify, deduplicate, and classify an inbound
 * WooCommerce webhook (woocommerce-webhooks.md), on the T032 webhook framework.
 * WooCommerce signs the **raw body** with base64 HMAC-SHA256 using the webhook
 * secret (`X-WC-Webhook-Signature`) and includes a unique
 * `X-WC-Webhook-Delivery-ID` used as the T032 dedup key. No network, no new
 * table (dedup reuses T032 `webhook_receipts`).
 */
import { ConnectorError } from "../errors.js";
import { verifyWebhookSignature } from "../webhook.js";
import { normalizeStoreUrl } from "./auth.js";

/** WooCommerce webhook HTTP header names (lowercase). */
export const WOO_WEBHOOK_HEADERS = {
  topic: "x-wc-webhook-topic",
  signature: "x-wc-webhook-signature",
  source: "x-wc-webhook-source",
  webhookId: "x-wc-webhook-id",
  deliveryId: "x-wc-webhook-delivery-id",
  resource: "x-wc-webhook-resource",
  event: "x-wc-webhook-event",
} as const;

export const WOO_WEBHOOK_TOPICS = [
  "product.created",
  "product.updated",
  "product.deleted",
  "product.restored",
] as const;
export type WooWebhookTopic = (typeof WOO_WEBHOOK_TOPICS)[number];

export const WOO_EVENT_KINDS = ["product.upserted", "product.deleted", "unknown"] as const;
export type WooEventKind = (typeof WOO_EVENT_KINDS)[number];

/** Maps a WooCommerce topic to a normalized event kind. */
export function classifyWooTopic(topic: string): WooEventKind {
  switch (topic) {
    case "product.created":
    case "product.updated":
    case "product.restored":
      return "product.upserted";
    case "product.deleted":
      return "product.deleted";
    default:
      return "unknown";
  }
}

function lowerHeaders(
  headers: Readonly<Record<string, string | undefined>>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers)) out[key.toLowerCase()] = value;
  return out;
}

/**
 * Verifies the WooCommerce webhook signature (base64 HMAC-SHA256 of the raw body
 * with the webhook secret), constant-time. Returns false on a bad/absent
 * signature; throws only when the secret is missing.
 */
export function verifyWooWebhook(
  rawBody: string | Buffer,
  headers: Readonly<Record<string, string | undefined>>,
  webhookSecret: string,
): boolean {
  const signature = lowerHeaders(headers)[WOO_WEBHOOK_HEADERS.signature];
  return verifyWebhookSignature({
    payload: rawBody,
    signature,
    secret: webhookSecret,
    algorithm: "sha256",
    encoding: "base64",
  });
}

export interface WooWebhookEnvelope {
  readonly topic: string;
  readonly eventKind: WooEventKind;
  readonly storeUrl: string;
  /** X-WC-Webhook-Delivery-ID — the deduplication key. */
  readonly deliveryId: string;
  readonly webhookId: string | undefined;
  readonly resource: string | undefined;
}

/**
 * Parses and validates the WooCommerce webhook headers into a normalized
 * envelope. Throws `ConnectorError` (validation) when the topic, delivery id, or
 * source store URL is missing/invalid.
 */
export function parseWooWebhookHeaders(
  headers: Readonly<Record<string, string | undefined>>,
): WooWebhookEnvelope {
  const h = lowerHeaders(headers);
  const topic = h[WOO_WEBHOOK_HEADERS.topic];
  if (typeof topic !== "string" || topic.length === 0) {
    throw new ConnectorError("missing X-WC-Webhook-Topic header", "validation");
  }
  const deliveryId = h[WOO_WEBHOOK_HEADERS.deliveryId];
  if (typeof deliveryId !== "string" || deliveryId.length === 0) {
    throw new ConnectorError("missing X-WC-Webhook-Delivery-ID header", "validation");
  }
  const storeUrl = normalizeStoreUrl(h[WOO_WEBHOOK_HEADERS.source]);
  return {
    topic,
    eventKind: classifyWooTopic(topic),
    storeUrl,
    deliveryId,
    webhookId: h[WOO_WEBHOOK_HEADERS.webhookId],
    resource: h[WOO_WEBHOOK_HEADERS.resource],
  };
}
