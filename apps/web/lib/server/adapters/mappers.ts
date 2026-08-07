/**
 * Pure record → DTO mappers (task T152).
 *
 * The mapping logic behind the Overview and Catalog repository adapters, kept
 * pure so it is unit-testable without a database. The adapters compose these with
 * Drizzle queries (query correctness is verified end-to-end in T159).
 */
import type { CatalogProduct } from "@fixmyfeed/domain";
import type {
  AvailabilityDTO,
  CatalogProductDTO,
  IssueDTO,
  IssueSeverityDTO,
  ProductInspectorDTO,
} from "../dto";

const SEVERITY_RANK: Readonly<Record<IssueSeverityDTO, number>> = {
  critical: 0,
  error: 1,
  warning: 2,
  info: 3,
};

/** The most severe of a set of severities (or null when empty). */
export function worstOf(severities: readonly IssueSeverityDTO[]): IssueSeverityDTO | null {
  let worst: IssueSeverityDTO | null = null;
  for (const s of severities) {
    if (worst === null || SEVERITY_RANK[s] < SEVERITY_RANK[worst]) worst = s;
  }
  return worst;
}

export interface ProductIssueAggregate {
  readonly count: number;
  readonly worstSeverity: IssueSeverityDTO | null;
}

function availabilityOf(product: CatalogProduct): AvailabilityDTO {
  if (product.variants.length === 0) return "unknown";
  return product.variants.some((v) => v.availableForSale) ? "in_stock" : "out_of_stock";
}

function primaryVariant(product: CatalogProduct) {
  return product.variants[0];
}

/** Maps a normalized product + its open-issue aggregate to the catalog row DTO. */
export function toCatalogProductDTO(
  product: CatalogProduct,
  aggregate: ProductIssueAggregate,
): CatalogProductDTO {
  const variant = primaryVariant(product);
  return {
    id: product.externalId,
    title: product.title,
    sku: variant?.sku ?? null,
    price: variant?.price ?? null,
    availability: availabilityOf(product),
    issueCount: aggregate.count,
    worstSeverity: aggregate.worstSeverity,
  };
}

/** Maps a product + its issues to the inspector DTO (single catalog source). */
export function toProductInspectorDTO(
  product: CatalogProduct,
  issues: readonly IssueDTO[],
): ProductInspectorDTO {
  const variant = primaryVariant(product);
  return {
    id: product.externalId,
    title: product.title,
    sources: ["Catalog"],
    comparison: [
      { attribute: "Title", values: { Catalog: product.title }, mismatch: false },
      { attribute: "Price", values: { Catalog: variant?.price ?? null }, mismatch: false },
      {
        attribute: "GTIN",
        values: { Catalog: variant?.gtin ?? null },
        mismatch: (variant?.gtin ?? null) === null,
      },
      {
        attribute: "Availability",
        values: { Catalog: availabilityOf(product) },
        mismatch: false,
      },
    ],
    issues,
  };
}

/**
 * Catalog health score (0–100): the share of products with no open issues,
 * rounded. Derived value — the caller tags it as such.
 */
export function computeHealthScore(totalProducts: number, affectedProducts: number): number {
  if (totalProducts <= 0) return 100;
  const clean = Math.max(0, totalProducts - affectedProducts);
  return Math.round((clean / totalProducts) * 100);
}
