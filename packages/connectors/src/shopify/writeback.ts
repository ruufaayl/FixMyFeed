/**
 * Shopify controlled writeback (task T044).
 *
 * Applying a repair back to a merchant's store is the highest-risk connector
 * action, so this module is deny-by-default and consent-gated
 * (shopify-writeback.md, shopify-writeback-conflicts.md):
 *
 * - only an **allow-list** of feed-relevant fields may be written; any other
 *   field is rejected;
 * - a writeback plan is refused unless it carries an explicit **approval** (we
 *   never infer repair consent);
 * - a **conflict** is detected by comparing the baseline fingerprint the fix was
 *   computed against with the current remote product — a changed product aborts
 *   the write rather than clobbering newer merchant edits;
 * - mutations are only built for a validated, authorized, conflict-free plan.
 *
 * Pure and deterministic; the worker performs the GraphQL call (idempotently)
 * and records the audited change-set. No network here.
 */
import { ConnectorError } from "../errors.js";
import { shopifyProductFingerprint } from "./reconciliation.js";
import type { NormalizedProduct } from "./bulk-import.js";

/** Product fields that may be written back. Deny-by-default: nothing else. */
export const WRITEBACK_ALLOWED_PRODUCT_FIELDS = [
  "title",
  "descriptionHtml",
  "productType",
  "vendor",
  "tags",
] as const;
export type WritebackProductField = (typeof WRITEBACK_ALLOWED_PRODUCT_FIELDS)[number];

/** Variant fields that may be written back (GTIN/identifier/price fixes). */
export const WRITEBACK_ALLOWED_VARIANT_FIELDS = [
  "barcode",
  "sku",
  "price",
  "compareAtPrice",
] as const;
export type WritebackVariantField = (typeof WRITEBACK_ALLOWED_VARIANT_FIELDS)[number];

const PRODUCT_GID = /^gid:\/\/shopify\/Product\/.+/;
const VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/.+/;

export interface ProductWritebackInput {
  readonly externalId: string;
  readonly fields: Partial<Record<WritebackProductField, string | readonly string[]>>;
}

export interface VariantWritebackInput {
  readonly productExternalId: string;
  readonly externalId: string;
  readonly fields: Partial<Record<WritebackVariantField, string>>;
}

function assertAllowed(
  fields: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    throw new ConnectorError(`${label} writeback has no fields`, "validation");
  }
  for (const key of keys) {
    if (!allowed.includes(key)) {
      throw new ConnectorError(`field "${key}" is not writable`, "validation");
    }
  }
}

/** Validates a product writeback: valid gid and only allow-listed, non-empty fields. */
export function validateProductWriteback(input: ProductWritebackInput): ProductWritebackInput {
  if (typeof input?.externalId !== "string" || !PRODUCT_GID.test(input.externalId)) {
    throw new ConnectorError("productExternalId must be a Shopify product gid", "validation");
  }
  assertAllowed(input.fields ?? {}, WRITEBACK_ALLOWED_PRODUCT_FIELDS, "product");
  return input;
}

/** Validates a variant writeback: valid gids and only allow-listed, non-empty fields. */
export function validateVariantWriteback(input: VariantWritebackInput): VariantWritebackInput {
  if (typeof input?.productExternalId !== "string" || !PRODUCT_GID.test(input.productExternalId)) {
    throw new ConnectorError("productExternalId must be a Shopify product gid", "validation");
  }
  if (typeof input?.externalId !== "string" || !VARIANT_GID.test(input.externalId)) {
    throw new ConnectorError("variant externalId must be a Shopify variant gid", "validation");
  }
  assertAllowed(input.fields ?? {}, WRITEBACK_ALLOWED_VARIANT_FIELDS, "variant");
  return input;
}

/** Explicit repair approval — required for every writeback (never inferred). */
export interface WritebackApproval {
  readonly approved: boolean;
  readonly approvalId?: string;
  readonly approvedBy?: string;
}

/** A validated writeback plus the baseline it was computed against and its approval. */
export interface WritebackPlan<T> {
  readonly change: T;
  /** Fingerprint of the product when the fix was computed (conflict baseline). */
  readonly baselineFingerprint: string;
  /** Idempotency key so a retried apply is safe. */
  readonly idempotencyKey: string;
  readonly approval: WritebackApproval;
}

/**
 * Enforces explicit repair consent: throws NOT-authorized unless the plan
 * carries `approved: true` and an `approvalId`. We never infer consent.
 */
export function assertWritebackAuthorized(plan: WritebackPlan<unknown>): void {
  if (
    !plan?.approval?.approved ||
    typeof plan.approval.approvalId !== "string" ||
    plan.approval.approvalId.length === 0
  ) {
    throw new ConnectorError("writeback requires an explicit approval", "authorization");
  }
  if (typeof plan.idempotencyKey !== "string" || plan.idempotencyKey.length === 0) {
    throw new ConnectorError("writeback requires an idempotency key", "validation");
  }
}

/**
 * Detects a conflict: recomputes the current remote product's fingerprint and
 * compares it to the plan's baseline. A mismatch means the merchant changed the
 * product since the fix was computed — the caller must NOT overwrite.
 */
export function detectWritebackConflict(
  baselineFingerprint: string,
  currentRemote: NormalizedProduct,
): boolean {
  return shopifyProductFingerprint(currentRemote) !== baselineFingerprint;
}

/** Throws a canonical `conflict` error when the baseline no longer matches. */
export function assertNoWritebackConflict(
  baselineFingerprint: string,
  currentRemote: NormalizedProduct,
): void {
  if (detectWritebackConflict(baselineFingerprint, currentRemote)) {
    throw new ConnectorError(
      "product changed since the fix was computed (writeback conflict)",
      "conflict",
      { retryable: false },
    );
  }
}

/** Serializes an allow-listed field map into a GraphQL input body. */
function toGraphqlInput(fields: Record<string, string | readonly string[]>): string {
  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(", ");
}

/**
 * Builds the `productUpdate` mutation for an **authorized, validated,
 * conflict-checked** plan. Callers must have run `validateProductWriteback`,
 * `assertWritebackAuthorized`, and `assertNoWritebackConflict` first.
 */
export function buildProductUpdateMutation(plan: WritebackPlan<ProductWritebackInput>): string {
  assertWritebackAuthorized(plan);
  const change = validateProductWriteback(plan.change);
  const input = toGraphqlInput({ id: change.externalId, ...change.fields });
  return `mutation {
  productUpdate(input: { ${input} }) {
    product { id updatedAt }
    userErrors { field message }
  }
}`;
}

/** Builds the `productVariantsBulkUpdate` mutation for a single validated variant change. */
export function buildVariantUpdateMutation(plan: WritebackPlan<VariantWritebackInput>): string {
  assertWritebackAuthorized(plan);
  const change = validateVariantWriteback(plan.change);
  const variantInput = toGraphqlInput({ id: change.externalId, ...change.fields });
  return `mutation {
  productVariantsBulkUpdate(productId: ${JSON.stringify(change.productExternalId)}, variants: [{ ${variantInput} }]) {
    productVariants { id }
    userErrors { field message }
  }
}`;
}

/** A Shopify `userErrors` entry. */
export interface ShopifyUserError {
  readonly field?: readonly string[] | null;
  readonly message: string;
}

/**
 * Maps Shopify `userErrors` from a mutation response to a canonical
 * `ConnectorError` (validation), or returns null when there were none.
 */
export function userErrorsToConnectorError(
  errors: readonly ShopifyUserError[] | undefined | null,
): ConnectorError | null {
  if (!errors || errors.length === 0) return null;
  const message = errors.map((e) => `${(e.field ?? []).join(".")}: ${e.message}`).join("; ");
  return new ConnectorError(`Shopify writeback rejected: ${message}`, "validation");
}
