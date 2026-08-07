/**
 * Structural and required-attribute validators (task T081).
 *
 * The first concrete validator families for the E08 engine, operating on the
 * canonical `CatalogProduct`. **Required-attribute** validators flag missing feed
 * essentials (title, description, link, image, price). **Structural** validators
 * flag internal-integrity problems (no variants, duplicate variant ids, malformed
 * price, negative inventory). All pure; registered/executed via the T080 engine.
 */
import { issue, productValidator, type Validator, type ValidationIssue } from "../engine.js";

const isBlank = (value: string | null | undefined): boolean =>
  value === null || value === undefined || value.trim() === "";

/** A valid non-negative decimal price string, e.g. "9.99" or "0" or "12". */
const PRICE_RE = /^\d+(\.\d+)?$/;
const isValidPrice = (value: string | null | undefined): boolean =>
  typeof value === "string" && PRICE_RE.test(value.trim());

// ── Required-attribute validators ────────────────────────────────────────────

const requiredTitle = productValidator("required.title", "Product title present", (product) =>
  isBlank(product.title)
    ? [
        issue("missing_title", "critical", "Product has no title", {
          productExternalId: product.externalId,
          field: "title",
        }),
      ]
    : [],
);

const requiredDescription = productValidator(
  "required.description",
  "Product description present",
  (product) =>
    isBlank(product.description)
      ? [
          issue("missing_description", "warning", "Product has no description", {
            productExternalId: product.externalId,
            field: "description",
          }),
        ]
      : [],
);

const requiredLink = productValidator(
  "required.link",
  "Product landing-page link present",
  (product) =>
    isBlank(product.onlineStoreUrl)
      ? [
          issue("missing_link", "critical", "Product has no landing-page URL", {
            productExternalId: product.externalId,
            field: "onlineStoreUrl",
          }),
        ]
      : [],
);

const requiredImage = productValidator("required.image", "Product image present", (product) =>
  product.images.length === 0
    ? [
        issue("missing_image", "critical", "Product has no image", {
          productExternalId: product.externalId,
          field: "images",
        }),
      ]
    : [],
);

const requiredPrice = productValidator("required.price", "Product price present", (product) => {
  const hasPrice = product.variants.some((variant) => isValidPrice(variant.price));
  return hasPrice
    ? []
    : [
        issue("missing_price", "critical", "No variant has a valid price", {
          productExternalId: product.externalId,
          field: "price",
        }),
      ];
});

export const requiredAttributeValidators: readonly Validator[] = [
  requiredTitle,
  requiredDescription,
  requiredLink,
  requiredImage,
  requiredPrice,
];

// ── Structural validators ────────────────────────────────────────────────────

const structuralNoVariants = productValidator(
  "structural.no_variants",
  "Product has at least one variant",
  (product) =>
    product.variants.length === 0
      ? [
          issue("no_variants", "error", "Product has no variants", {
            productExternalId: product.externalId,
            field: "variants",
          }),
        ]
      : [],
);

const structuralDuplicateVariantIds = productValidator(
  "structural.duplicate_variant_ids",
  "Variant ids are unique within a product",
  (product) => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const variant of product.variants) {
      if (seen.has(variant.externalId)) duplicates.add(variant.externalId);
      seen.add(variant.externalId);
    }
    return [...duplicates].map((variantExternalId) =>
      issue("duplicate_variant_id", "error", "Duplicate variant id within product", {
        productExternalId: product.externalId,
        variantExternalId,
        field: "variants",
      }),
    );
  },
);

const structuralPriceFormat = productValidator(
  "structural.invalid_price_format",
  "Variant prices are well-formed",
  (product) => {
    const issues: ValidationIssue[] = [];
    for (const variant of product.variants) {
      if (variant.price !== null && !isValidPrice(variant.price)) {
        issues.push(
          issue("invalid_price_format", "error", "Variant price is not a valid amount", {
            productExternalId: product.externalId,
            variantExternalId: variant.externalId,
            field: "price",
            evidence: { price: variant.price },
          }),
        );
      }
    }
    return issues;
  },
);

const structuralNegativeInventory = productValidator(
  "structural.negative_inventory",
  "Variant inventory is non-negative",
  (product) => {
    const issues: ValidationIssue[] = [];
    for (const variant of product.variants) {
      if (variant.inventoryQuantity !== null && variant.inventoryQuantity < 0) {
        issues.push(
          issue("negative_inventory", "warning", "Variant has negative inventory", {
            productExternalId: product.externalId,
            variantExternalId: variant.externalId,
            field: "inventoryQuantity",
            evidence: { inventoryQuantity: variant.inventoryQuantity },
          }),
        );
      }
    }
    return issues;
  },
);

export const structuralValidators: readonly Validator[] = [
  structuralNoVariants,
  structuralDuplicateVariantIds,
  structuralPriceFormat,
  structuralNegativeInventory,
];

/** Shared helpers reused by later validator families. */
export const validatorHelpers = { isBlank, isValidPrice } as const;
