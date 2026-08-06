/**
 * Canonical configuration error envelope (task T003).
 *
 * A single machine-readable error code with a list of per-variable issues.
 * Issue messages MUST NOT contain secret values — coercers describe the
 * expected shape, never the offending input.
 */

export const CONFIG_ERROR_CODE = "CONFIG_VALIDATION_FAILED" as const;

export type ConfigIssueCode = "missing_required" | "invalid_value" | "not_allowed_in_context";

export interface ConfigIssue {
  /** Environment variable name. */
  readonly variable: string;
  readonly code: ConfigIssueCode;
  /** Human-readable, secret-free explanation of the failure. */
  readonly message: string;
}

/**
 * Thrown when startup configuration validation fails. Aggregates every issue
 * so the operator can fix all of them at once rather than one per restart.
 */
export class ConfigValidationError extends Error {
  readonly code = CONFIG_ERROR_CODE;
  readonly issues: readonly ConfigIssue[];

  constructor(issues: readonly ConfigIssue[]) {
    super(
      `Configuration validation failed with ${issues.length} issue(s): ${issues.map((i) => i.variable).join(", ")}`,
    );
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}
