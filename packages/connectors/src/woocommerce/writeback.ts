/**
 * WooCommerce controlled writeback (task T054).
 *
 * Deny-by-default, consent-gated writeback (woocommerce-writeback.md,
 * woocommerce-writeback-conflicts.md), mirroring the Shopify safety model:
 * only an allow-list of feed-relevant fields may be written; a plan is refused
 * without explicit approval (repair consent is never inferred); and a conflict
 * is detected by comparing the baseline fingerprint the fix was computed against
 * with the current remote product. Builds a REST `PUT` request for an
 * authorized, validated, conflict-free plan (the worker adds the auth header and
 * performs the call idempotently). No network here.
 */
import { ConnectorError } from "../errors.js";
import { buildWooApiUrl } from "./auth.js";
import { wooProductFingerprint } from "./reconciliation.js";
import type { NormalizedProduct } from "../shopify/bulk-import.js";

/** Product fields that may be written back. Deny-by-default: nothing else. */
export const WOO_WRITEBACK_ALLOWED_FIELDS = [
  "name",
  "description",
  "sku",
  "regular_price",
  "global_unique_id",
] as const;
export type WooWritebackField = (typeof WOO_WRITEBACK_ALLOWED_FIELDS)[number];

export interface WooWritebackInput {
  /** WooCommerce numeric product id. */
  readonly productId: string | number;
  readonly fields: Partial<Record<WooWritebackField, string>>;
}

/** Validates a WooCommerce writeback: id present and only allow-listed, non-empty fields. */
export function validateWooWriteback(input: WooWritebackInput): WooWritebackInput {
  if (
    input?.productId === undefined ||
    input.productId === null ||
    String(input.productId).length === 0
  ) {
    throw new ConnectorError("productId is required", "validation");
  }
  const keys = Object.keys(input.fields ?? {});
  if (keys.length === 0) {
    throw new ConnectorError("writeback has no fields", "validation");
  }
  for (const key of keys) {
    if (!(WOO_WRITEBACK_ALLOWED_FIELDS as readonly string[]).includes(key)) {
      throw new ConnectorError(`field "${key}" is not writable`, "validation");
    }
  }
  return input;
}

export interface WooWritebackApproval {
  readonly approved: boolean;
  readonly approvalId?: string;
  readonly approvedBy?: string;
}

export interface WooWritebackPlan {
  readonly change: WooWritebackInput;
  readonly baselineFingerprint: string;
  readonly idempotencyKey: string;
  readonly approval: WooWritebackApproval;
}

/** Enforces explicit repair consent: requires approved + approvalId + idempotencyKey. */
export function assertWooWritebackAuthorized(plan: WooWritebackPlan): void {
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

/** True if the current remote product diverges from the plan's baseline fingerprint. */
export function detectWooWritebackConflict(
  baselineFingerprint: string,
  currentRemote: NormalizedProduct,
): boolean {
  return wooProductFingerprint(currentRemote) !== baselineFingerprint;
}

/** Throws a canonical `conflict` when the baseline no longer matches the current product. */
export function assertNoWooWritebackConflict(
  baselineFingerprint: string,
  currentRemote: NormalizedProduct,
): void {
  if (detectWooWritebackConflict(baselineFingerprint, currentRemote)) {
    throw new ConnectorError(
      "product changed since the fix was computed (writeback conflict)",
      "conflict",
      { retryable: false },
    );
  }
}

/**
 * Builds the REST `PUT /products/{id}` request for an **authorized, validated**
 * plan. Callers must also run `assertNoWooWritebackConflict` against a fresh
 * fetch first. The worker adds the `Authorization` header from the vault.
 */
export function buildWooProductUpdateRequest(
  storeUrl: string,
  plan: WooWritebackPlan,
): {
  readonly url: string;
  readonly method: "PUT";
  readonly body: Readonly<Record<string, string>>;
} {
  assertWooWritebackAuthorized(plan);
  const change = validateWooWriteback(plan.change);
  return {
    url: buildWooApiUrl(storeUrl, `products/${change.productId}`),
    method: "PUT",
    body: { ...change.fields },
  };
}
