/**
 * Paginated catalog import tests.
 */
import { describe, it, expect, vi } from "vitest";
import type { CatalogProduct } from "@fixmyfeed/domain";
import { paginateImport, type ProductPage } from "../lib/server/catalog-import";

const product = (id: string): CatalogProduct => ({
  externalId: id,
  handle: id,
  title: id,
  description: null,
  productType: null,
  vendor: null,
  status: "active",
  tags: [],
  onlineStoreUrl: null,
  images: [],
  variants: [],
});

/** A fake connector that returns `pages` in order, keyed by cursor. */
function pagedSource(pages: ProductPage[]) {
  const seen: (string | null)[] = [];
  let i = 0;
  const fetchPage = async (after: string | null): Promise<ProductPage> => {
    seen.push(after);
    return pages[Math.min(i++, pages.length - 1)]!;
  };
  return { fetchPage, seen };
}

describe("paginateImport", () => {
  it("walks every page and aggregates the product count", async () => {
    const { fetchPage, seen } = pagedSource([
      { products: [product("a"), product("b")], hasNextPage: true, endCursor: "c1" },
      { products: [product("c")], hasNextPage: true, endCursor: "c2" },
      { products: [product("d")], hasNextPage: false, endCursor: null },
    ]);
    const upsert = vi.fn(async () => {});
    const result = await paginateImport(fetchPage, upsert);
    expect(result).toEqual({ productCount: 4, pages: 3, truncated: false });
    expect(upsert).toHaveBeenCalledTimes(3);
    expect(seen).toEqual([null, "c1", "c2"]); // cursors threaded in order
  });

  it("handles a single page", async () => {
    const { fetchPage } = pagedSource([
      { products: [product("a")], hasNextPage: false, endCursor: null },
    ]);
    const result = await paginateImport(fetchPage, async () => {});
    expect(result).toEqual({ productCount: 1, pages: 1, truncated: false });
  });

  it("handles an empty catalog without upserting", async () => {
    const { fetchPage } = pagedSource([{ products: [], hasNextPage: false, endCursor: null }]);
    const upsert = vi.fn(async () => {});
    const result = await paginateImport(fetchPage, upsert);
    expect(result).toEqual({ productCount: 0, pages: 1, truncated: false });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("stops at the safety cap and reports truncation", async () => {
    const { fetchPage } = pagedSource([
      { products: [product("a")], hasNextPage: true, endCursor: "next" },
    ]);
    const result = await paginateImport(fetchPage, async () => {}, { maxPages: 3 });
    expect(result).toEqual({ productCount: 3, pages: 3, truncated: true });
  });

  it("stops if a page has more pages but yields no cursor", async () => {
    const { fetchPage } = pagedSource([
      { products: [product("a")], hasNextPage: true, endCursor: null },
    ]);
    const result = await paginateImport(fetchPage, async () => {});
    expect(result).toEqual({ productCount: 1, pages: 1, truncated: false });
  });
});
