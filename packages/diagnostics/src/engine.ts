/**
 * Validator registry and execution framework (task T080).
 *
 * The deterministic core of the diagnostics engine (E08). Validators are pure
 * functions that inspect a normalized catalog and emit `ValidationIssue`s. The
 * registry holds them by unique id; the executor runs a selected set in a stable
 * order, isolating each validator so one throwing does not abort the scan. Later
 * tasks register concrete validators (T081–T084), normalize/dedupe the issues
 * (T085), score them (T086), and orchestrate whole scans (T087).
 */
import type { CatalogProduct } from "@fixmyfeed/domain";

export const ISSUE_SEVERITIES = ["critical", "error", "warning", "info"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

/** A single finding from a validator, before normalization/scoring. */
export interface ValidationIssue {
  /** Stable machine code, e.g. `missing_title`. */
  readonly code: string;
  readonly severity: IssueSeverity;
  /** Product the issue is about, or null for catalog-level issues. */
  readonly productExternalId: string | null;
  /** Variant the issue is about, or null. */
  readonly variantExternalId: string | null;
  /** Attribute/field the issue concerns, or null. */
  readonly field: string | null;
  readonly message: string;
  /** Optional structured evidence (offending value, threshold, etc.). */
  readonly evidence?: Readonly<Record<string, unknown>>;
}

/** Input a validator runs against. */
export interface ValidatorContext {
  readonly products: readonly CatalogProduct[];
}

/** A registered validator: a stable id/title plus a pure `run`. */
export interface Validator {
  readonly id: string;
  readonly title: string;
  run(context: ValidatorContext): ValidationIssue[];
}

/** Convenience factory for a `ValidationIssue` with null defaults. */
export function issue(
  code: string,
  severity: IssueSeverity,
  message: string,
  overrides: Partial<Omit<ValidationIssue, "code" | "severity" | "message">> = {},
): ValidationIssue {
  return {
    code,
    severity,
    message,
    productExternalId: overrides.productExternalId ?? null,
    variantExternalId: overrides.variantExternalId ?? null,
    field: overrides.field ?? null,
    ...(overrides.evidence ? { evidence: overrides.evidence } : {}),
  };
}

/**
 * Builds a validator that runs a per-product check over the whole catalog,
 * flattening the results in product order. Keeps concrete validators concise.
 */
export function productValidator(
  id: string,
  title: string,
  check: (product: CatalogProduct) => ValidationIssue[],
): Validator {
  return {
    id,
    title,
    run(context) {
      const issues: ValidationIssue[] = [];
      for (const product of context.products) {
        for (const found of check(product)) issues.push(found);
      }
      return issues;
    },
  };
}

/** Ordered, de-duplicated-by-id collection of validators. */
export class ValidatorRegistry {
  readonly #validators = new Map<string, Validator>();

  /** Registers a validator; throws on a duplicate id. */
  register(validator: Validator): this {
    if (this.#validators.has(validator.id)) {
      throw new Error(`Validator already registered: ${validator.id}`);
    }
    this.#validators.set(validator.id, validator);
    return this;
  }

  /** Registers many validators in order. */
  registerAll(validators: Iterable<Validator>): this {
    for (const validator of validators) this.register(validator);
    return this;
  }

  has(id: string): boolean {
    return this.#validators.has(id);
  }

  get(id: string): Validator | undefined {
    return this.#validators.get(id);
  }

  /** All validators, in registration order. */
  list(): Validator[] {
    return [...this.#validators.values()];
  }

  get size(): number {
    return this.#validators.size;
  }
}

/** Outcome of one validator's execution. */
export interface ValidatorRunResult {
  readonly validatorId: string;
  readonly issues: readonly ValidationIssue[];
  /** Set when the validator threw; the scan continues regardless. */
  readonly error: string | null;
}

export interface EngineResult {
  /** All issues, concatenated in validator order. */
  readonly issues: readonly ValidationIssue[];
  readonly runs: readonly ValidatorRunResult[];
  /** Ids of validators that threw. */
  readonly failed: readonly string[];
}

/**
 * Runs `validators` against `context` in order, isolating failures: a validator
 * that throws yields an empty issue set and is recorded in `failed`, without
 * aborting the rest. Deterministic given deterministic validators.
 */
export function runValidators(
  validators: readonly Validator[],
  context: ValidatorContext,
): EngineResult {
  const runs: ValidatorRunResult[] = [];
  const issues: ValidationIssue[] = [];
  const failed: string[] = [];

  for (const validator of validators) {
    try {
      const found = validator.run(context);
      runs.push({ validatorId: validator.id, issues: found, error: null });
      for (const item of found) issues.push(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      runs.push({ validatorId: validator.id, issues: [], error: message });
      failed.push(validator.id);
    }
  }

  return { issues, runs, failed };
}
