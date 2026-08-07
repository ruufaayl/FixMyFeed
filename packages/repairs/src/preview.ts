/**
 * Change-set preview and conflict detection (task T092).
 *
 * Given a repair plan (T091) and the current catalog, produces a reviewable
 * preview classifying each change as `ready`, `noop` (already the proposed
 * value), `needs_input`, or `conflict`. Conflicts guard against clobbering
 * concurrent merchant edits: a change is a conflict when the field's live value
 * no longer matches what the plan recorded, or when an optional baseline
 * fingerprint shows the product changed since the plan was generated. Pure.
 */
import type { CatalogProduct, CatalogVariant } from "@fixmyfeed/domain";
import { catalogProductFingerprint } from "@fixmyfeed/database";
import type { RepairChange, RepairPlan } from "./plan.js";

export const PREVIEW_STATUSES = ["ready", "noop", "needs_input", "conflict"] as const;
export type PreviewStatus = (typeof PREVIEW_STATUSES)[number];

export interface PreviewEntry {
  readonly change: RepairChange;
  readonly status: PreviewStatus;
  /** The field's live value at preview time (as a string), or null. */
  readonly liveValue: string | null;
  /** Machine-readable reason when status is `conflict`. */
  readonly conflictReason: "concurrent_edit" | "product_changed" | "missing_product" | null;
}

export interface ChangeSetPreview {
  readonly entries: readonly PreviewEntry[];
  readonly hasConflicts: boolean;
  readonly summary: Readonly<Record<PreviewStatus, number>>;
}

const asString = (value: unknown): string | null => (typeof value === "string" ? value : null);

/** Reads the change's target field from the live product/variant. */
function liveFieldValue(product: CatalogProduct, change: RepairChange): string | null {
  if (change.field === "images") {
    // Image issues are keyed by a specific URL captured in currentValue.
    if (change.currentValue && product.images.some((image) => image.url === change.currentValue)) {
      return change.currentValue;
    }
    return null;
  }
  if (change.variantExternalId !== null) {
    const variant = product.variants.find((v) => v.externalId === change.variantExternalId);
    if (!variant) return null;
    return asString(variant[change.field as keyof CatalogVariant]);
  }
  return asString(product[change.field as keyof CatalogProduct]);
}

export interface ChangeSetPreviewInput {
  readonly plan: RepairPlan;
  readonly products: readonly CatalogProduct[];
  /**
   * Optional `productExternalId → fingerprint` captured when the plan was built;
   * a product whose current fingerprint differs is treated as changed-under-us.
   */
  readonly baselineFingerprints?: ReadonlyMap<string, string>;
}

/** Builds a reviewable, conflict-annotated preview of a repair plan. */
export function buildChangeSetPreview(input: ChangeSetPreviewInput): ChangeSetPreview {
  const byExternalId = new Map(input.products.map((product) => [product.externalId, product]));
  const fingerprintCache = new Map<string, string>();
  const currentFingerprint = (product: CatalogProduct): string => {
    const cached = fingerprintCache.get(product.externalId);
    if (cached) return cached;
    const fp = catalogProductFingerprint(product);
    fingerprintCache.set(product.externalId, fp);
    return fp;
  };

  const entries: PreviewEntry[] = input.plan.changes.map((change) => {
    const product = byExternalId.get(change.productExternalId);
    if (!product) {
      return { change, status: "conflict", liveValue: null, conflictReason: "missing_product" };
    }

    const baseline = input.baselineFingerprints?.get(change.productExternalId);
    if (baseline !== undefined && baseline !== currentFingerprint(product)) {
      return { change, status: "conflict", liveValue: null, conflictReason: "product_changed" };
    }

    if (change.requiresInput) {
      return { change, status: "needs_input", liveValue: null, conflictReason: null };
    }

    const liveValue = liveFieldValue(product, change);
    if (liveValue !== change.currentValue) {
      return { change, status: "conflict", liveValue, conflictReason: "concurrent_edit" };
    }
    if (change.proposedValue === liveValue) {
      return { change, status: "noop", liveValue, conflictReason: null };
    }
    return { change, status: "ready", liveValue, conflictReason: null };
  });

  const summary: Record<PreviewStatus, number> = { ready: 0, noop: 0, needs_input: 0, conflict: 0 };
  for (const entry of entries) summary[entry.status] += 1;

  return { entries, hasConflicts: summary.conflict > 0, summary };
}

/** The changes safe to apply now: preview status `ready`. */
export function readyChanges(preview: ChangeSetPreview): RepairChange[] {
  return preview.entries.filter((entry) => entry.status === "ready").map((entry) => entry.change);
}
