/**
 * Real Shopify ObserveValue / observation adapter (task T162) — server-only.
 *
 * The verification (T095) observe port for the live Shopify path. Every call
 * performs a FRESH Shopify Admin read of the field being verified — mutation
 * success is never treated as verification. A deleted product or an unsupported
 * field returns null, so `verifyExecution` records the item as not-verified rather
 * than assuming it stuck. Bound to one authenticated client (token stays scoped).
 */
import type { shopify } from "@fixmyfeed/connectors";
import type { ObservePort } from "../repair-ops";
import { readShopifyFieldValue } from "./shopify-writeback-adapter";

type ShopifyAdminClient = shopify.ShopifyAdminClient;

/**
 * An `ObservePort` that re-reads each field's current value directly from Shopify.
 * Used by `runRepairVerification` on the live Shopify path.
 */
export function createShopifyObservePort(admin: ShopifyAdminClient): ObservePort {
  return {
    observe: (instruction) => readShopifyFieldValue(admin, instruction),
  };
}
