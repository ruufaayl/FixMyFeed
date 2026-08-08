/**
 * Real Shopify WritebackPort + safety-mode tests (task T161).
 *
 * Uses a fake Admin client that routes by query text (no network). Covers the
 * safety modes (incl. empty allowlist fail-closed + normalized domains) and the
 * per-item writeback outcomes: unsupported field, deleted product, stale-baseline
 * conflict, success, rejection, and a token failure.
 */
import { describe, it, expect } from "vitest";
import { ConnectorError } from "@fixmyfeed/connectors";
import {
  createShopifyWritebackPort,
  resolveWritebackEligibility,
} from "../lib/server/adapters/shopify-writeback-adapter";

const PRODUCT_GID = "gid://shopify/Product/123";
const VARIANT_GID = "gid://shopify/ProductVariant/456";

/** Fake Admin client: routes canned responses by query text. */
function fakeAdmin(handlers: {
  partnerDevelopment?: boolean;
  product?: Record<string, unknown> | null;
  productVariant?: Record<string, unknown> | null;
  mutationUserErrors?: { message: string }[];
  throwOn?: (query: string) => ConnectorError | null;
}) {
  const calls: string[] = [];
  return {
    calls,
    shop: "demo.myshopify.com",
    async graphql(query: string) {
      calls.push(query);
      const thrown = handlers.throwOn?.(query);
      if (thrown) throw thrown;
      if (query.includes("partnerDevelopment")) {
        return { shop: { plan: { partnerDevelopment: handlers.partnerDevelopment ?? false } } };
      }
      if (query.includes("productVariant(id:"))
        return { productVariant: handlers.productVariant ?? null };
      if (query.includes("product(id:")) return { product: handlers.product ?? null };
      if (query.includes("productVariantsBulkUpdate(")) {
        return { productVariantsBulkUpdate: { userErrors: handlers.mutationUserErrors ?? [] } };
      }
      if (query.includes("productUpdate(")) {
        return { productUpdate: { userErrors: handlers.mutationUserErrors ?? [] } };
      }
      return {};
    },
  };
}

const instruction = (over: Record<string, unknown> = {}) => ({
  productExternalId: PRODUCT_GID,
  variantExternalId: null,
  field: "title",
  before: "Old title",
  after: "New title",
  ...over,
});

describe("resolveWritebackEligibility", () => {
  const safety = (mode: string, allowedShops: string[] = []) => ({ mode, allowedShops }) as never;

  it("disabled denies", async () => {
    const r = await resolveWritebackEligibility(
      fakeAdmin({}) as never,
      "demo.myshopify.com",
      safety("disabled"),
    );
    expect(r).toEqual({ allowed: false, reason: "writeback_disabled" });
  });

  it("production allows any shop", async () => {
    const r = await resolveWritebackEligibility(
      fakeAdmin({}) as never,
      "demo.myshopify.com",
      safety("production"),
    );
    expect(r.allowed).toBe(true);
  });

  it("allowlisted fails closed on an empty list", async () => {
    const r = await resolveWritebackEligibility(
      fakeAdmin({}) as never,
      "demo.myshopify.com",
      safety("allowlisted", []),
    );
    expect(r).toEqual({ allowed: false, reason: "allowlist_empty" });
  });

  it("allowlisted matches after domain normalization", async () => {
    const r = await resolveWritebackEligibility(
      fakeAdmin({}) as never,
      "https://Demo.myshopify.com/",
      safety("allowlisted", ["demo.myshopify.com"]),
    );
    expect(r.allowed).toBe(true);
  });

  it("allowlisted denies a shop not on the list", async () => {
    const r = await resolveWritebackEligibility(
      fakeAdmin({}) as never,
      "other.myshopify.com",
      safety("allowlisted", ["demo.myshopify.com"]),
    );
    expect(r).toEqual({ allowed: false, reason: "shop_not_allowlisted" });
  });

  it("dev_store_only allows only a partner development store", async () => {
    const dev = await resolveWritebackEligibility(
      fakeAdmin({ partnerDevelopment: true }) as never,
      "demo.myshopify.com",
      safety("dev_store_only"),
    );
    expect(dev.allowed).toBe(true);
    const prod = await resolveWritebackEligibility(
      fakeAdmin({ partnerDevelopment: false }) as never,
      "demo.myshopify.com",
      safety("dev_store_only"),
    );
    expect(prod).toEqual({ allowed: false, reason: "not_a_dev_store" });
  });
});

describe("createShopifyWritebackPort", () => {
  const opts = { executionId: "exec-1" };

  it("refuses an unsupported field without touching Shopify", async () => {
    const admin = fakeAdmin({});
    const port = createShopifyWritebackPort(admin as never, opts);
    const result = await port.apply(instruction({ field: "images" }) as never);
    expect(result).toEqual({ ok: false, error: "unsupported_field" });
    expect(admin.calls).toHaveLength(0);
  });

  it("reports a deleted product", async () => {
    const admin = fakeAdmin({ product: null });
    const port = createShopifyWritebackPort(admin as never, opts);
    const result = await port.apply(instruction() as never);
    expect(result).toEqual({ ok: false, error: "product_not_found" });
  });

  it("blocks a stale baseline (concurrent edit) instead of overwriting", async () => {
    const admin = fakeAdmin({ product: { title: "Merchant changed it" } });
    const port = createShopifyWritebackPort(admin as never, opts);
    const result = await port.apply(instruction() as never);
    expect(result).toEqual({ ok: false, error: "conflict_stale_baseline" });
    // Only the live read ran — no mutation.
    expect(admin.calls.some((q) => q.includes("productUpdate("))).toBe(false);
  });

  it("applies a product field when the live value matches the baseline", async () => {
    const admin = fakeAdmin({ product: { title: "Old title" } });
    const port = createShopifyWritebackPort(admin as never, opts);
    const result = await port.apply(instruction() as never);
    expect(result).toEqual({ ok: true, error: null });
    expect(admin.calls.some((q) => q.includes("productUpdate("))).toBe(true);
  });

  it("applies a variant field via the bulk update mutation", async () => {
    const admin = fakeAdmin({ productVariant: { price: "9.99" } });
    const port = createShopifyWritebackPort(admin as never, opts);
    const result = await port.apply(
      instruction({
        variantExternalId: VARIANT_GID,
        field: "price",
        before: "9.99",
        after: "12.00",
      }) as never,
    );
    expect(result).toEqual({ ok: true, error: null });
    expect(admin.calls.some((q) => q.includes("productVariantsBulkUpdate("))).toBe(true);
  });

  it("reports a Shopify userErrors rejection", async () => {
    const admin = fakeAdmin({
      product: { title: "Old title" },
      mutationUserErrors: [{ message: "bad" }],
    });
    const port = createShopifyWritebackPort(admin as never, opts);
    const result = await port.apply(instruction() as never);
    expect(result).toEqual({ ok: false, error: "rejected" });
  });

  it("captures a token failure as a stable category (no throw)", async () => {
    const admin = fakeAdmin({
      throwOn: () => new ConnectorError("unauthorized", "authentication"),
    });
    const port = createShopifyWritebackPort(admin as never, opts);
    const result = await port.apply(instruction() as never);
    expect(result).toEqual({ ok: false, error: "authentication" });
  });
});
