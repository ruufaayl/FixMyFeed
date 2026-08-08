/**
 * Real Shopify ObserveValue tests (task T162).
 *
 * Verifies the observe port performs a FRESH Shopify read each call, returns the
 * live field value, and returns null for a deleted product or an unsupported
 * field (so verification records not-verified rather than assuming success).
 */
import { describe, it, expect } from "vitest";
import { createShopifyObservePort } from "../lib/server/adapters/shopify-observe-adapter";

const PRODUCT_GID = "gid://shopify/Product/1";
const VARIANT_GID = "gid://shopify/ProductVariant/2";

function fakeAdmin(handlers: {
  product?: Record<string, unknown> | null;
  productVariant?: Record<string, unknown> | null;
}) {
  const calls: string[] = [];
  return {
    calls,
    shop: "demo.myshopify.com",
    async graphql(query: string) {
      calls.push(query);
      if (query.includes("productVariant(id:"))
        return { productVariant: handlers.productVariant ?? null };
      if (query.includes("product(id:")) return { product: handlers.product ?? null };
      return {};
    },
  };
}

const instruction = (over: Record<string, unknown> = {}) => ({
  productExternalId: PRODUCT_GID,
  variantExternalId: null,
  field: "title",
  before: "Old",
  after: "New",
  ...over,
});

describe("createShopifyObservePort", () => {
  it("returns the live product field value from a fresh read", async () => {
    const admin = fakeAdmin({ product: { title: "New" } });
    const port = createShopifyObservePort(admin as never);
    const value = await port.observe(instruction() as never);
    expect(value).toBe("New");
    expect(admin.calls.some((q) => q.includes("product(id:"))).toBe(true);
  });

  it("reads a variant field fresh", async () => {
    const admin = fakeAdmin({ productVariant: { price: "12.00" } });
    const port = createShopifyObservePort(admin as never);
    const value = await port.observe(
      instruction({ variantExternalId: VARIANT_GID, field: "price" }) as never,
    );
    expect(value).toBe("12.00");
  });

  it("returns null for a deleted product (cannot be verified)", async () => {
    const admin = fakeAdmin({ product: null });
    const port = createShopifyObservePort(admin as never);
    expect(await port.observe(instruction() as never)).toBeNull();
  });

  it("returns null for an unsupported field", async () => {
    const admin = fakeAdmin({ product: { title: "New" } });
    const port = createShopifyObservePort(admin as never);
    expect(await port.observe(instruction({ field: "images" }) as never)).toBeNull();
  });

  it("re-reads on every call (no caching of a prior write)", async () => {
    const admin = fakeAdmin({ product: { title: "New" } });
    const port = createShopifyObservePort(admin as never);
    await port.observe(instruction() as never);
    await port.observe(instruction() as never);
    expect(admin.calls.filter((q) => q.includes("product(id:")).length).toBe(2);
  });
});
