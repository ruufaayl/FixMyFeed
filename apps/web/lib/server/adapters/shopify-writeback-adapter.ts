/**
 * Real Shopify WritebackPort (task T161) — server-only.
 *
 * Implements the repair executor's `WritebackPort` against the live Shopify Admin
 * API (T160 client). Deny-by-default and safe by construction:
 *
 *  - a strict field allow-list maps our repair fields to the T044 supported set;
 *    anything else is refused (`unsupported_field`);
 *  - the live Shopify value is re-read immediately before every mutation, so a
 *    concurrent merchant edit (live value ≠ the plan's baseline `before`) blocks
 *    the write instead of overwriting it (`conflict_stale_baseline`);
 *  - a deleted/missing product is reported, never created (`product_not_found`);
 *  - a server-side safety mode gates which shops are eligible at all.
 *
 * The port returns a per-item result (never throws) so the executor preserves
 * partial success; transport failures are captured as failed items. Retry
 * classification and the destructive-boundary re-checks are layered on in
 * T163/T164.
 */
import type { WritebackInstruction, WritebackPort } from "@fixmyfeed/repairs";
import { shopify, ConnectorError } from "@fixmyfeed/connectors";
import type { WritebackSafetyMode } from "@fixmyfeed/config";

type ShopifyAdminClient = shopify.ShopifyAdminClient;

/** Repair field → supported Shopify field. The safe set (not broadened for count). */
const PRODUCT_FIELD_MAP: Readonly<Record<string, shopify.WritebackProductField>> = {
  title: "title",
  descriptionHtml: "descriptionHtml",
  description: "descriptionHtml",
  productType: "productType",
  vendor: "vendor",
};
const VARIANT_FIELD_MAP: Readonly<Record<string, shopify.WritebackVariantField>> = {
  barcode: "barcode",
  sku: "sku",
  price: "price",
  compareAtPrice: "compareAtPrice",
};

/** The supported writeback field matrix (for reporting / diagnostics). */
export const SHOPIFY_WRITEBACK_FIELD_MATRIX = {
  product: Object.keys(PRODUCT_FIELD_MAP),
  variant: Object.keys(VARIANT_FIELD_MAP),
} as const;

interface ResolvedField {
  readonly scope: "product" | "variant";
  readonly shopifyField: string;
}

function resolveField(instruction: WritebackInstruction): ResolvedField | null {
  if (instruction.variantExternalId !== null) {
    const shopifyField = VARIANT_FIELD_MAP[instruction.field];
    return shopifyField ? { scope: "variant", shopifyField } : null;
  }
  const shopifyField = PRODUCT_FIELD_MAP[instruction.field];
  return shopifyField ? { scope: "product", shopifyField } : null;
}

// ── Safety mode ──────────────────────────────────────────────────────────────

export interface WritebackSafety {
  readonly mode: WritebackSafetyMode;
  readonly allowedShops: readonly string[];
}

export interface WritebackEligibility {
  readonly allowed: boolean;
  readonly reason: string;
}

interface ShopPlanResponse {
  readonly shop?: { readonly plan?: { readonly partnerDevelopment?: boolean } };
}

/** Whether the connected shop is a Shopify partner development store. */
async function isDevelopmentStore(admin: ShopifyAdminClient): Promise<boolean> {
  const data = await admin.graphql<ShopPlanResponse>(
    "query { shop { plan { partnerDevelopment } } }",
  );
  return data.shop?.plan?.partnerDevelopment === true;
}

/**
 * Resolves whether a shop is eligible for destructive writeback under the current
 * safety mode. Fails closed: `disabled` and an empty `allowlisted` list both deny.
 * `production` only widens shop eligibility — capability/consent/approval checks
 * still apply downstream (T163).
 */
export async function resolveWritebackEligibility(
  admin: ShopifyAdminClient,
  shop: string,
  safety: WritebackSafety,
): Promise<WritebackEligibility> {
  const normalizedShop = shopify.normalizeShopDomain(shop);
  switch (safety.mode) {
    case "disabled":
      return { allowed: false, reason: "writeback_disabled" };
    case "production":
      return { allowed: true, reason: "production" };
    case "allowlisted": {
      if (safety.allowedShops.length === 0) {
        return { allowed: false, reason: "allowlist_empty" };
      }
      const allowed = safety.allowedShops
        .map((s) => shopify.normalizeShopDomain(s))
        .includes(normalizedShop);
      return { allowed, reason: allowed ? "allowlisted" : "shop_not_allowlisted" };
    }
    case "dev_store_only": {
      const dev = await isDevelopmentStore(admin);
      return { allowed: dev, reason: dev ? "dev_store" : "not_a_dev_store" };
    }
    default:
      return { allowed: false, reason: "unknown_mode" };
  }
}

// ── WritebackPort ────────────────────────────────────────────────────────────

export interface ShopifyWritebackOptions {
  /** Carried into the mutation as the idempotency + approval reference. */
  readonly executionId: string;
}

interface ProductReadResponse {
  readonly product: Record<string, unknown> | null;
}
interface VariantReadResponse {
  readonly productVariant: Record<string, unknown> | null;
}

const asString = (value: unknown): string | null => (typeof value === "string" ? value : null);

/** Reads the live value of the field being written (for the concurrency check). */
async function readLiveValue(
  admin: ShopifyAdminClient,
  instruction: WritebackInstruction,
  field: ResolvedField,
): Promise<{ found: boolean; value: string | null }> {
  if (field.scope === "variant") {
    const data = await admin.graphql<VariantReadResponse>(
      "query($id: ID!) { productVariant(id: $id) { barcode sku price compareAtPrice } }",
      { id: instruction.variantExternalId },
    );
    if (data.productVariant === null) return { found: false, value: null };
    return { found: true, value: asString(data.productVariant[field.shopifyField]) };
  }
  const data = await admin.graphql<ProductReadResponse>(
    "query($id: ID!) { product(id: $id) { title descriptionHtml productType vendor } }",
    { id: instruction.productExternalId },
  );
  if (data.product === null) return { found: false, value: null };
  return { found: true, value: asString(data.product[field.shopifyField]) };
}

/**
 * Fresh live read of the field's current Shopify value (for T162 verification /
 * T161 conflict checks). Returns null for an unsupported field or a deleted /
 * missing product — either way the value cannot be confirmed.
 */
export async function readShopifyFieldValue(
  admin: ShopifyAdminClient,
  instruction: WritebackInstruction,
): Promise<string | null> {
  const field = resolveField(instruction);
  if (field === null) return null;
  const live = await readLiveValue(admin, instruction, field);
  return live.found ? live.value : null;
}

interface MutationResponse {
  readonly productUpdate?: { readonly userErrors?: readonly shopify.ShopifyUserError[] };
  readonly productVariantsBulkUpdate?: {
    readonly userErrors?: readonly shopify.ShopifyUserError[];
  };
}

/**
 * A `WritebackPort` bound to one authenticated Shopify Admin client. Construct it
 * inside `withShopifyAdminClient` so the token stays scoped to the execution.
 */
export function createShopifyWritebackPort(
  admin: ShopifyAdminClient,
  options: ShopifyWritebackOptions,
): WritebackPort {
  return {
    async apply(instruction) {
      const field = resolveField(instruction);
      if (field === null) return { ok: false, error: "unsupported_field" };

      try {
        // Re-read live state immediately before mutating (concurrency guard).
        const live = await readLiveValue(admin, instruction, field);
        if (!live.found) return { ok: false, error: "product_not_found" };
        if (live.value !== instruction.before) {
          return { ok: false, error: "conflict_stale_baseline" };
        }

        const approval = { approved: true as const, approvalId: options.executionId };
        const idempotencyKey = `${options.executionId}:${instruction.productExternalId}:${instruction.variantExternalId ?? ""}:${instruction.field}`;
        let mutation: string;
        if (field.scope === "variant") {
          mutation = shopify.buildVariantUpdateMutation({
            change: {
              productExternalId: instruction.productExternalId,
              externalId: instruction.variantExternalId as string,
              fields: { [field.shopifyField]: instruction.after },
            },
            baselineFingerprint: "",
            idempotencyKey,
            approval,
          });
        } else {
          mutation = shopify.buildProductUpdateMutation({
            change: {
              externalId: instruction.productExternalId,
              fields: { [field.shopifyField]: instruction.after },
            },
            baselineFingerprint: "",
            idempotencyKey,
            approval,
          });
        }

        const data = await admin.graphql<MutationResponse>(mutation);
        const userErrors =
          data.productUpdate?.userErrors ?? data.productVariantsBulkUpdate?.userErrors ?? [];
        const rejected = shopify.userErrorsToConnectorError(userErrors);
        if (rejected !== null) return { ok: false, error: "rejected" };
        return { ok: true, error: null };
      } catch (error) {
        // Never surface raw Shopify detail; carry the stable category (T164 refines).
        const category = error instanceof ConnectorError ? error.category : "unknown";
        return { ok: false, error: category };
      }
    },
  };
}

/** A port that refuses every write with a stable reason (safety mode / no eligibility). */
export function createRefusingWritebackPort(reason: string): WritebackPort {
  return {
    async apply() {
      return { ok: false, error: reason };
    },
  };
}
