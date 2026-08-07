/**
 * Product identity and variant validators (task T082).
 *
 * Identity-quality checks over the canonical `CatalogProduct`: GTIN format +
 * check-digit validity, variants lacking any stable identifier, and catalog-wide
 * duplicate SKUs / GTINs (the same code reused across different products — a
 * common cause of merged or rejected listings). Per-product checks use the T080
 * `productValidator` helper; duplicate detection is a catalog-scoped validator.
 */
import { issue, type Validator, type ValidationIssue, productValidator } from "../engine.js";
import { normalizeGtin, normalizeSku } from "../identity-matching.js";

/** Validates a GTIN's mod-10 check digit (assumes digits-only, valid length). */
export function isValidGtinChecksum(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length < 8) return false;
  const body = digits.slice(0, -1);
  const check = Number(digits.slice(-1));
  let sum = 0;
  let weight = 3;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === check;
}

// ── Per-product identity validators ──────────────────────────────────────────

const gtinFormat = productValidator("identity.gtin_format", "GTINs are well-formed", (product) => {
  const issues: ValidationIssue[] = [];
  for (const variant of product.variants) {
    if (variant.gtin === null) continue;
    const normalized = normalizeGtin(variant.gtin);
    if (normalized === null || !isValidGtinChecksum(normalized)) {
      issues.push(
        issue("invalid_gtin", "error", "GTIN is not a valid 8/12/13/14-digit code", {
          productExternalId: product.externalId,
          variantExternalId: variant.externalId,
          field: "gtin",
          evidence: { gtin: variant.gtin },
        }),
      );
    }
  }
  return issues;
});

const missingIdentifier = productValidator(
  "identity.missing_identifier",
  "Variants carry a GTIN or SKU",
  (product) => {
    const issues: ValidationIssue[] = [];
    for (const variant of product.variants) {
      if (normalizeGtin(variant.gtin) === null && normalizeSku(variant.sku) === null) {
        issues.push(
          issue("missing_identifier", "warning", "Variant has neither GTIN nor SKU", {
            productExternalId: product.externalId,
            variantExternalId: variant.externalId,
            field: "gtin",
          }),
        );
      }
    }
    return issues;
  },
);

// ── Catalog-scoped duplicate detection ───────────────────────────────────────

/** Groups an identifier → the distinct products carrying it (via a keyed picker). */
function duplicateValidator(
  id: string,
  title: string,
  code: string,
  field: "sku" | "gtin",
  pick: (value: string | null) => string | null,
): Validator {
  return {
    id,
    title,
    run(context) {
      const owners = new Map<string, Set<string>>();
      for (const product of context.products) {
        for (const variant of product.variants) {
          const key = pick(variant[field]);
          if (key === null) continue;
          if (!owners.has(key)) owners.set(key, new Set());
          owners.get(key)!.add(product.externalId);
        }
      }
      const issues: ValidationIssue[] = [];
      for (const [key, products] of owners) {
        if (products.size > 1) {
          issues.push(
            issue(code, "error", `Duplicate ${field} shared across ${products.size} products`, {
              field,
              evidence: { [field]: key, productCount: products.size },
            }),
          );
        }
      }
      return issues;
    },
  };
}

const duplicateSku = duplicateValidator(
  "identity.duplicate_sku",
  "SKUs are unique across the catalog",
  "duplicate_sku",
  "sku",
  normalizeSku,
);

const duplicateGtin = duplicateValidator(
  "identity.duplicate_gtin",
  "GTINs are unique across the catalog",
  "duplicate_gtin",
  "gtin",
  normalizeGtin,
);

export const identityValidators: readonly Validator[] = [
  gtinFormat,
  missingIdentifier,
  duplicateSku,
  duplicateGtin,
];
