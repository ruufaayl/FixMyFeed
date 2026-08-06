/**
 * Queue registry (task T021).
 *
 * Queues are partitioned by **workload class**, not by tenant
 * (job-and-workflow-architecture.md) — tenant fairness is enforced at batch
 * boundaries by the worker, not by queue proliferation. Each queue has an
 * explicit name, a retry policy, and a dead-letter queue.
 */
import { DEFAULT_RETRY_POLICY, type RetryPolicy } from "./retry.js";

export const WORKLOAD_CLASSES = [
  "import",
  "synchronization",
  "diagnostics",
  "repair",
  "export",
  "notification",
  "maintenance",
] as const;

export type WorkloadClass = (typeof WORKLOAD_CLASSES)[number];

export interface QueueDefinition {
  readonly workloadClass: WorkloadClass;
  /** Stable queue name, e.g. "workload.diagnostics". */
  readonly name: string;
  /** Dead-letter queue for exhausted jobs, e.g. "workload.diagnostics.dlq". */
  readonly deadLetter: string;
  readonly retry: RetryPolicy;
  /** Default worker concurrency for this workload class. */
  readonly concurrency: number;
}

const define = (
  workloadClass: WorkloadClass,
  concurrency: number,
  retry: RetryPolicy = DEFAULT_RETRY_POLICY,
): QueueDefinition => ({
  workloadClass,
  name: `workload.${workloadClass}`,
  deadLetter: `workload.${workloadClass}.dlq`,
  retry,
  concurrency,
});

/** Bootstrap concurrency is conservative; the cost guard may lower it further. */
export const QUEUE_REGISTRY: Readonly<Record<WorkloadClass, QueueDefinition>> = Object.freeze({
  import: define("import", 2),
  synchronization: define("synchronization", 4),
  diagnostics: define("diagnostics", 4),
  repair: define("repair", 2),
  export: define("export", 2),
  notification: define("notification", 4, {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 8,
  }),
  maintenance: define("maintenance", 1),
});

export const ALL_QUEUES: readonly QueueDefinition[] = Object.freeze(Object.values(QUEUE_REGISTRY));

export function isWorkloadClass(value: string): value is WorkloadClass {
  return (WORKLOAD_CLASSES as readonly string[]).includes(value);
}

export function queueFor(workloadClass: WorkloadClass): QueueDefinition {
  return QUEUE_REGISTRY[workloadClass];
}
