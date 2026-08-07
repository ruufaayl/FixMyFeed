/**
 * Feed upload and remote acquisition (task T070).
 *
 * Pure validation + descriptors for acquiring a product feed, either uploaded or
 * fetched from a remote URL. A remote URL is merchant-supplied and untrusted, so
 * it is strictly validated (HTTPS only, private/internal hosts rejected) as a
 * first-line SSRF guard; the app's fetch layer performs deep SSRF hardening and
 * stores the bytes in the T023 object store (injected). No network here.
 */
import { DiagnosticsError } from "./errors.js";

export const FEED_FORMATS = ["csv", "tsv", "xml", "json"] as const;
export type FeedFormat = (typeof FEED_FORMATS)[number];

export const FEED_SOURCE_KINDS = ["upload", "url"] as const;
export type FeedSourceKind = (typeof FEED_SOURCE_KINDS)[number];

/** Maximum accepted feed size (100 MB) — bounds memory and abuse. */
export const MAX_FEED_BYTES = 100 * 1024 * 1024;

/** Hostnames/IPs that must never be fetched (basic SSRF guard). */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "::1" || h === "0.0.0.0") return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

/**
 * Validates a remote feed URL: HTTPS only, no internal/private host. Returns the
 * normalized URL string. Throws `DiagnosticsError` (INVALID_INPUT) otherwise.
 */
export function validateFeedUrl(input: unknown): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new DiagnosticsError("feed URL is required", "INVALID_INPUT");
  }
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new DiagnosticsError("feed URL is not a valid URL", "INVALID_INPUT");
  }
  if (url.protocol !== "https:") {
    throw new DiagnosticsError("feed URL must use https", "INVALID_INPUT");
  }
  if (url.hostname.length === 0 || isPrivateHost(url.hostname)) {
    throw new DiagnosticsError("feed URL host is not allowed", "INVALID_INPUT");
  }
  return url.toString();
}

/** Infers the feed format from a content type and/or filename; null if unknown. */
export function detectFeedFormat(
  contentType?: string | null,
  filename?: string | null,
): FeedFormat | null {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("json")) return "json";
  if (ct.includes("xml") || ct.includes("rss") || ct.includes("atom")) return "xml";
  if (ct.includes("tab-separated") || ct.includes("tsv")) return "tsv";
  if (ct.includes("csv")) return "csv";
  const ext = (filename ?? "").toLowerCase().split(".").pop() ?? "";
  if ((FEED_FORMATS as readonly string[]).includes(ext)) return ext as FeedFormat;
  if (ext === "txt") return "csv";
  return null;
}

export interface FeedSourceInput {
  readonly kind: FeedSourceKind;
  readonly format?: FeedFormat;
  readonly url?: string;
  readonly filename?: string;
  readonly contentType?: string;
  readonly sizeBytes?: number;
}

export interface FeedSource {
  readonly kind: FeedSourceKind;
  readonly format: FeedFormat;
  readonly url: string | null;
  readonly sizeBytes: number | null;
}

/**
 * Validates a feed source (upload or URL) and resolves its format. Enforces the
 * size cap and, for URL sources, the SSRF-safe URL rules.
 */
export function validateFeedSource(input: FeedSourceInput): FeedSource {
  if (!(FEED_SOURCE_KINDS as readonly string[]).includes(input?.kind)) {
    throw new DiagnosticsError(`unknown feed source kind: ${input?.kind}`, "INVALID_INPUT");
  }
  const format =
    input.format ?? detectFeedFormat(input.contentType, input.filename ?? input.url ?? undefined);
  if (format === null || !(FEED_FORMATS as readonly string[]).includes(format)) {
    throw new DiagnosticsError("could not determine feed format", "INVALID_INPUT");
  }
  if (typeof input.sizeBytes === "number" && input.sizeBytes > MAX_FEED_BYTES) {
    throw new DiagnosticsError(`feed exceeds ${MAX_FEED_BYTES} bytes`, "INVALID_INPUT");
  }
  let url: string | null = null;
  if (input.kind === "url") {
    url = validateFeedUrl(input.url);
  }
  return {
    kind: input.kind,
    format,
    url,
    sizeBytes: typeof input.sizeBytes === "number" ? input.sizeBytes : null,
  };
}
