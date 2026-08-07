/**
 * Structured logging (task T026).
 *
 * Emits provider-neutral, OpenTelemetry-compatible structured log records
 * (severity + message + correlation fields + attributes) to an injected sink,
 * so no logging backend or paid telemetry is required (ADR-049). Attributes are
 * redacted before emission; records below the configured level are dropped.
 *
 * Pure given an injected sink and clock — the default sink writes JSON lines to
 * the console.
 */
import type { CorrelationContext } from "./correlation.js";
import { redactAttributes, type RedactionOptions } from "./redaction.js";

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** OpenTelemetry severity numbers for each level. */
const LEVEL_SEVERITY: Record<LogLevel, number> = { debug: 5, info: 9, warn: 13, error: 17 };

/** A single structured log record. */
export interface LogRecord {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly severityNumber: number;
  readonly message: string;
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly organizationId?: string;
  readonly actorId?: string;
  readonly attributes: Record<string, unknown>;
}

/** Where records are emitted. Implementations must not throw. */
export interface LogSink {
  write(record: LogRecord): void;
}

/** Default sink: one JSON object per line via the matching console method. */
export const consoleSink: LogSink = {
  write(record: LogRecord): void {
    const line = JSON.stringify(record);

    const method =
      record.level === "warn"
        ? console.warn
        : record.level === "error"
          ? console.error
          : console.log;
    method(line);
  },
};

export interface Logger {
  debug(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, attributes?: Record<string, unknown>): void;
  /** Returns a logger that merges `context` into every record it emits. */
  withContext(context: Partial<CorrelationContext>): Logger;
}

export interface LoggerOptions {
  /** Minimum level to emit. Records below this are dropped. Default "info". */
  readonly level?: LogLevel;
  readonly sink?: LogSink;
  readonly context?: Partial<CorrelationContext>;
  readonly redaction?: RedactionOptions;
  readonly now?: () => Date;
}

/** Builds a structured logger. */
export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? "info";
  const sink = options.sink ?? consoleSink;
  const now = options.now ?? (() => new Date());
  const threshold = LEVEL_SEVERITY[level];
  const context = options.context ?? {};

  const emit = (recordLevel: LogLevel, message: string, attributes?: Record<string, unknown>) => {
    if (LEVEL_SEVERITY[recordLevel] < threshold) return;
    const record: LogRecord = {
      timestamp: now().toISOString(),
      level: recordLevel,
      severityNumber: LEVEL_SEVERITY[recordLevel],
      message,
      correlationId: context.correlationId,
      traceId: context.traceId,
      spanId: context.spanId,
      organizationId: context.organizationId,
      actorId: context.actorId,
      attributes: redactAttributes(attributes, options.redaction),
    };
    sink.write(record);
  };

  return {
    debug: (message, attributes) => emit("debug", message, attributes),
    info: (message, attributes) => emit("info", message, attributes),
    warn: (message, attributes) => emit("warn", message, attributes),
    error: (message, attributes) => emit("error", message, attributes),
    withContext: (patch) =>
      createLogger({ ...options, level, sink, context: { ...context, ...patch } }),
  };
}
