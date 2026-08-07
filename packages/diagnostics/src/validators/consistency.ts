/**
 * Landing-page and consistency validators (task T084).
 *
 * **Consistency** validators (pure, sync) catch internal contradictions in a
 * `CatalogProduct`: a sale price above its compare-at price, availability that
 * disagrees with inventory, and over-length title/description. **Landing-page**
 * checks (async) compare feed data against the live product page through an
 * injected `LandingPageProbe` port — the package performs no network I/O itself.
 * Consistency validators run via the T080 engine; landing-page checks run through
 * {@link checkLandingPages}.
 */
import type { CatalogProduct } from "@fixmyfeed/domain";
import { issue, productValidator, type Validator, type ValidationIssue } from "../engine.js";
import { isHttpUrl } from "./media.js";

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 5000;

/** Parses a decimal amount; null when absent or malformed. */
function parseAmount(value: string | null): number | null {
  if (value === null || !/^\d+(\.\d+)?$/.test(value.trim())) return null;
  return Number(value);
}

/** Lowest valid variant price for a product, or null. */
function minPrice(product: CatalogProduct): number | null {
  let min: number | null = null;
  for (const variant of product.variants) {
    const amount = parseAmount(variant.price);
    if (amount !== null && (min === null || amount < min)) min = amount;
  }
  return min;
}

// ── Consistency (pure) validators ────────────────────────────────────────────

const compareAtPrice = productValidator(
  "consistency.compare_at_price",
  "Compare-at price is not below the price",
  (product) => {
    const issues: ValidationIssue[] = [];
    for (const variant of product.variants) {
      const price = parseAmount(variant.price);
      const compareAt = parseAmount(variant.compareAtPrice);
      if (price !== null && compareAt !== null && compareAt < price) {
        issues.push(
          issue(
            "invalid_compare_at_price",
            "warning",
            "Compare-at price is below the selling price",
            {
              productExternalId: product.externalId,
              variantExternalId: variant.externalId,
              field: "compareAtPrice",
              evidence: { price: variant.price, compareAtPrice: variant.compareAtPrice },
            },
          ),
        );
      }
    }
    return issues;
  },
);

const availabilityInventory = productValidator(
  "consistency.availability_inventory",
  "Availability agrees with inventory",
  (product) => {
    const issues: ValidationIssue[] = [];
    for (const variant of product.variants) {
      if (variant.inventoryQuantity === null) continue;
      if (variant.availableForSale && variant.inventoryQuantity === 0) {
        issues.push(
          issue(
            "available_without_inventory",
            "warning",
            "Variant is available for sale but has zero inventory",
            {
              productExternalId: product.externalId,
              variantExternalId: variant.externalId,
              field: "availableForSale",
            },
          ),
        );
      } else if (!variant.availableForSale && variant.inventoryQuantity > 0) {
        issues.push(
          issue(
            "unavailable_with_inventory",
            "info",
            "Variant is unavailable but has inventory in stock",
            {
              productExternalId: product.externalId,
              variantExternalId: variant.externalId,
              field: "availableForSale",
            },
          ),
        );
      }
    }
    return issues;
  },
);

const titleLength = productValidator(
  "consistency.title_length",
  "Title is within the length limit",
  (product) =>
    product.title.length > MAX_TITLE_LENGTH
      ? [
          issue("title_too_long", "info", `Title exceeds ${MAX_TITLE_LENGTH} characters`, {
            productExternalId: product.externalId,
            field: "title",
            evidence: { length: product.title.length, limit: MAX_TITLE_LENGTH },
          }),
        ]
      : [],
);

const descriptionLength = productValidator(
  "consistency.description_length",
  "Description is within the length limit",
  (product) =>
    product.description !== null && product.description.length > MAX_DESCRIPTION_LENGTH
      ? [
          issue(
            "description_too_long",
            "info",
            `Description exceeds ${MAX_DESCRIPTION_LENGTH} characters`,
            {
              productExternalId: product.externalId,
              field: "description",
              evidence: { length: product.description.length, limit: MAX_DESCRIPTION_LENGTH },
            },
          ),
        ]
      : [],
);

export const consistencyValidators: readonly Validator[] = [
  compareAtPrice,
  availabilityInventory,
  titleLength,
  descriptionLength,
];

// ── Landing-page (async, injected port) ──────────────────────────────────────

export interface LandingPageFacts {
  /** Availability read from the page, or null if not determinable. */
  readonly available: boolean | null;
  /** Price read from the page (decimal string), or null. */
  readonly price: string | null;
  /** Whether product structured data (schema.org) was present. */
  readonly hasStructuredData: boolean;
}

/**
 * Port that fetches facts from a live landing page. Returns null when the page
 * could not be fetched (reachability is covered by T083). The adapter MUST
 * enforce the SSRF policy before requesting.
 */
export interface LandingPageProbe {
  fetch(url: string): Promise<LandingPageFacts | null>;
}

/**
 * Compares each product against its live landing page via `probe`: emits
 * `landing_page_unavailable` (error) when the page says out-of-stock, a
 * `landing_page_price_mismatch` (warning) when the page price differs from the
 * feed's lowest price, and `missing_structured_data` (info) when the page carries
 * no product structured data. Each landing-page URL is fetched at most once.
 */
export async function checkLandingPages(
  products: readonly CatalogProduct[],
  probe: LandingPageProbe,
): Promise<ValidationIssue[]> {
  const cache = new Map<string, LandingPageFacts | null>();
  const fetchOnce = async (url: string): Promise<LandingPageFacts | null> => {
    if (cache.has(url)) return cache.get(url) ?? null;
    const facts = await probe.fetch(url);
    cache.set(url, facts);
    return facts;
  };

  const issues: ValidationIssue[] = [];
  for (const product of products) {
    if (!isHttpUrl(product.onlineStoreUrl)) continue;
    const facts = await fetchOnce(product.onlineStoreUrl as string);
    if (facts === null) continue;

    if (facts.available === false) {
      issues.push(
        issue(
          "landing_page_unavailable",
          "error",
          "Landing page reports the product out of stock",
          {
            productExternalId: product.externalId,
            field: "onlineStoreUrl",
          },
        ),
      );
    }

    const feedPrice = minPrice(product);
    const pagePrice = parseAmount(facts.price);
    if (feedPrice !== null && pagePrice !== null && feedPrice !== pagePrice) {
      issues.push(
        issue(
          "landing_page_price_mismatch",
          "warning",
          "Landing-page price differs from the feed price",
          {
            productExternalId: product.externalId,
            field: "price",
            evidence: { feedPrice, pagePrice },
          },
        ),
      );
    }

    if (!facts.hasStructuredData) {
      issues.push(
        issue("missing_structured_data", "info", "Landing page has no product structured data", {
          productExternalId: product.externalId,
          field: "onlineStoreUrl",
        }),
      );
    }
  }
  return issues;
}
