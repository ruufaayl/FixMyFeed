/** Canonical error envelope for the jobs runtime (task T021). Secret-free messages. */
export const JOBS_ERROR_CODE = {
  INVALID_ENVELOPE: "JOBS_INVALID_ENVELOPE",
  SECRET_IN_PAYLOAD: "JOBS_SECRET_IN_PAYLOAD",
  UNKNOWN_QUEUE: "JOBS_UNKNOWN_QUEUE",
  RUNTIME: "JOBS_RUNTIME_ERROR",
} as const;

export type JobsErrorCode = (typeof JOBS_ERROR_CODE)[keyof typeof JOBS_ERROR_CODE];

export class JobsError extends Error {
  readonly code: JobsErrorCode;
  constructor(message: string, code: JobsErrorCode) {
    super(message);
    this.name = "JobsError";
    this.code = code;
  }
}
