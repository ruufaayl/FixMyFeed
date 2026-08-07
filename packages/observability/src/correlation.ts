/**
 * Correlation identifiers and context (task T026).
 *
 * OpenTelemetry-compatible without a paid telemetry backend (ADR-049): a trace
 * is a 16-byte trace id, a span is an 8-byte span id, and context propagates
 * across process boundaries via the W3C `traceparent` header. A correlation id
 * ties together all logs, metrics, spans, and audit events for one request.
 *
 * Pure and deterministic given injected id generators — no I/O, no ambient clock.
 */
import { randomBytes, randomUUID } from "node:crypto";

/** Cross-cutting context attached to every telemetry signal for one unit of work. */
export interface CorrelationContext {
  /** Human-facing request/operation id (also returned to clients). */
  readonly correlationId: string;
  /** 16-byte hex W3C trace id. */
  readonly traceId: string;
  /** 8-byte hex W3C span id of the current span. */
  readonly spanId: string;
  /** Parent span id, when this is a child span. */
  readonly parentSpanId?: string;
  /** Whether the trace is sampled (W3C flag). */
  readonly sampled: boolean;
  /** Tenant context, when known. */
  readonly organizationId?: string;
  /** Actor (user/service) context, when known. */
  readonly actorId?: string;
}

/** Injectable id generators (defaults use node:crypto). */
export interface CorrelationGenerators {
  readonly correlationId?: () => string;
  readonly traceId?: () => string;
  readonly spanId?: () => string;
}

const hex = (bytes: number) => () => randomBytes(bytes).toString("hex");
const defaultGenerators: Required<CorrelationGenerators> = {
  correlationId: () => randomUUID(),
  traceId: hex(16),
  spanId: hex(8),
};

const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/;
const SPAN_ID_PATTERN = /^[0-9a-f]{16}$/;
const ZERO_TRACE_ID = "0".repeat(32);
const ZERO_SPAN_ID = "0".repeat(16);

/** Creates a fresh root correlation context, overriding any provided fields. */
export function createCorrelationContext(
  overrides: Partial<CorrelationContext> = {},
  generators: CorrelationGenerators = {},
): CorrelationContext {
  const gen = { ...defaultGenerators, ...generators };
  return {
    correlationId: overrides.correlationId ?? gen.correlationId(),
    traceId: overrides.traceId ?? gen.traceId(),
    spanId: overrides.spanId ?? gen.spanId(),
    parentSpanId: overrides.parentSpanId,
    sampled: overrides.sampled ?? true,
    organizationId: overrides.organizationId,
    actorId: overrides.actorId,
  };
}

/**
 * Derives a child context: same trace/correlation/tenant, a new span id, and
 * the parent's span id recorded as `parentSpanId`.
 */
export function childCorrelationContext(
  parent: CorrelationContext,
  generators: CorrelationGenerators = {},
): CorrelationContext {
  const gen = { ...defaultGenerators, ...generators };
  return {
    ...parent,
    spanId: gen.spanId(),
    parentSpanId: parent.spanId,
  };
}

/** Parsed W3C traceparent fields. */
export interface Traceparent {
  readonly traceId: string;
  readonly spanId: string;
  readonly sampled: boolean;
}

/**
 * Parses a W3C `traceparent` header (`00-<32hex>-<16hex>-<2hex>`). Returns null
 * for any malformed or all-zero value (never throws — untrusted input).
 */
export function parseTraceparent(value: unknown): Traceparent | null {
  if (typeof value !== "string") return null;
  const parts = value.trim().split("-");
  if (parts.length !== 4) return null;
  const [version, traceId, spanId, flags] = parts;
  if (
    version === undefined ||
    traceId === undefined ||
    spanId === undefined ||
    flags === undefined
  ) {
    return null;
  }
  if (version !== "00") return null;
  if (!TRACE_ID_PATTERN.test(traceId) || traceId === ZERO_TRACE_ID) return null;
  if (!SPAN_ID_PATTERN.test(spanId) || spanId === ZERO_SPAN_ID) return null;
  if (!/^[0-9a-f]{2}$/.test(flags)) return null;
  return { traceId, spanId, sampled: (parseInt(flags, 16) & 0x01) === 0x01 };
}

/** Formats a context as a W3C `traceparent` header value. */
export function formatTraceparent(context: CorrelationContext): string {
  const flags = context.sampled ? "01" : "00";
  return `00-${context.traceId}-${context.spanId}-${flags}`;
}

/**
 * Continues a trace from an incoming `traceparent` (server side): a new span
 * under the propagated trace, or a fresh root context when the header is absent
 * or malformed.
 */
export function contextFromTraceparent(
  traceparent: unknown,
  overrides: Partial<CorrelationContext> = {},
  generators: CorrelationGenerators = {},
): CorrelationContext {
  const parsed = parseTraceparent(traceparent);
  if (parsed === null) return createCorrelationContext(overrides, generators);
  const gen = { ...defaultGenerators, ...generators };
  return {
    correlationId: overrides.correlationId ?? gen.correlationId(),
    traceId: parsed.traceId,
    spanId: overrides.spanId ?? gen.spanId(),
    parentSpanId: parsed.spanId,
    sampled: overrides.sampled ?? parsed.sampled,
    organizationId: overrides.organizationId,
    actorId: overrides.actorId,
  };
}
