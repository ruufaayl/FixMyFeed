/**
 * Remediation registry and safety classes (task T090).
 *
 * The foundation of the repair engine (E09). A remediation describes how a
 * diagnostic issue code (E08) can be fixed and — critically — its **safety
 * class**, which gates whether the system may propose an automatic value, only
 * assist a human, or never touch the field. Deny-by-default: an issue code with
 * no registered remediation is treated as `manual`. Pure.
 */

/**
 * How much autonomy a remediation is allowed:
 * - `automatic`  — deterministic, reversible fix the engine can compute and (with
 *   consent) write back.
 * - `assisted`   — the engine can suggest a value, but a human must confirm.
 * - `manual`     — only a human can supply the value; the engine cannot compute it.
 * - `blocked`    — never eligible for writeback (policy / too risky).
 */
export const SAFETY_CLASSES = ["automatic", "assisted", "manual", "blocked"] as const;
export type SafetyClass = (typeof SAFETY_CLASSES)[number];

export const RISK_LEVELS = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** A registered way to remediate one diagnostic issue code. */
export interface Remediation {
  /** The diagnostic issue code this remediation addresses (E08). */
  readonly issueCode: string;
  readonly title: string;
  readonly safetyClass: SafetyClass;
  readonly riskLevel: RiskLevel;
  /** Canonical catalog field the fix targets (e.g. `title`, `onlineStoreUrl`). */
  readonly targetField: string;
  /** Whether the fix targets a variant rather than the product. */
  readonly variantScoped: boolean;
  readonly description: string;
}

/**
 * A remediation is auto-appliable only when it is deterministic (`automatic`) and
 * not high-risk. Everything else requires human input or is blocked.
 */
export function canAutoApply(remediation: Remediation): boolean {
  return remediation.safetyClass === "automatic" && remediation.riskLevel !== "high";
}

/** Ordered, dedupe-by-issue-code collection of remediations. */
export class RemediationRegistry {
  readonly #byCode = new Map<string, Remediation>();

  register(remediation: Remediation): this {
    if (this.#byCode.has(remediation.issueCode)) {
      throw new Error(`Remediation already registered for issue: ${remediation.issueCode}`);
    }
    this.#byCode.set(remediation.issueCode, remediation);
    return this;
  }

  registerAll(remediations: Iterable<Remediation>): this {
    for (const remediation of remediations) this.register(remediation);
    return this;
  }

  has(issueCode: string): boolean {
    return this.#byCode.has(issueCode);
  }

  /** The remediation for an issue code, or undefined (deny-by-default → manual). */
  get(issueCode: string): Remediation | undefined {
    return this.#byCode.get(issueCode);
  }

  /** Resolves the effective safety class, defaulting unknown codes to `manual`. */
  safetyClassFor(issueCode: string): SafetyClass {
    return this.#byCode.get(issueCode)?.safetyClass ?? "manual";
  }

  list(): Remediation[] {
    return [...this.#byCode.values()];
  }

  get size(): number {
    return this.#byCode.size;
  }
}

const remediation = (
  issueCode: string,
  title: string,
  safetyClass: SafetyClass,
  riskLevel: RiskLevel,
  targetField: string,
  variantScoped: boolean,
  description: string,
): Remediation => ({
  issueCode,
  title,
  safetyClass,
  riskLevel,
  targetField,
  variantScoped,
  description,
});

/**
 * Built-in remediations for the E08 diagnostic codes. Only deterministic,
 * reversible rewrites are `automatic`; anything that invents content, changes
 * price/availability, or depends on external truth is `assisted`/`manual`.
 */
export const BUILTIN_REMEDIATIONS: readonly Remediation[] = [
  remediation(
    "insecure_image_url",
    "Upgrade image URL to HTTPS",
    "automatic",
    "low",
    "images",
    false,
    "Rewrite an http:// image URL to https:// (reversible, deterministic).",
  ),
  remediation(
    "insecure_link_url",
    "Upgrade landing-page URL to HTTPS",
    "automatic",
    "low",
    "onlineStoreUrl",
    false,
    "Rewrite an http:// landing-page URL to https:// (reversible, deterministic).",
  ),
  remediation(
    "title_too_long",
    "Trim title to the length limit",
    "assisted",
    "medium",
    "title",
    false,
    "Suggest a truncated title within the limit; human confirms (lossy).",
  ),
  remediation(
    "missing_image_alt",
    "Add image alt text",
    "assisted",
    "low",
    "images",
    false,
    "Suggest alt text derived from the product title; human confirms.",
  ),
  remediation(
    "missing_title",
    "Provide a product title",
    "manual",
    "high",
    "title",
    false,
    "The engine cannot invent a title; a human must supply it.",
  ),
  remediation(
    "missing_description",
    "Provide a product description",
    "manual",
    "medium",
    "description",
    false,
    "The engine cannot invent a description; a human must supply it.",
  ),
  remediation(
    "invalid_gtin",
    "Correct the GTIN",
    "manual",
    "high",
    "gtin",
    true,
    "A valid GTIN must come from the merchant/GS1; never guessed.",
  ),
  remediation(
    "invalid_compare_at_price",
    "Fix compare-at price",
    "assisted",
    "high",
    "compareAtPrice",
    true,
    "Suggest clearing or raising compare-at price; price changes need confirmation.",
  ),
  remediation(
    "missing_link",
    "Provide a landing-page URL",
    "manual",
    "high",
    "onlineStoreUrl",
    false,
    "A valid landing page must come from the merchant; never fabricated.",
  ),
];

/** A registry pre-loaded with the built-in remediations. */
export function defaultRemediationRegistry(): RemediationRegistry {
  return new RemediationRegistry().registerAll(BUILTIN_REMEDIATIONS);
}
