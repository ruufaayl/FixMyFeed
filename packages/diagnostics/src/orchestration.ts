/**
 * Diagnostic scan orchestration (task T087).
 *
 * The capstone of E08: runs a full diagnostic scan over a normalized catalog and
 * returns a ready-to-persist, ready-to-display result. It executes the registered
 * synchronous validators (T081–T084), optionally runs the async acquisition
 * (T083) and landing-page (T084) checks when probe adapters are supplied,
 * normalizes and dedupes the findings (T085), computes their lifecycle against the
 * stored issues (T085), and prioritizes + summarizes them (T086). Pure aside from
 * the injected probes.
 */
import type { CatalogProduct } from "@fixmyfeed/domain";
import {
  runValidators,
  ValidatorRegistry,
  type Validator,
  type ValidationIssue,
} from "./engine.js";
import { requiredAttributeValidators, structuralValidators } from "./validators/structural.js";
import { identityValidators } from "./validators/identity.js";
import { mediaValidators, checkUrlAcquisition, type UrlProbe } from "./validators/media.js";
import {
  consistencyValidators,
  checkLandingPages,
  type LandingPageProbe,
} from "./validators/consistency.js";
import {
  normalizeIssues,
  reconcileIssueLifecycle,
  type PriorIssue,
  type IssueLifecycleResult,
} from "./issue-lifecycle.js";
import { summarizeScan, type ScanSummary, type ScoredIssue } from "./scoring.js";

/** All built-in synchronous validators, in run order. */
export function defaultValidators(): Validator[] {
  return [
    ...requiredAttributeValidators,
    ...structuralValidators,
    ...identityValidators,
    ...mediaValidators,
    ...consistencyValidators,
  ];
}

/** A registry pre-loaded with every built-in validator. */
export function defaultValidatorRegistry(): ValidatorRegistry {
  return new ValidatorRegistry().registerAll(defaultValidators());
}

export interface DiagnosticScanInput {
  readonly products: readonly CatalogProduct[];
  /** Validators to run; defaults to {@link defaultValidators}. */
  readonly validators?: readonly Validator[];
  /** When supplied, runs image/link reachability checks (T083). */
  readonly urlProbe?: UrlProbe;
  /** When supplied, runs landing-page checks (T084). */
  readonly landingPageProbe?: LandingPageProbe;
  /** Stored issues for the catalog, for lifecycle computation. */
  readonly prior?: readonly PriorIssue[];
  /** Cap on `summary.topIssues`; defaults to 20. */
  readonly topN?: number;
}

export interface DiagnosticScanResult {
  /** Every issue, scored and ordered by priority. */
  readonly scored: readonly ScoredIssue[];
  readonly summary: ScanSummary;
  /** Opened / persisting / resolved relative to `prior`. */
  readonly lifecycle: IssueLifecycleResult;
  /** Ids of synchronous validators that threw (scan still completed). */
  readonly failedValidators: readonly string[];
}

/**
 * Runs a complete diagnostic scan. Synchronous validators run first (a thrower is
 * isolated, not fatal); acquisition and landing-page checks run only when their
 * probe is provided. All findings are normalized, deduped, lifecycle-classified,
 * and prioritized into the returned result.
 */
export async function runDiagnosticScan(input: DiagnosticScanInput): Promise<DiagnosticScanResult> {
  const validators = input.validators ?? defaultValidators();
  const engineResult = runValidators(validators, { products: input.products });

  const rawIssues: ValidationIssue[] = [...engineResult.issues];
  if (input.urlProbe) {
    rawIssues.push(...(await checkUrlAcquisition(input.products, input.urlProbe)));
  }
  if (input.landingPageProbe) {
    rawIssues.push(...(await checkLandingPages(input.products, input.landingPageProbe)));
  }

  const normalized = normalizeIssues(rawIssues);
  const lifecycle = reconcileIssueLifecycle(normalized, input.prior ?? []);
  const { scored, summary } = summarizeScan(normalized, input.topN);

  return { scored, summary, lifecycle, failedValidators: engineResult.failed };
}
