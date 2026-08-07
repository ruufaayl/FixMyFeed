/**
 * Evidence, confidence, impact, and prioritization (task T086).
 *
 * Scores normalized issues so a scan can be ranked and summarized. **Confidence**
 * reflects how certain the finding is (deterministic structural checks = 1.0;
 * network-derived checks lower). **Impact** reflects how much the issue hurts the
 * listing (feed-blocking problems score highest). **Priority** combines the two
 * with severity into a single deterministic score used to order and summarize.
 * Pure.
 */
import type { IssueSeverity } from "./engine.js";
import type { NormalizedIssue } from "./issue-lifecycle.js";

/** Relative weight of each severity (0..1). */
export const SEVERITY_WEIGHT: Readonly<Record<IssueSeverity, number>> = {
  critical: 1,
  error: 0.7,
  warning: 0.4,
  info: 0.15,
};

const SEVERITY_ORDER: Readonly<Record<IssueSeverity, number>> = {
  critical: 0,
  error: 1,
  warning: 2,
  info: 3,
};

/** Codes derived from an external fetch — inherently less certain. */
const NETWORK_DERIVED_CODES = new Set([
  "image_unreachable",
  "image_bad_content_type",
  "link_unreachable",
  "landing_page_unavailable",
  "landing_page_price_mismatch",
  "missing_structured_data",
]);

/** Codes that block a product from being listed at all — maximum impact. */
const BLOCKING_CODES = new Set([
  "missing_title",
  "missing_image",
  "missing_price",
  "missing_link",
  "invalid_gtin",
  "invalid_image_url",
  "invalid_link_url",
  "image_unreachable",
  "link_unreachable",
]);

/** Confidence (0..1) that the finding is real. */
export function issueConfidence(issue: NormalizedIssue): number {
  return NETWORK_DERIVED_CODES.has(issue.code) ? 0.8 : 1;
}

/** Impact (0..1): blocking codes are maximal, otherwise the severity weight. */
export function issueImpact(issue: NormalizedIssue): number {
  return BLOCKING_CODES.has(issue.code) ? 1 : SEVERITY_WEIGHT[issue.severity];
}

export interface ScoredIssue extends NormalizedIssue {
  readonly confidence: number;
  readonly impact: number;
  /** severityWeight × impact × confidence, rounded to 4 dp. */
  readonly priorityScore: number;
}

/** Scores one issue (confidence, impact, priority). */
export function scoreIssue(issue: NormalizedIssue): ScoredIssue {
  const confidence = issueConfidence(issue);
  const impact = issueImpact(issue);
  const priorityScore =
    Math.round(SEVERITY_WEIGHT[issue.severity] * impact * confidence * 10000) / 10000;
  return { ...issue, confidence, impact, priorityScore };
}

/**
 * Scores and orders issues by priority (highest first), with fully deterministic
 * tie-breaking: severity, then code, product, variant, and fingerprint.
 */
export function prioritizeIssues(issues: readonly NormalizedIssue[]): ScoredIssue[] {
  return issues.map(scoreIssue).sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    if (SEVERITY_ORDER[a.severity] !== SEVERITY_ORDER[b.severity]) {
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    }
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    const ap = a.productExternalId ?? "";
    const bp = b.productExternalId ?? "";
    if (ap !== bp) return ap < bp ? -1 : 1;
    const av = a.variantExternalId ?? "";
    const bv = b.variantExternalId ?? "";
    if (av !== bv) return av < bv ? -1 : 1;
    return a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0;
  });
}

export interface ScanSummary {
  readonly total: number;
  readonly bySeverity: Readonly<Record<IssueSeverity, number>>;
  readonly byCode: Readonly<Record<string, number>>;
  /** The highest-priority issues, already ordered. */
  readonly topIssues: readonly ScoredIssue[];
}

/**
 * Prioritizes issues and produces a scan summary: totals, per-severity and
 * per-code counts, and the top `topN` issues (default 20).
 */
export function summarizeScan(
  issues: readonly NormalizedIssue[],
  topN = 20,
): { readonly scored: readonly ScoredIssue[]; readonly summary: ScanSummary } {
  const scored = prioritizeIssues(issues);
  const bySeverity: Record<IssueSeverity, number> = { critical: 0, error: 0, warning: 0, info: 0 };
  const byCode: Record<string, number> = {};
  for (const issue of scored) {
    bySeverity[issue.severity] += 1;
    byCode[issue.code] = (byCode[issue.code] ?? 0) + 1;
  }
  return {
    scored,
    summary: {
      total: scored.length,
      bySeverity,
      byCode,
      topIssues: scored.slice(0, topN),
    },
  };
}
