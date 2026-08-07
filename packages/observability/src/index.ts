/**
 * @fixmyfeed/observability
 *
 * Structured logging, metrics, tracing, and correlation primitives with
 * sensitive-value redaction (task T026). OpenTelemetry-compatible concepts with
 * no paid telemetry backend (ADR-049): a correlation id and W3C trace/span ids
 * tie together logs, metrics, spans, and audit events for one unit of work, and
 * every attribute bag is redacted before emission.
 *
 * Layer-0 pure package: no internal or third-party runtime dependencies beyond
 * Node built-ins (see /boundaries.json).
 */
export const workspaceName = "@fixmyfeed/observability" as const;
export const workspaceKind = "package" as const;

export {
  createCorrelationContext,
  childCorrelationContext,
  parseTraceparent,
  formatTraceparent,
  contextFromTraceparent,
} from "./correlation.js";
export type { CorrelationContext, CorrelationGenerators, Traceparent } from "./correlation.js";

export {
  REDACTED_PLACEHOLDER,
  DEFAULT_REDACTED_KEYS,
  isSensitiveKey,
  redact,
  redactAttributes,
} from "./redaction.js";
export type { RedactionOptions } from "./redaction.js";

export { LOG_LEVELS, consoleSink, createLogger } from "./logger.js";
export type { LogLevel, LogRecord, LogSink, Logger, LoggerOptions } from "./logger.js";

export { METRIC_KINDS, SPAN_STATUSES, createTelemetry } from "./telemetry.js";
export type {
  MetricKind,
  MetricRecord,
  MetricInput,
  SpanStatus,
  SpanRecord,
  Span,
  Telemetry,
  TelemetrySink,
  TelemetryOptions,
} from "./telemetry.js";
