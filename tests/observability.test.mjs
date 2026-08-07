/**
 * Observability and correlation tests (task T026).
 *
 * Imports the built @fixmyfeed/observability package. Everything is pure over
 * injected sinks/clocks/id-generators — no telemetry backend required.
 *
 * Traceability: docs/25-architecture-decisions/ADR-049-opentelemetry-compatibility.md,
 * docs/20-devops-sre-and-platform-engineering/correlation-identifiers.md,
 * logging-standard.md, observability-standard.md, tracing-standard.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createCorrelationContext,
  childCorrelationContext,
  parseTraceparent,
  formatTraceparent,
  contextFromTraceparent,
  redact,
  isSensitiveKey,
  REDACTED_PLACEHOLDER,
  createLogger,
  LOG_LEVELS,
  createTelemetry,
  METRIC_KINDS,
} from "../packages/observability/dist/index.js";

const fixedGen = {
  correlationId: () => "corr-1",
  traceId: () => "0af7651916cd43dd8448eb211c80319c",
  spanId: () => "b7ad6b7169203331",
};
const at = (iso) => () => new Date(iso);

// ---------------------------------------------------------------------------
// correlation.ts
// ---------------------------------------------------------------------------

test("createCorrelationContext / child: fresh ids, child links to parent span", () => {
  const root = createCorrelationContext({ organizationId: "org-1" }, fixedGen);
  assert.equal(root.correlationId, "corr-1");
  assert.equal(root.traceId, "0af7651916cd43dd8448eb211c80319c");
  assert.equal(root.spanId, "b7ad6b7169203331");
  assert.equal(root.sampled, true);
  assert.equal(root.organizationId, "org-1");

  const child = childCorrelationContext(root, { spanId: () => "00f067aa0ba902b7" });
  assert.equal(child.traceId, root.traceId); // same trace
  assert.equal(child.parentSpanId, root.spanId); // links to parent
  assert.equal(child.spanId, "00f067aa0ba902b7");
  assert.equal(child.organizationId, "org-1"); // inherited
});

test("W3C traceparent: parse valid, reject malformed, round-trip format", () => {
  const tp = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";
  const parsed = parseTraceparent(tp);
  assert.equal(parsed.traceId, "0af7651916cd43dd8448eb211c80319c");
  assert.equal(parsed.spanId, "b7ad6b7169203331");
  assert.equal(parsed.sampled, true);

  for (const bad of [
    "",
    "not-a-traceparent",
    "01-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01", // bad version
    "00-" + "0".repeat(32) + "-b7ad6b7169203331-01", // all-zero trace
    "00-0af7651916cd43dd8448eb211c80319c-" + "0".repeat(16) + "-01", // all-zero span
    "00-xyz-b7ad6b7169203331-01",
    42,
    null,
  ]) {
    assert.equal(parseTraceparent(bad), null, `expected ${JSON.stringify(bad)} to be rejected`);
  }

  const ctx = createCorrelationContext({}, fixedGen);
  assert.equal(formatTraceparent(ctx), tp);
  assert.equal(formatTraceparent({ ...ctx, sampled: false }).endsWith("-00"), true);
});

test("contextFromTraceparent: continues a propagated trace or starts fresh", () => {
  const tp = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";
  const cont = contextFromTraceparent(tp, { organizationId: "org-9" }, fixedGen);
  assert.equal(cont.traceId, "0af7651916cd43dd8448eb211c80319c"); // propagated trace
  assert.equal(cont.parentSpanId, "b7ad6b7169203331"); // caller's span is our parent
  assert.equal(cont.organizationId, "org-9");
  // Absent/malformed header -> fresh root (no parent).
  const fresh = contextFromTraceparent(undefined, {}, fixedGen);
  assert.equal(fresh.parentSpanId, undefined);
});

// ---------------------------------------------------------------------------
// redaction.ts
// ---------------------------------------------------------------------------

test("redact: masks sensitive keys at any depth, case/separator-insensitive", () => {
  const input = {
    userId: "u1",
    password: "hunter2",
    nested: { API_KEY: "sk-123", note: "ok" },
    items: [{ refresh_token: "r" }, { fine: 1 }],
    tokens: [{ v: 1 }],
    when: new Date("2026-08-07T00:00:00Z"),
  };
  const out = redact(input);
  assert.equal(out.userId, "u1");
  assert.equal(out.password, REDACTED_PLACEHOLDER);
  assert.equal(out.nested.API_KEY, REDACTED_PLACEHOLDER);
  assert.equal(out.nested.note, "ok");
  assert.equal(out.items[0].refresh_token, REDACTED_PLACEHOLDER); // sensitive key inside array element
  assert.equal(out.items[1].fine, 1);
  // A container key that itself matches a sensitive fragment ("tokens" ⊇ "token")
  // is redacted wholesale — over-redaction is safer than a leak.
  assert.equal(out.tokens, REDACTED_PLACEHOLDER);
  assert.ok(out.when instanceof Date); // non-plain objects passed through
  // original not mutated
  assert.equal(input.password, "hunter2");
});

test("redact: cycle-safe and depth-bounded", () => {
  const a = { name: "a" };
  a.self = a;
  const out = redact(a);
  assert.equal(out.name, "a");
  assert.equal(out.self, "[CIRCULAR]");
  assert.ok(isSensitiveKey("clientSecret"));
  assert.equal(isSensitiveKey("displayName"), false);
});

// ---------------------------------------------------------------------------
// logger.ts
// ---------------------------------------------------------------------------

test("logger: level filtering, correlation binding, and attribute redaction", () => {
  const records = [];
  const sink = { write: (r) => records.push(r) };
  const context = createCorrelationContext({ organizationId: "org-1" }, fixedGen);
  const log = createLogger({ level: "info", sink, context, now: at("2026-08-07T00:00:00Z") });

  log.debug("dropped"); // below threshold
  log.info("hello", { password: "x", ok: 1 });
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.level, "info");
  assert.equal(r.message, "hello");
  assert.equal(r.timestamp, "2026-08-07T00:00:00.000Z");
  assert.equal(r.correlationId, "corr-1");
  assert.equal(r.traceId, "0af7651916cd43dd8448eb211c80319c");
  assert.equal(r.organizationId, "org-1");
  assert.equal(r.attributes.password, REDACTED_PLACEHOLDER);
  assert.equal(r.attributes.ok, 1);

  // withContext merges without mutating the original logger.
  const bound = log.withContext({ actorId: "user-7" });
  bound.error("boom");
  assert.equal(records[1].actorId, "user-7");
  assert.deepEqual(LOG_LEVELS, ["debug", "info", "warn", "error"]);
});

// ---------------------------------------------------------------------------
// telemetry.ts
// ---------------------------------------------------------------------------

test("telemetry: records metrics with correlation and redacted attributes", () => {
  const metrics = [];
  const spans = [];
  const sink = { recordMetric: (m) => metrics.push(m), recordSpan: (s) => spans.push(s) };
  const context = createCorrelationContext({ organizationId: "org-1" }, fixedGen);
  const tel = createTelemetry({ sink, context, now: at("2026-08-07T00:00:00Z") });

  tel.recordMetric({
    name: "queue.age",
    kind: "gauge",
    value: 12,
    unit: "s",
    attributes: { token: "x" },
  });
  assert.equal(metrics.length, 1);
  assert.equal(metrics[0].name, "queue.age");
  assert.equal(metrics[0].kind, "gauge");
  assert.equal(metrics[0].value, 12);
  assert.equal(metrics[0].correlationId, "corr-1");
  assert.equal(metrics[0].attributes.token, REDACTED_PLACEHOLDER);

  assert.throws(() => tel.recordMetric({ name: "", kind: "counter", value: 1 }), TypeError);
  assert.throws(() => tel.recordMetric({ name: "x", kind: "bogus", value: 1 }), TypeError);
  assert.throws(() => tel.recordMetric({ name: "x", kind: "counter", value: NaN }), TypeError);
  assert.deepEqual(METRIC_KINDS, ["counter", "gauge", "histogram"]);
});

test("telemetry: span emits a child-span record with duration and status", () => {
  const spans = [];
  const sink = { recordMetric: () => {}, recordSpan: (s) => spans.push(s) };
  const context = createCorrelationContext({}, fixedGen);
  let t = 0;
  const clock = () => new Date(1_000_000 + (t += 5)); // +5ms each call
  const tel = createTelemetry({ sink, context, now: clock });

  const span = tel.startSpan("db.query", { table: "operations" });
  assert.equal(span.context.traceId, context.traceId); // same trace
  assert.equal(span.context.parentSpanId, context.spanId); // child of root
  span.end({ status: "error", attributes: { secret: "s" } });
  span.end(); // idempotent
  assert.equal(spans.length, 1);
  assert.equal(spans[0].name, "db.query");
  assert.equal(spans[0].status, "error");
  assert.equal(spans[0].durationMs, 5);
  assert.equal(spans[0].attributes.table, "operations");
  assert.equal(spans[0].attributes.secret, REDACTED_PLACEHOLDER);
});
