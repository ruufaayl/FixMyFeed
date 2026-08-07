/**
 * Canonical error envelope for the diagnostics package (Epic E07/E08).
 * Secret-free messages; stable machine-readable codes.
 */
export const DIAGNOSTICS_ERROR_CODE = {
  INVALID_INPUT: "DIAGNOSTICS_INVALID_INPUT",
  PARSE_ERROR: "DIAGNOSTICS_PARSE_ERROR",
  UNSUPPORTED: "DIAGNOSTICS_UNSUPPORTED",
} as const;
export type DiagnosticsErrorCode = keyof typeof DIAGNOSTICS_ERROR_CODE;

export class DiagnosticsError extends Error {
  readonly code: string;
  constructor(message: string, code: DiagnosticsErrorCode = "INVALID_INPUT") {
    super(message);
    this.name = "DiagnosticsError";
    this.code = DIAGNOSTICS_ERROR_CODE[code];
  }
}
