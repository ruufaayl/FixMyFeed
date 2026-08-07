/**
 * Issue resolution capability routing (task T065).
 *
 * Given a Google Merchant issue, decide how it can be resolved: auto-fixed by
 * writing a normalized attribute back to the source (Shopify/WooCommerce),
 * resolved manually by the merchant, appealed (policy), or currently unsupported
 * (issue-resolution-integration.md, google-appeal-workflow.md,
 * restricted-actions-and-allowlists.md). The result maps to a **normalized
 * attribute** (gtin/title/description/price/…) that the connector-specific
 * writeback (T044/T054) translates to its own field — nothing is written here.
 *
 * Pure and deterministic; deny-by-default (unknown issues are never auto-fixed).
 */
import type { NormalizedIssue, NormalizedProductIssue } from "./product-issues.js";

export const RESOLUTION_KINDS = ["auto_fix", "manual", "appeal", "unsupported"] as const;
export type ResolutionKind = (typeof RESOLUTION_KINDS)[number];

/** Normalized, connector-neutral attributes an auto-fix can target. */
export const RESOLUTION_ATTRIBUTES = [
  "gtin",
  "title",
  "description",
  "price",
  "availability",
  "image",
] as const;
export type ResolutionAttribute = (typeof RESOLUTION_ATTRIBUTES)[number];

export interface ResolutionPlan {
  readonly kind: ResolutionKind;
  /** The normalized attribute an auto-fix targets (present only for auto_fix). */
  readonly attribute: ResolutionAttribute | null;
  readonly reason: string;
}

interface Rule {
  readonly test: (haystack: string) => boolean;
  readonly plan: (haystack: string) => ResolutionPlan;
}

const includesAny =
  (...needles: string[]) =>
  (h: string): boolean =>
    needles.some((n) => h.includes(n));

const autoFix = (attribute: ResolutionAttribute, reason: string): ResolutionPlan => ({
  kind: "auto_fix",
  attribute,
  reason,
});
const manual = (reason: string): ResolutionPlan => ({ kind: "manual", attribute: null, reason });
const appeal = (reason: string): ResolutionPlan => ({ kind: "appeal", attribute: null, reason });

// Order matters: earlier rules win. Policy/appeal is checked before attribute
// auto-fixes so a policy disapproval is never mistaken for a data fix.
const RULES: readonly Rule[] = [
  {
    test: includesAny(
      "policy",
      "editorial",
      "prohibited",
      "counterfeit",
      "restricted",
      "misrepresentation",
    ),
    plan: () => appeal("policy issue — requires review/appeal, not a data fix"),
  },
  {
    test: includesAny(
      "landing_page",
      "desktop",
      "mobile_landing",
      "crawl",
      "redirect",
      "unavailable",
      "404",
      "generic_error",
    ),
    plan: () => manual("store/landing-page issue — fix on the store, not in the feed"),
  },
  {
    test: includesAny("image"),
    plan: () => manual("image issue — needs a better image, cannot be auto-generated"),
  },
  {
    test: includesAny("gtin", "mpn", "identifier_exists", "unique_product_identifier"),
    plan: () => autoFix("gtin", "missing/invalid product identifier"),
  },
  { test: includesAny("title"), plan: () => autoFix("title", "title attribute issue") },
  {
    test: includesAny("description"),
    plan: () => autoFix("description", "description attribute issue"),
  },
  {
    test: includesAny("price", "sale_price"),
    plan: () => autoFix("price", "price attribute issue"),
  },
  {
    test: includesAny("availability", "stock", "in_stock", "out_of_stock"),
    plan: () => manual("availability reflects inventory truth — verify stock, not auto-fixed"),
  },
  {
    test: includesAny("shipping", "tax"),
    plan: () => manual("account shipping/tax settings issue"),
  },
];

/**
 * Routes a single normalized issue to a resolution plan. Uses the issue code and
 * attribute name; anything unmatched is `unsupported` (deny-by-default), never
 * silently auto-fixed.
 */
export function routeIssueResolution(
  issue: Pick<NormalizedIssue, "code" | "attributeName">,
): ResolutionPlan {
  const haystack = `${issue.code ?? ""} ${issue.attributeName ?? ""}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.test(haystack)) return rule.plan(haystack);
  }
  return { kind: "unsupported", attribute: null, reason: "no known resolution capability" };
}

export interface ProductResolution {
  readonly productId: string;
  readonly plans: readonly (ResolutionPlan & { readonly code: string })[];
  /** True if at least one issue is auto-fixable. */
  readonly autoFixable: boolean;
}

/** Routes every issue on a product and summarizes whether any is auto-fixable. */
export function routeProductIssues(product: NormalizedProductIssue): ProductResolution {
  const plans = product.issues.map((issue) => ({
    code: issue.code,
    ...routeIssueResolution(issue),
  }));
  return {
    productId: product.productId,
    plans,
    autoFixable: plans.some((p) => p.kind === "auto_fix"),
  };
}
