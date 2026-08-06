/**
 * pg-boss queues and worker runtime tests (task T021).
 *
 * Imports the built package. Pure Node.js — the runtime is exercised through a
 * fake pg-boss double, so no database is required.
 *
 * Traceability: job-and-workflow-architecture.md, asynchronous-communication.md,
 * reference-architecture.md (durable work, retries, dead-letter, checkpoints).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WORKLOAD_CLASSES,
  QUEUE_REGISTRY,
  ALL_QUEUES,
  queueFor,
  DEFAULT_RETRY_POLICY,
  classifyFailure,
  computeBackoffMs,
  shouldRetry,
  TransientJobError,
  JOB_ENVELOPE_SCHEMA_VERSION,
  createJobEnvelope,
  validateJobEnvelope,
  createWorkerRuntime,
  JobsError,
} from "../packages/jobs/dist/index.js";

test("queue registry: one queue per workload class, named and dead-lettered", () => {
  assert.equal(ALL_QUEUES.length, WORKLOAD_CLASSES.length);
  for (const cls of WORKLOAD_CLASSES) {
    const q = queueFor(cls);
    assert.equal(q.name, `workload.${cls}`);
    assert.equal(q.deadLetter, `workload.${cls}.dlq`);
    assert.ok(q.concurrency >= 1);
    assert.equal(q.workloadClass, cls);
  }
  // Queues are partitioned by workload, not by tenant.
  assert.ok(!ALL_QUEUES.some((q) => /tenant|org/.test(q.name)));
});

test("retry: only transient failures are retried, bounded by maxAttempts", () => {
  assert.equal(classifyFailure(new TransientJobError("net blip")), "transient");
  assert.equal(classifyFailure({ code: "ETIMEDOUT" }), "transient");
  assert.equal(classifyFailure({ status: 503 }), "transient");
  assert.equal(classifyFailure(new Error("request timeout")), "transient");
  assert.equal(classifyFailure(new Error("validation failed")), "permanent");

  assert.equal(shouldRetry(1, "transient", DEFAULT_RETRY_POLICY), true);
  assert.equal(
    shouldRetry(DEFAULT_RETRY_POLICY.maxAttempts, "transient", DEFAULT_RETRY_POLICY),
    false,
  );
  assert.equal(shouldRetry(1, "permanent", DEFAULT_RETRY_POLICY), false);
});

test("backoff: bounded exponential with jitter, never exceeds maxDelay", () => {
  const policy = { maxAttempts: 10, baseDelayMs: 1000, maxDelayMs: 8000, jitterRatio: 0.2 };
  // No jitter (rng=0.5 -> jitter term 0): pure exponential, capped.
  assert.equal(
    computeBackoffMs(1, policy, () => 0.5),
    1000,
  );
  assert.equal(
    computeBackoffMs(2, policy, () => 0.5),
    2000,
  );
  assert.equal(
    computeBackoffMs(3, policy, () => 0.5),
    4000,
  );
  assert.equal(
    computeBackoffMs(4, policy, () => 0.5),
    8000,
  );
  assert.equal(
    computeBackoffMs(9, policy, () => 0.5),
    8000,
  ); // capped
  // Jitter stays within [0, maxDelay].
  for (const r of [0, 0.25, 0.75, 1]) {
    const d = computeBackoffMs(3, policy, () => r);
    assert.ok(d >= 0 && d <= policy.maxDelayMs);
  }
});

const principal = { type: "system" };

test("envelope: created with schema version, id, and required correlation", () => {
  let n = 0;
  const env = createJobEnvelope(
    { tenantId: "org-1", principal, correlationId: "corr-1", payload: { storeId: "s1" } },
    () => `job-${++n}`,
  );
  assert.equal(env.schemaVersion, JOB_ENVELOPE_SCHEMA_VERSION);
  assert.equal(env.jobId, "job-1");
  assert.equal(env.tenantId, "org-1");
  assert.equal(env.operationId, null);
  assert.deepEqual(env.resources, []);
});

test("envelope: raw secrets in the payload are rejected at any depth", () => {
  const base = { tenantId: null, principal, correlationId: "c" };
  assert.throws(
    () => createJobEnvelope({ ...base, payload: { apiKey: "sk_live_x" } }),
    (e) => e instanceof JobsError && e.code === "JOBS_SECRET_IN_PAYLOAD",
  );
  assert.throws(
    () => createJobEnvelope({ ...base, payload: { nested: { password: "p" } } }),
    (e) => e.code === "JOBS_SECRET_IN_PAYLOAD",
  );
  assert.doesNotThrow(() => createJobEnvelope({ ...base, payload: { storeId: "s1", count: 3 } }));
});

test("envelope: validation rejects malformed envelopes", () => {
  assert.throws(
    () => validateJobEnvelope({ schemaVersion: 99 }),
    (e) => e.code === "JOBS_INVALID_ENVELOPE",
  );
  assert.throws(
    () =>
      validateJobEnvelope({
        schemaVersion: 1,
        jobId: "j",
        tenantId: null,
        correlationId: "",
        operationId: null,
        resources: [],
        principal,
        payload: {},
      }),
    (e) => e.code === "JOBS_INVALID_ENVELOPE",
  );
});

/** A minimal pg-boss double capturing queues, workers, and sends. */
function fakeBoss() {
  return {
    started: false,
    stopped: false,
    queues: [],
    workers: new Map(),
    sent: [],
    async start() {
      this.started = true;
    },
    async stop() {
      this.stopped = true;
    },
    async createQueue(name) {
      this.queues.push(name);
    },
    async work(name, _options, handler) {
      this.workers.set(name, handler);
      return `worker-${name}`;
    },
    async send(name, data) {
      this.sent.push({ name, data });
      return "sent-id";
    },
  };
}

test("runtime: requires a database url and rejects unknown queues", () => {
  assert.throws(
    () => createWorkerRuntime({ databaseUrl: "" }),
    (e) => e instanceof JobsError,
  );
  const rt = createWorkerRuntime({ databaseUrl: "postgres://x/db", bossFactory: fakeBoss });
  assert.throws(
    () =>
      rt.register(
        {
          name: "workload.unknown",
          deadLetter: "x",
          retry: DEFAULT_RETRY_POLICY,
          concurrency: 1,
          workloadClass: "import",
        },
        async () => {},
      ),
    (e) => e.code === "JOBS_UNKNOWN_QUEUE",
  );
});

test("runtime: start wires each registered queue + its dead-letter with pg-boss", async () => {
  const boss = fakeBoss();
  const rt = createWorkerRuntime({ databaseUrl: "postgres://x/db", bossFactory: () => boss });
  rt.register(QUEUE_REGISTRY.diagnostics, async () => {});
  await rt.start();
  assert.equal(boss.started, true);
  assert.ok(boss.queues.includes("workload.diagnostics"));
  assert.ok(boss.queues.includes("workload.diagnostics.dlq"));
  assert.ok(boss.workers.has("workload.diagnostics"));
  await rt.stop();
  assert.equal(boss.stopped, true);
});

test("runtime: transient handler failures rethrow (pg-boss retries); permanent ones dead-letter", async () => {
  const boss = fakeBoss();
  let mode = "ok";
  const rt = createWorkerRuntime({ databaseUrl: "postgres://x/db", bossFactory: () => boss });
  rt.register(QUEUE_REGISTRY.import, async () => {
    if (mode === "transient") throw new TransientJobError("blip");
    if (mode === "permanent") throw new Error("bad input");
  });
  await rt.start();
  const worker = boss.workers.get("workload.import");

  const env = createJobEnvelope({
    tenantId: "org-1",
    principal,
    correlationId: "c",
    payload: { x: 1 },
  });
  const job = { id: env.jobId, data: env };

  mode = "ok";
  await assert.doesNotReject(() => worker([job]));

  mode = "transient";
  await assert.rejects(() => worker([job]), /blip/);
  assert.equal(
    boss.sent.length,
    0,
    "transient failures are retried by pg-boss, not dead-lettered here",
  );

  mode = "permanent";
  await assert.doesNotReject(() => worker([job]));
  assert.equal(boss.sent.length, 1);
  assert.equal(boss.sent[0].name, "workload.import.dlq");
});
