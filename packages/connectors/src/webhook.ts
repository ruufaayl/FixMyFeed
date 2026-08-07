/**
 * Inbound webhook receipt verification (task T032).
 *
 * Provider-neutral, pure helpers to authenticate an inbound webhook by HMAC over
 * its raw body and to reject stale (replayed) deliveries by timestamp
 * (webhook-security.md). Signature comparison is constant-time; malformed input
 * yields `false` rather than throwing, because the input is untrusted.
 *
 * Deduplication of verified receipts is handled by the `webhook_receipts` table
 * (packages/database) keyed by (connector, provider delivery id).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { ConnectorError } from "./errors.js";

export const WEBHOOK_SIGNATURE_ENCODINGS = ["base64", "hex"] as const;
export type WebhookSignatureEncoding = (typeof WEBHOOK_SIGNATURE_ENCODINGS)[number];

export interface WebhookSignatureInput {
  /** The exact raw request body as received (bytes or string). */
  readonly payload: string | Buffer;
  readonly secret: string;
  /** HMAC hash algorithm. Default "sha256". */
  readonly algorithm?: string;
  /** How the provider encodes the signature. Default "base64". */
  readonly encoding?: WebhookSignatureEncoding;
}

/** Computes the expected HMAC signature for a webhook body. */
export function computeWebhookSignature(input: WebhookSignatureInput): string {
  if (typeof input.secret !== "string" || input.secret.length === 0) {
    throw new ConnectorError("webhook secret is required", "validation");
  }
  const encoding = input.encoding ?? "base64";
  return createHmac(input.algorithm ?? "sha256", input.secret)
    .update(input.payload)
    .digest(encoding);
}

/** Constant-time comparison of two encoded signatures; false on any length/format mismatch. */
function signaturesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a provided signature against the HMAC of the raw body. Returns a
 * boolean and never throws on a bad/absent signature (untrusted input); it only
 * throws (validation) when the secret itself is missing.
 */
export function verifyWebhookSignature(
  input: WebhookSignatureInput & { signature: unknown },
): boolean {
  if (typeof input.signature !== "string" || input.signature.length === 0) return false;
  const expected = computeWebhookSignature(input);
  return signaturesEqual(input.signature, expected);
}

/**
 * Verifies a webhook, throwing a canonical `ConnectorError` (category
 * `authentication`) when the signature does not match — for call sites that want
 * to reject rather than branch.
 */
export function assertWebhookSignature(
  input: WebhookSignatureInput & { signature: unknown },
): void {
  if (!verifyWebhookSignature(input)) {
    throw new ConnectorError("webhook signature verification failed", "authentication");
  }
}

/** Default replay tolerance: reject signed timestamps older/newer than 5 minutes. */
export const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60_000;

/**
 * True if a signed webhook timestamp is within the replay tolerance of now.
 * Accepts epoch milliseconds, epoch seconds, or an ISO string; anything
 * unparseable is treated as not fresh (reject).
 */
export function isWebhookTimestampFresh(
  timestamp: number | string,
  now: () => Date = () => new Date(),
  toleranceMs: number = WEBHOOK_TIMESTAMP_TOLERANCE_MS,
): boolean {
  let ms: number;
  if (typeof timestamp === "number") {
    // Heuristic: 10-digit values are epoch seconds.
    ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  } else if (typeof timestamp === "string") {
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) return false;
    ms = parsed;
  } else {
    return false;
  }
  return Math.abs(now().getTime() - ms) <= toleranceMs;
}
