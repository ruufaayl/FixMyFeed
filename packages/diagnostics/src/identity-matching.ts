/**
 * Product identity and variant matching (task T074).
 *
 * Deterministic matching of products and variants across two sets — two
 * snapshots of the same catalog, or a source catalog vs the Google-received
 * view — by their strongest available identity: GTIN, then SKU, then the source
 * external id (product-identity-and-variant-matching specs). Pure; used by
 * reconciliation (T076) and cross-source diagnostics.
 */
import type { CatalogProduct, CatalogVariant } from "@fixmyfeed/domain";

/** Normalizes a GTIN to digits; returns null unless it is a valid 8/12/13/14-digit code. */
export function normalizeGtin(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return [8, 12, 13, 14].includes(digits.length) ? digits : null;
}

/** Normalizes a SKU (trim + lowercase); null when empty. */
export function normalizeSku(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  return s.length > 0 ? s : null;
}

/** The identity keys a variant contributes (gtin/sku), strongest first. */
export function variantIdentityKeys(variant: CatalogVariant): string[] {
  const keys: string[] = [];
  const gtin = normalizeGtin(variant.gtin);
  if (gtin) keys.push(`gtin:${gtin}`);
  const sku = normalizeSku(variant.sku);
  if (sku) keys.push(`sku:${sku}`);
  return keys;
}

/** All identity keys for a product (its variants' gtin/sku plus its external id). */
export function productIdentityKeys(product: CatalogProduct): string[] {
  const keys = new Set<string>();
  for (const v of product.variants) for (const k of variantIdentityKeys(v)) keys.add(k);
  keys.add(`id:${product.externalId}`);
  return [...keys];
}

export interface ProductMatch {
  readonly local: CatalogProduct;
  readonly remote: CatalogProduct;
  /** The identity key type the match was made on. */
  readonly on: "gtin" | "sku" | "id";
}

export interface ProductMatchResult {
  readonly matched: readonly ProductMatch[];
  readonly onlyLocal: readonly CatalogProduct[];
  readonly onlyRemote: readonly CatalogProduct[];
}

const keyRank = (key: string): number =>
  key.startsWith("gtin:") ? 0 : key.startsWith("sku:") ? 1 : 2;
const keyType = (key: string): "gtin" | "sku" | "id" =>
  key.startsWith("gtin:") ? "gtin" : key.startsWith("sku:") ? "sku" : "id";

/**
 * Matches `local` products to `remote` products by strongest shared identity.
 * Each remote product is matched at most once. Returns matched pairs and the
 * products unique to each side.
 */
export function matchProducts(
  local: readonly CatalogProduct[],
  remote: readonly CatalogProduct[],
): ProductMatchResult {
  // Index remote products by each of their identity keys.
  const remoteByKey = new Map<string, CatalogProduct>();
  for (const r of remote) {
    for (const key of productIdentityKeys(r)) {
      if (!remoteByKey.has(key)) remoteByKey.set(key, r);
    }
  }

  const matched: ProductMatch[] = [];
  const usedRemote = new Set<CatalogProduct>();
  const unmatchedLocal: CatalogProduct[] = [];

  for (const l of local) {
    // Try the local product's keys in strength order.
    const keys = productIdentityKeys(l).sort((a, b) => keyRank(a) - keyRank(b));
    let found: { remote: CatalogProduct; on: "gtin" | "sku" | "id" } | null = null;
    for (const key of keys) {
      const candidate = remoteByKey.get(key);
      if (candidate && !usedRemote.has(candidate)) {
        found = { remote: candidate, on: keyType(key) };
        break;
      }
    }
    if (found) {
      matched.push({ local: l, remote: found.remote, on: found.on });
      usedRemote.add(found.remote);
    } else {
      unmatchedLocal.push(l);
    }
  }

  const onlyRemote = remote.filter((r) => !usedRemote.has(r));
  return { matched, onlyLocal: unmatchedLocal, onlyRemote };
}

export interface VariantMatch {
  readonly local: CatalogVariant;
  readonly remote: CatalogVariant;
  readonly on: "gtin" | "sku";
}

/** Matches variants between two products by GTIN then SKU. */
export function matchVariants(
  local: CatalogProduct,
  remote: CatalogProduct,
): {
  readonly matched: readonly VariantMatch[];
  readonly onlyLocal: readonly CatalogVariant[];
  readonly onlyRemote: readonly CatalogVariant[];
} {
  const remoteByGtin = new Map<string, CatalogVariant>();
  const remoteBySku = new Map<string, CatalogVariant>();
  for (const v of remote.variants) {
    const g = normalizeGtin(v.gtin);
    if (g && !remoteByGtin.has(g)) remoteByGtin.set(g, v);
    const s = normalizeSku(v.sku);
    if (s && !remoteBySku.has(s)) remoteBySku.set(s, v);
  }
  const matched: VariantMatch[] = [];
  const used = new Set<CatalogVariant>();
  const onlyLocal: CatalogVariant[] = [];
  for (const v of local.variants) {
    const g = normalizeGtin(v.gtin);
    const s = normalizeSku(v.sku);
    const byGtin = g ? remoteByGtin.get(g) : undefined;
    const bySku = s ? remoteBySku.get(s) : undefined;
    if (byGtin && !used.has(byGtin)) {
      matched.push({ local: v, remote: byGtin, on: "gtin" });
      used.add(byGtin);
    } else if (bySku && !used.has(bySku)) {
      matched.push({ local: v, remote: bySku, on: "sku" });
      used.add(bySku);
    } else {
      onlyLocal.push(v);
    }
  }
  const onlyRemote = remote.variants.filter((v) => !used.has(v));
  return { matched, onlyLocal, onlyRemote };
}
