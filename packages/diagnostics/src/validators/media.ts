/**
 * Image and URL acquisition validators (task T083).
 *
 * Two layers. **Structural** validators (pure, sync) check that image and
 * landing-page URLs are absolute HTTPS URLs and flag insecure/missing-alt cases.
 * **Acquisition** checks (async) probe reachability and content-type through an
 * injected `UrlProbe` port — the package performs no network I/O itself, so the
 * caller supplies an adapter that enforces the SSRF policy (see T070
 * `validateFeedUrl`). Structural validators run via the T080 engine; acquisition
 * runs through {@link checkUrlAcquisition}.
 */
import type { CatalogProduct } from "@fixmyfeed/domain";
import { issue, productValidator, type Validator, type ValidationIssue } from "../engine.js";

/** Parses a URL; returns it only if it is an absolute http(s) URL. */
function parseHttpUrl(value: string | null | undefined): URL | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Whether a value is an absolute http(s) URL. */
export function isHttpUrl(value: string | null | undefined): boolean {
  return parseHttpUrl(value) !== null;
}

// ── Structural (pure) validators ─────────────────────────────────────────────

const imageUrlFormat = productValidator(
  "image.url_format",
  "Image URLs are absolute HTTP(S) URLs",
  (product) => {
    const issues: ValidationIssue[] = [];
    for (const image of product.images) {
      const url = parseHttpUrl(image.url);
      if (url === null) {
        issues.push(
          issue("invalid_image_url", "error", "Image URL is not a valid absolute HTTP(S) URL", {
            productExternalId: product.externalId,
            field: "images",
            evidence: { url: image.url },
          }),
        );
      } else if (url.protocol === "http:") {
        issues.push(
          issue("insecure_image_url", "warning", "Image URL uses insecure HTTP", {
            productExternalId: product.externalId,
            field: "images",
            evidence: { url: image.url },
          }),
        );
      }
    }
    return issues;
  },
);

const imageMissingAlt = productValidator("image.missing_alt", "Images have alt text", (product) => {
  const issues: ValidationIssue[] = [];
  for (const image of product.images) {
    if (image.altText === null || image.altText.trim() === "") {
      issues.push(
        issue("missing_image_alt", "info", "Image has no alt text", {
          productExternalId: product.externalId,
          field: "images",
          evidence: { url: image.url },
        }),
      );
    }
  }
  return issues;
});

const linkUrlFormat = productValidator(
  "link.url_format",
  "Landing-page link is an absolute HTTP(S) URL",
  (product) => {
    if (product.onlineStoreUrl === null) return [];
    const url = parseHttpUrl(product.onlineStoreUrl);
    if (url === null) {
      return [
        issue("invalid_link_url", "error", "Landing-page URL is not a valid absolute HTTP(S) URL", {
          productExternalId: product.externalId,
          field: "onlineStoreUrl",
          evidence: { url: product.onlineStoreUrl },
        }),
      ];
    }
    if (url.protocol === "http:") {
      return [
        issue("insecure_link_url", "warning", "Landing-page URL uses insecure HTTP", {
          productExternalId: product.externalId,
          field: "onlineStoreUrl",
          evidence: { url: product.onlineStoreUrl },
        }),
      ];
    }
    return [];
  },
);

export const mediaValidators: readonly Validator[] = [
  imageUrlFormat,
  imageMissingAlt,
  linkUrlFormat,
];

// ── Acquisition (async, injected port) ───────────────────────────────────────

export interface UrlProbeResult {
  /** True when the URL resolved to a success (2xx-ish) response. */
  readonly ok: boolean;
  readonly status: number | null;
  /** Response content type, lower-cased, or null. */
  readonly contentType: string | null;
}

/**
 * Port that probes a URL's reachability. The adapter MUST enforce the SSRF policy
 * (HTTPS-only, no private hosts) before making a request.
 */
export interface UrlProbe {
  probe(url: string): Promise<UrlProbeResult>;
}

/**
 * Probes every structurally-valid image and landing-page URL via `probe`,
 * emitting acquisition issues: `image_unreachable` / `link_unreachable` when a
 * URL does not resolve, and `image_bad_content_type` when an image URL resolves
 * to a non-image response. Each distinct URL is probed at most once. Issues are
 * returned in product order.
 */
export async function checkUrlAcquisition(
  products: readonly CatalogProduct[],
  probe: UrlProbe,
): Promise<ValidationIssue[]> {
  const cache = new Map<string, UrlProbeResult>();
  const probeOnce = async (url: string): Promise<UrlProbeResult> => {
    const cached = cache.get(url);
    if (cached) return cached;
    const result = await probe.probe(url);
    cache.set(url, result);
    return result;
  };

  const issues: ValidationIssue[] = [];
  for (const product of products) {
    for (const image of product.images) {
      if (!isHttpUrl(image.url)) continue;
      const result = await probeOnce(image.url);
      if (!result.ok) {
        issues.push(
          issue("image_unreachable", "error", "Image URL did not resolve", {
            productExternalId: product.externalId,
            field: "images",
            evidence: { url: image.url, status: result.status },
          }),
        );
      } else if (result.contentType !== null && !result.contentType.startsWith("image/")) {
        issues.push(
          issue("image_bad_content_type", "error", "Image URL is not an image response", {
            productExternalId: product.externalId,
            field: "images",
            evidence: { url: image.url, contentType: result.contentType },
          }),
        );
      }
    }
    if (isHttpUrl(product.onlineStoreUrl)) {
      const result = await probeOnce(product.onlineStoreUrl as string);
      if (!result.ok) {
        issues.push(
          issue("link_unreachable", "error", "Landing-page URL did not resolve", {
            productExternalId: product.externalId,
            field: "onlineStoreUrl",
            evidence: { url: product.onlineStoreUrl, status: result.status },
          }),
        );
      }
    }
  }
  return issues;
}
