/**
 * Job payload envelope (task T021).
 *
 * Every durable job carries a versioned, correlated, secret-free envelope
 * (job-and-workflow-architecture.md): schema version, job id, tenant id, the
 * acting principal, correlation id, operation id, and resource references — but
 * never raw secrets. Pure and deterministic (with an injectable id generator).
 */
import { randomUUID } from "node:crypto";
import { JOBS_ERROR_CODE, JobsError } from "./errors.js";

export const JOB_ENVELOPE_SCHEMA_VERSION = 1 as const;

export interface JobPrincipal {
  readonly type: "user" | "system";
  /** Present for user principals; omitted for system work. */
  readonly userId?: string;
}

export interface JobEnvelope<Payload> {
  readonly schemaVersion: number;
  readonly jobId: string;
  /** Owning tenant, or null for platform/system jobs. */
  readonly tenantId: string | null;
  readonly principal: JobPrincipal;
  readonly correlationId: string;
  readonly operationId: string | null;
  readonly resources: readonly string[];
  readonly payload: Payload;
}

export interface CreateJobEnvelopeInput<Payload> {
  readonly tenantId: string | null;
  readonly principal: JobPrincipal;
  readonly correlationId: string;
  readonly operationId?: string | null;
  readonly resources?: readonly string[];
  readonly payload: Payload;
}

const SECRET_KEY_RE =
  /secret|password|passwd|token|credential|api[_-]?key|private[_-]?key|authorization/i;

/** Rejects payloads that carry raw secret-looking keys at any depth. */
export function assertNoSecrets(payload: unknown, path = "payload"): void {
  if (payload === null || typeof payload !== "object") return;
  if (Array.isArray(payload)) {
    payload.forEach((v, i) => assertNoSecrets(v, `${path}[${i}]`));
    return;
  }
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (SECRET_KEY_RE.test(key)) {
      throw new JobsError(
        `job payload must not contain raw secrets (found "${key}" at ${path})`,
        JOBS_ERROR_CODE.SECRET_IN_PAYLOAD,
      );
    }
    assertNoSecrets(value, `${path}.${key}`);
  }
}

/** Builds a validated envelope, generating the job id. */
export function createJobEnvelope<Payload>(
  input: CreateJobEnvelopeInput<Payload>,
  generateId: () => string = randomUUID,
): JobEnvelope<Payload> {
  const envelope: JobEnvelope<Payload> = {
    schemaVersion: JOB_ENVELOPE_SCHEMA_VERSION,
    jobId: generateId(),
    tenantId: input.tenantId,
    principal: input.principal,
    correlationId: input.correlationId,
    operationId: input.operationId ?? null,
    resources: input.resources ?? [],
    payload: input.payload,
  };
  validateJobEnvelope(envelope);
  return envelope;
}

/** Validates envelope shape and the no-secrets rule; throws JobsError on failure. */
export function validateJobEnvelope(value: unknown): asserts value is JobEnvelope<unknown> {
  const e = value as Partial<JobEnvelope<unknown>> | null;
  const fail = (message: string): never => {
    throw new JobsError(message, JOBS_ERROR_CODE.INVALID_ENVELOPE);
  };

  if (!e || typeof e !== "object") fail("envelope must be an object");
  if (e!.schemaVersion !== JOB_ENVELOPE_SCHEMA_VERSION) fail("unsupported envelope schema version");
  if (typeof e!.jobId !== "string" || e!.jobId.length === 0) fail("jobId is required");
  if (!(typeof e!.tenantId === "string" || e!.tenantId === null))
    fail("tenantId must be a string or null");
  if (typeof e!.correlationId !== "string" || e!.correlationId.length === 0)
    fail("correlationId is required");
  if (!(typeof e!.operationId === "string" || e!.operationId === null))
    fail("operationId must be a string or null");
  if (!Array.isArray(e!.resources)) fail("resources must be an array");
  const principal = e!.principal;
  if (!principal || (principal.type !== "user" && principal.type !== "system")) {
    fail("principal.type must be 'user' or 'system'");
  }
  if (principal!.type === "user" && typeof principal!.userId !== "string") {
    fail("user principals require a userId");
  }
  assertNoSecrets(e!.payload);
}
