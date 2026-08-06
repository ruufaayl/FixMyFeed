/**
 * @fixmyfeed/jobs
 *
 * pg-boss queue registry and durable worker runtime (task T021).
 */
export const workspaceName = "@fixmyfeed/jobs" as const;
export const workspaceKind = "package" as const;

export { JOBS_ERROR_CODE, JobsError } from "./errors.js";
export type { JobsErrorCode } from "./errors.js";

export {
  ALL_QUEUES,
  QUEUE_REGISTRY,
  WORKLOAD_CLASSES,
  isWorkloadClass,
  queueFor,
} from "./queues.js";
export type { QueueDefinition, WorkloadClass } from "./queues.js";

export {
  DEFAULT_RETRY_POLICY,
  TransientJobError,
  classifyFailure,
  computeBackoffMs,
  shouldRetry,
} from "./retry.js";
export type { FailureClass, RetryPolicy } from "./retry.js";

export {
  JOB_ENVELOPE_SCHEMA_VERSION,
  assertNoSecrets,
  createJobEnvelope,
  validateJobEnvelope,
} from "./envelope.js";
export type { CreateJobEnvelopeInput, JobEnvelope, JobPrincipal } from "./envelope.js";

export { createWorkerRuntime } from "./runtime.js";
export type {
  JobContext,
  JobHandler,
  PgBossLike,
  RuntimeEvent,
  RuntimeTelemetry,
  WorkerRuntime,
  WorkerRuntimeOptions,
} from "./runtime.js";
