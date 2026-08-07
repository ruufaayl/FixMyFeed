/**
 * Pure adapter mapper tests (task T152).
 */
import { describe, it, expect } from "vitest";
import type { CatalogProduct } from "@fixmyfeed/domain";
import {
  worstOf,
  toCatalogProductDTO,
  toProductInspectorDTO,
  computeHealthScore,
} from "../lib/server/adapters/mappers";

const product = (o: Partial<CatalogProduct> = {}): CatalogProduct =>
  ({
    externalId: "gid://p/1",
    handle: "widget",
    title: "Widget",
    description: null,
    productType: null,
    vendor: null,
    status: "active",
    tags: [],
    onlineStoreUrl: "https://shop/p",
    images: [],
    variants: [
      {
        externalId: "v1",
        sku: "W-1",
        gtin: null,
        title: null,
        price: "9.99",
        compareAtPrice: null,
        availableForSale: true,
        inventoryQuantity: 3,
      },
    ],
    ...o,
  }) as CatalogProduct;

describe("worstOf", () => {
  it("returns the most severe, or null when empty", () => {
    expect(worstOf(["warning", "critical", "info"])).toBe("critical");
    expect(worstOf(["info", "warning"])).toBe("warning");
    expect(worstOf([])).toBeNull();
  });
});

describe("toCatalogProductDTO", () => {
  it("maps identity, price, availability + issue aggregate", () => {
    const dto = toCatalogProductDTO(product(), { count: 2, worstSeverity: "critical" });
    expect(dto).toMatchObject({
      id: "gid://p/1",
      title: "Widget",
      sku: "W-1",
      price: "9.99",
      availability: "in_stock",
      issueCount: 2,
      worstSeverity: "critical",
    });
  });

  it("marks out_of_stock and unknown availability", () => {
    expect(
      toCatalogProductDTO(
        product({
          variants: [
            {
              externalId: "v",
              sku: null,
              gtin: null,
              title: null,
              price: null,
              compareAtPrice: null,
              availableForSale: false,
              inventoryQuantity: 0,
            },
          ],
        }),
        {
          count: 0,
          worstSeverity: null,
        },
      ).availability,
    ).toBe("out_of_stock");
    expect(
      toCatalogProductDTO(product({ variants: [] }), { count: 0, worstSeverity: null })
        .availability,
    ).toBe("unknown");
  });
});

describe("toProductInspectorDTO", () => {
  it("builds a single-source comparison and flags missing GTIN", () => {
    const dto = toProductInspectorDTO(product(), []);
    expect(dto.sources).toEqual(["Catalog"]);
    const gtinRow = dto.comparison.find((r) => r.attribute === "GTIN");
    expect(gtinRow?.mismatch).toBe(true);
    expect(dto.issues).toEqual([]);
  });
});

describe("computeHealthScore", () => {
  it("is the clean-product share, 100 when empty", () => {
    expect(computeHealthScore(0, 0)).toBe(100);
    expect(computeHealthScore(100, 18)).toBe(82);
    expect(computeHealthScore(10, 20)).toBe(0);
  });
});
