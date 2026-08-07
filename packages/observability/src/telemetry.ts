/**
 * Metrics and spans (task T026).
 *
 * Minimal, OpenTelemetry-compatible metric and span records emitted to an
 * injected sink — no paid telemetry backend (ADR-049). Metrics cover the
 * operational signals the observability standard calls out (queue age,
 * throughput, error rate, retry count, upstream latency, …) as named counters,
 * gauges, and histograms. Spans carry the correlation trace/span ids so a unit
 * of work can be reconstructed end to end.
 *
 * Pure given an injected sink and clock. Attributes are redacted before emission.
 */
import {
  childCorrelationContext,
  createCorrelationContext,
  type CorrelationContext,
} from "./correlation.js";
import { redactAttributes, type RedactionOptions } from "./redaction.js";

export const METRIC_KINDS = ["counter", "gauge", "histogram"] as const;
export type MetricKind = (typeof METRIC_KINDS)[number];

export interface MetricRecord {
  readonly timestamp: string;
  readonly name: string;
  readonly kind: MetricKind;
  readonly value: number;
  readonly unit?: string;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly organizationId?: string;
  readonly attributes: Record<string, unknown>;
}

export const SPAN_STATUSES = ["ok", "error"] as const;
export type SpanStatus = (typeof SPAN_STATUSES)[number];

export interface SpanRecord {
  readonly name: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly durationMs: number;
  readonly status: SpanStatus;
  readonly correlationId?: string;
  readonly organizationId?: string;
  readonly attributes: Record<string, unknown>;
}

/** Sink for telemetry signals. Implementations must not throw. */
export interface TelemetrySink {
  recordMetric(record: MetricRecord): void;
  recordSpan(record: SpanRecord): void;
}

export interface MetricInput {
  readonly name: string;
  readonly kind: MetricKind;
  readonly value: number;
  readonly unit?: string;
  readonly attributes?: Record<string, unknown>;
}

export interface Span {
  /** The child context of this span (new span id under the same trace). */
  readonly context: CorrelationContext;
  /** Ends the span, emitting a SpanRecord to the sink. Idempotent. */
  end(outcome?: { status?: SpanStatus; attributes?: Record<string, unknown> }): void;
}

export interface Telemetry {
  recordMetric(input: MetricInput): void;
  /** Starts a child span under `context`; call `end()` to emit it. */
  startSpan(name: string, attributes?: Record<string, unknown>): Span;
}

export interface TelemetryOptions {
  readonly sink: TelemetrySink;
  readonly context?: CorrelationContext;
  readonly redaction?: RedactionOptions;
  readonly now?: () => Date;
}

function assertFiniteNumber(value: number, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number`);
  }
}

/** Builds a telemetry recorder bound to `context`, emitting to `sink`. */
export function createTelemetry(options: TelemetryOptions): Telemetry {
  const { sink } = options;
  const now = options.now ?? (() => new Date());
  const context = options.context;

  return {
    recordMetric(input: MetricInput): void {
      if (typeof input.name !== "string" || input.name.length === 0) {
        throw new TypeError("metric name is required");
      }
      if (!(METRIC_KINDS as readonly string[]).includes(input.kind)) {
        throw new TypeError(`unknown metric kind: ${input.kind}`);
      }
      assertFiniteNumber(input.value, "metric value");
      sink.recordMetric({
        timestamp: now().toISOString(),
        name: input.name,
        kind: input.kind,
        value: input.value,
        unit: input.unit,
        correlationId: context?.correlationId,
        traceId: context?.traceId,
        organizationId: context?.organizationId,
        attributes: redactAttributes(input.attributes, options.redaction),
      });
    },

    startSpan(name: string, attributes?: Record<string, unknown>): Span {
      if (typeof name !== "string" || name.length === 0) {
        throw new TypeError("span name is required");
      }
      const spanContext = context ? childCorrelationContext(context) : createCorrelationContext();
      const startTime = now();
      let ended = false;
      return {
        context: spanContext,
        end(outcome = {}): void {
          if (ended) return;
          ended = true;
          const endTime = now();
          sink.recordSpan({
            name,
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
            parentSpanId: spanContext.parentSpanId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            durationMs: endTime.getTime() - startTime.getTime(),
            status: outcome.status ?? "ok",
            correlationId: spanContext.correlationId,
            organizationId: spanContext.organizationId,
            attributes: redactAttributes(
              { ...attributes, ...outcome.attributes },
              options.redaction,
            ),
          });
        },
      };
    },
  };
}
