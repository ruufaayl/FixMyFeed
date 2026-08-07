/**
 * Pure issue/evidence mappers (task T153).
 *
 * The mapping + presentation logic behind the Issues repository adapter, kept
 * pure so it is unit-testable without a database.
 */
import type { EvidenceEntryDTO, IssueSeverityDTO } from "../dto";

const SEVERITIES: readonly IssueSeverityDTO[] = ["critical", "error", "warning", "info"];

/** Maps a 0–3 severity rank to a severity (clamps to `info`). */
export function severityFromRank(rank: number): IssueSeverityDTO {
  return SEVERITIES[rank] ?? "info";
}

/** Humanizes an issue code into a title, e.g. `insecure_image_url` → "Insecure image url". */
export function humanizeCode(code: string): string {
  const spaced = code.replace(/_/g, " ").trim();
  return spaced.length === 0 ? code : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

interface IssueSample {
  readonly productExternalId: string | null;
  readonly message: string;
  readonly lastSeenAt: string;
  readonly severity: IssueSeverityDTO;
}

/** Builds evidence entries from a few representative affected issues. */
export function toEvidenceEntries(issues: readonly IssueSample[]): EvidenceEntryDTO[] {
  return issues.map((issue) => ({
    source: issue.productExternalId ?? "—",
    value: issue.message,
    observedAt: issue.lastSeenAt,
    mismatch: issue.severity === "critical",
  }));
}

const EXPLANATIONS: Readonly<Record<string, { explanation: string; whyItMatters: string }>> = {
  insecure_image_url: {
    explanation: "One or more image URLs use insecure HTTP.",
    whyItMatters: "Merchants and destinations may reject or downrank non-HTTPS images.",
  },
  insecure_link_url: {
    explanation: "The landing-page URL uses insecure HTTP.",
    whyItMatters: "Destinations expect secure (HTTPS) landing pages.",
  },
  missing_title: {
    explanation: "Products are missing a title.",
    whyItMatters: "A title is required for a product to be listed.",
  },
  missing_image: {
    explanation: "Products have no image.",
    whyItMatters: "Listings without an image are typically disapproved.",
  },
  missing_price: {
    explanation: "No variant has a valid price.",
    whyItMatters: "A price is required for a product to be listed and shopped.",
  },
  invalid_gtin: {
    explanation: "A GTIN fails length or check-digit validation.",
    whyItMatters: "Invalid identifiers cause matching failures and disapprovals.",
  },
};

/** Plain-language explanation for an issue code (generic fallback). */
export function explainCode(code: string): { explanation: string; whyItMatters: string } {
  return (
    EXPLANATIONS[code] ?? {
      explanation: `Detected on products flagged with "${humanizeCode(code)}".`,
      whyItMatters: "Unresolved issues reduce catalog health and visibility.",
    }
  );
}
