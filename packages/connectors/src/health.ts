/**
 * Connector health model (task T033).
 *
 * Aggregates a connector's recent behavior and circuit state into a single
 * health status (`healthy` / `degraded` / `unhealthy`) that drives dashboards,
 * alerts, and gating decisions (connector-health-model.md). Pure and
 * deterministic — the caller supplies the observed signals.
 */
import type { CircuitState } from "./circuit-breaker.js";

export const CONNECTOR_HEALTH_STATUSES = ["healthy", "degraded", "unhealthy"] as const;
export type ConnectorHealthStatus = (typeof CONNECTOR_HEALTH_STATUSES)[number];

export interface ConnectorHealthSignals {
  /** Error rate over the recent window, 0..1. */
  readonly errorRate: number;
  /** Current circuit-breaker state. */
  readonly circuitState: CircuitState;
  /** Consecutive failures observed. */
  readonly consecutiveFailures: number;
}

export interface HealthThresholds {
  /** Error rate at/above which the connector is unhealthy. Default 0.5. */
  readonly unhealthyErrorRate?: number;
  /** Error rate at/above which the connector is degraded. Default 0.1. */
  readonly degradedErrorRate?: number;
  /** Consecutive failures at/above which the connector is degraded. Default 3. */
  readonly degradedConsecutiveFailures?: number;
}

/**
 * Derives the health status. An open circuit is unhealthy; a half-open circuit,
 * an elevated error rate, or a run of consecutive failures is degraded;
 * otherwise healthy. A very high error rate is unhealthy even with a closed
 * circuit.
 */
export function deriveConnectorHealth(
  signals: ConnectorHealthSignals,
  thresholds: HealthThresholds = {},
): ConnectorHealthStatus {
  const unhealthyErrorRate = thresholds.unhealthyErrorRate ?? 0.5;
  const degradedErrorRate = thresholds.degradedErrorRate ?? 0.1;
  const degradedConsecutiveFailures = thresholds.degradedConsecutiveFailures ?? 3;

  const errorRate = Number.isFinite(signals.errorRate) ? signals.errorRate : 0;

  if (signals.circuitState === "open" || errorRate >= unhealthyErrorRate) {
    return "unhealthy";
  }
  if (
    signals.circuitState === "half_open" ||
    errorRate >= degradedErrorRate ||
    signals.consecutiveFailures >= degradedConsecutiveFailures
  ) {
    return "degraded";
  }
  return "healthy";
}
