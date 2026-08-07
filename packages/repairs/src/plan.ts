/**
 * Repair option selection and plan generation (task T091).
 *
 * Turns scored diagnostic issues (E08) into a concrete `RepairPlan`: for each
 * issue with a registered remediation (T090), it computes the proposed change to
 * the catalog field — an actual new value for deterministic `automatic` fixes, a
 * suggested value for `assisted` fixes, or a change that `requiresInput` for
 * `manual` ones. Deny-by-default: an issue with no remediation is skipped. Pure.
 */
import type { CatalogProduct, CatalogVariant } from "@fixmyfeed/domain";
import type { ValidationIssue } from "@fixmyfeed/diagnostics";
import {
  defaultRemediationRegistry,
  type Remediation,
  type RemediationRegistry,
  type RiskLevel,
  type SafetyClass,
} from "./registry.js";

/** One proposed field change produced by the plan. */
export interface RepairChange {
  readonly issueCode: string;
  readonly productExternalId: string;
  readonly variantExternalId: string | null;
  readonly field: string;
  readonly safetyClass: SafetyClass;
  readonly riskLevel: RiskLevel;
  /** Current value of the field (as a string), or null when unknown. */
  readonly currentValue: string | null;
  /** Proposed new value, or null when a human must supply it. */
  readonly proposedValue: string | null;
  /** True when the fix cannot be computed and needs human input. */
  readonly requiresInput: boolean;
}

export interface RepairPlan {
  readonly changes: readonly RepairChange[];
  readonly summary: {
    readonly total: number;
    readonly automatic: number;
    readonly assisted: number;
    readonly manual: number;
    readonly requiresInput: number;
  };
}

const TITLE_LIMIT = 150;
const toHttps = (url: string): string => url.replace(/^http:\/\//i, "https://");

/**
 * Strategy that computes a proposed value for a remediable issue, given the issue
 * and its product. Returns null when no value can be computed (→ requiresInput).
 */
type ProposalStrategy = (
  issue: ValidationIssue,
  product: CatalogProduct | undefined,
) => { current: string | null; proposed: string | null } | null;

const evidenceUrl = (issue: ValidationIssue): string | null => {
  const url = issue.evidence?.["url"];
  return typeof url === "string" ? url : null;
};

const PROPOSAL_STRATEGIES: Readonly<Record<string, ProposalStrategy>> = {
  insecure_image_url: (issue) => {
    const url = evidenceUrl(issue);
    return url ? { current: url, proposed: toHttps(url) } : null;
  },
  insecure_link_url: (issue, product) => {
    const url = evidenceUrl(issue) ?? product?.onlineStoreUrl ?? null;
    return url ? { current: url, proposed: toHttps(url) } : null;
  },
  title_too_long: (_issue, product) => {
    if (!product) return null;
    return { current: product.title, proposed: product.title.slice(0, TITLE_LIMIT).trimEnd() };
  },
  missing_image_alt: (_issue, product) => {
    if (!product || product.title.trim() === "") return null;
    return { current: null, proposed: product.title };
  },
};

function findVariant(
  product: CatalogProduct | undefined,
  variantExternalId: string | null,
): CatalogVariant | undefined {
  if (!product || variantExternalId === null) return undefined;
  return product.variants.find((variant) => variant.externalId === variantExternalId);
}

export interface RepairPlanInput {
  readonly issues: readonly ValidationIssue[];
  readonly products: readonly CatalogProduct[];
  readonly registry?: RemediationRegistry;
  /** Include manual/uncomputable changes (default true, marked requiresInput). */
  readonly includeManual?: boolean;
}

/**
 * Generates a repair plan from issues. Each issue with a registered remediation
 * becomes a `RepairChange`; issues without one are skipped (deny-by-default).
 * Manual or uncomputable changes are included with `requiresInput: true` unless
 * `includeManual` is false. Changes preserve issue order.
 */
export function generateRepairPlan(input: RepairPlanInput): RepairPlan {
  const registry = input.registry ?? defaultRemediationRegistry();
  const includeManual = input.includeManual ?? true;
  const byExternalId = new Map(input.products.map((product) => [product.externalId, product]));

  const changes: RepairChange[] = [];
  for (const issue of input.issues) {
    const remediation: Remediation | undefined = registry.get(issue.code);
    if (!remediation) continue; // deny-by-default: no remediation → not planned

    const product = issue.productExternalId ? byExternalId.get(issue.productExternalId) : undefined;
    const strategy = PROPOSAL_STRATEGIES[issue.code];
    const computed = strategy ? strategy(issue, product) : null;

    let currentValue = computed?.current ?? null;
    if (currentValue === null && remediation.variantScoped) {
      const variant = findVariant(product, issue.variantExternalId);
      const raw = variant?.[remediation.targetField as keyof CatalogVariant];
      currentValue = typeof raw === "string" ? raw : null;
    }

    const proposedValue = computed?.proposed ?? null;
    const requiresInput = proposedValue === null;
    if (requiresInput && !includeManual) continue;

    changes.push({
      issueCode: issue.code,
      productExternalId: issue.productExternalId ?? "",
      variantExternalId: issue.variantExternalId,
      field: remediation.targetField,
      safetyClass: remediation.safetyClass,
      riskLevel: remediation.riskLevel,
      currentValue,
      proposedValue,
      requiresInput,
    });
  }

  const summary = {
    total: changes.length,
    automatic: changes.filter((c) => c.safetyClass === "automatic").length,
    assisted: changes.filter((c) => c.safetyClass === "assisted").length,
    manual: changes.filter((c) => c.safetyClass === "manual").length,
    requiresInput: changes.filter((c) => c.requiresInput).length,
  };
  return { changes, summary };
}

/**
 * The changes eligible for automatic writeback: `automatic` safety class,
 * non-high risk, with a computed value (no human input needed).
 */
export function selectAutoApplicableChanges(plan: RepairPlan): RepairChange[] {
  return plan.changes.filter(
    (change) =>
      change.safetyClass === "automatic" && change.riskLevel !== "high" && !change.requiresInput,
  );
}
