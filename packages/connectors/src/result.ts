/**
 * Canonical connector result envelope (task T030).
 *
 * Connector methods return a normalized `ConnectorResult` — either data or a
 * canonical `ConnectorError` — so provider SDK objects never escape the adapter
 * boundary and callers handle success/failure uniformly (connector-contract.md).
 *
 * Pure and deterministic.
 */
import type { ConnectorError } from "./errors.js";

export type ConnectorResult<T> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ConnectorError };

/** Wraps a successful value. */
export function ok<T>(data: T): ConnectorResult<T> {
  return { ok: true, data };
}

/** Wraps a canonical failure. */
export function fail<T = never>(error: ConnectorError): ConnectorResult<T> {
  return { ok: false, error };
}

/** Narrowing helper: true when the result is a success. */
export function isOk<T>(result: ConnectorResult<T>): result is { ok: true; data: T } {
  return result.ok;
}

/** Returns the data or throws the canonical error (use at boundaries that expect success). */
export function unwrap<T>(result: ConnectorResult<T>): T {
  if (result.ok) return result.data;
  throw result.error;
}
