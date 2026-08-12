/**
 * Paginated catalog import driver (server-only).
 *
 * Walks a connector's cursor-paginated product list, upserting each page as it
 * arrives, until there are no more pages or a safety cap is reached. Pure over
 * injected `fetchPage` / `upsertPage` functions so the pagination logic is
 * unit-testable; the concrete Shopify fetch (with throttle-aware retry) and the
 * catalog upsert are wired by the caller.
 */
import type { CatalogProduct } from "@fixmyfeed/domain";

export interface ProductPage {
  readonly products: readonly CatalogProduct[];
  readonly hasNextPage: boolean;
  readonly endCursor: string | null;
}

export interface ImportResult {
  readonly productCount: number;
  readonly pages: number;
  /** True when the safety cap stopped the walk before the catalog was exhausted. */
  readonly truncated: boolean;
}

export interface PaginateImportOptions {
  /** Hard cap on pages walked (safety bound against a runaway catalog). */
  readonly maxPages?: number;
}

const DEFAULT_MAX_PAGES = 500;

/**
 * Imports every page of a connector's catalog. Upserts each non-empty page before
 * fetching the next, so a large catalog streams in bounded memory. Stops at the
 * last page, when a page yields no cursor, or at `maxPages` (reported as
 * `truncated`).
 */
export async function paginateImport(
  fetchPage: (after: string | null) => Promise<ProductPage>,
  upsertPage: (products: readonly CatalogProduct[]) => Promise<void>,
  options: PaginateImportOptions = {},
): Promise<ImportResult> {
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_MAX_PAGES);
  let cursor: string | null = null;
  let productCount = 0;
  let pages = 0;

  for (;;) {
    const page = await fetchPage(cursor);
    if (page.products.length > 0) {
      await upsertPage(page.products);
      productCount += page.products.length;
    }
    pages += 1;

    if (!page.hasNextPage) return { productCount, pages, truncated: false };
    if (pages >= maxPages) return { productCount, pages, truncated: true };
    if (page.endCursor === null) return { productCount, pages, truncated: false };
    cursor = page.endCursor;
  }
}
