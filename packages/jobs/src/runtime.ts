/**
 * Durable worker runtime (task T021).
 *
 * A thin wrapper over pg-boss that registers workload-class queues, submits
 * jobs, and runs handlers with envelope validation and transient/permanent
 * failure routing:
 *   - transient failures are rethrown so pg-boss retries with the queue's
 *     bounded backoff, and dead-letters the job when attempts are exhausted;
 *   - permanent failures are routed straight to the dead-letter queue (no
 *     wasted retries) and the current job is completed.
 *
 * The pg-boss instance is created through an injectable factory so the runtime
 * is unit-testable without a database.
 */
import { createRequire } from "node:module";
import { validateJobEnvelope, type JobEnvelope } from "./envelope.js";
import { classifyFailure } from "./retry.js";
import { JOBS_ERROR_CODE, JobsError } from "./errors.js";
import { ALL_QUEUES, type QueueDefinition } from "./queues.js";

/** The subset of the pg-boss API the runtime uses (for typing + test doubles). */
export interface PgBossLike {
  start(): Promise<unknown>;
  stop(options?: unknown): Promise<unknown>;
  createQueue(name: string, options?: unknown): Promise<unknown>;
  work(
    name: string,
    options: unknown,
    handler: (jobs: readonly { id: string; data: unknown }[]) => Promise<void>,
  ): Promise<string>;
  send(name: string, data: unknown, options?: unknown): Promise<string | null>;
}

export interface JobContext {
  readonly jobId: string;
  readonly attempt: number;
}

export type JobHandler<Payload> = (
  envelope: JobEnvelope<Payload>,
  context: JobContext,
) => Promise<void>;

export interface RuntimeTelemetry {
  onEvent?(event: RuntimeEvent): void;
}

export interface RuntimeEvent {
  readonly type: "job_started" | "job_succeeded" | "job_transient_failure" | "job_dead_lettered";
  readonly queue: string;
  readonly jobId: string;
}

export interface WorkerRuntimeOptions {
  readonly databaseUrl: string;
  /** Defaults to constructing a real pg-boss; injected in tests. */
  readonly bossFactory?: (connectionString: string) => PgBossLike;
  readonly telemetry?: RuntimeTelemetry;
}

export interface WorkerRuntime {
  register<Payload>(queue: QueueDefinition, handler: JobHandler<Payload>): void;
  enqueue<Payload>(
    queue: QueueDefinition,
    envelope: JobEnvelope<Payload>,
    options?: { readonly singletonKey?: string },
  ): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createWorkerRuntime(options: WorkerRuntimeOptions): WorkerRuntime {
  if (typeof options.databaseUrl !== "string" || options.databaseUrl.length === 0) {
    throw new JobsError("databaseUrl is required", JOBS_ERROR_CODE.RUNTIME);
  }
  const registrations = new Map<string, { queue: QueueDefinition; handler: JobHandler<unknown> }>();
  const emit = (event: RuntimeEvent) => options.telemetry?.onEvent?.(event);
  let boss: PgBossLike | undefined;

  const requireQueue = (name: string): QueueDefinition => {
    const known = ALL_QUEUES.find((q) => q.name === name);
    if (!known) throw new JobsError(`unknown queue "${name}"`, JOBS_ERROR_CODE.UNKNOWN_QUEUE);
    return known;
  };

  const makeWorker = (queue: QueueDefinition, handler: JobHandler<unknown>) => {
    return async (jobs: readonly { id: string; data: unknown }[]): Promise<void> => {
      for (const job of jobs) {
        emit({ type: "job_started", queue: queue.name, jobId: job.id });
        validateJobEnvelope(job.data);
        const envelope = job.data as JobEnvelope<unknown>;
        try {
          await handler(envelope, { jobId: job.id, attempt: 1 });
          emit({ type: "job_succeeded", queue: queue.name, jobId: job.id });
        } catch (error) {
          if (classifyFailure(error) === "transient") {
            emit({ type: "job_transient_failure", queue: queue.name, jobId: job.id });
            throw error; // pg-boss retries with bounded backoff; dead-letters on exhaustion
          }
          // Permanent failure: dead-letter immediately, do not retry.
          await boss!.send(queue.deadLetter, envelope);
          emit({ type: "job_dead_lettered", queue: queue.name, jobId: job.id });
        }
      }
    };
  };

  return {
    register(queue, handler) {
      requireQueue(queue.name);
      registrations.set(queue.name, { queue, handler: handler as JobHandler<unknown> });
    },

    async enqueue(queue, envelope, enqueueOptions) {
      requireQueue(queue.name);
      validateJobEnvelope(envelope);
      if (!boss) throw new JobsError("runtime is not started", JOBS_ERROR_CODE.RUNTIME);
      await boss.send(
        queue.name,
        envelope,
        enqueueOptions?.singletonKey ? { singletonKey: enqueueOptions.singletonKey } : {},
      );
    },

    async start() {
      const factory = options.bossFactory ?? defaultBossFactory;
      boss = factory(options.databaseUrl);
      await boss.start();
      for (const { queue, handler } of registrations.values()) {
        await boss.createQueue(queue.deadLetter);
        await boss.createQueue(queue.name, {
          deadLetter: queue.deadLetter,
          retryLimit: Math.max(0, queue.retry.maxAttempts - 1),
          retryDelay: Math.round(queue.retry.baseDelayMs / 1000),
          retryBackoff: true,
        });
        await boss.work(queue.name, { batchSize: queue.concurrency }, makeWorker(queue, handler));
      }
    },

    async stop() {
      if (boss) {
        await boss.stop({ graceful: true });
        boss = undefined;
      }
    },
  };
}

const nodeRequire = createRequire(import.meta.url);

function defaultBossFactory(connectionString: string): PgBossLike {
  // Lazily load pg-boss (CommonJS) so importing this package never needs a database.
  const PgBoss = nodeRequire("pg-boss") as new (options: unknown) => PgBossLike;
  return new PgBoss({ connectionString });
}
