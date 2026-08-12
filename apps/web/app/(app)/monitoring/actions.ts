"use server";

/**
 * Monitoring server action (task T158).
 *
 * Re-reads the live monitoring snapshot through the typed boundary for the
 * client's async refresh. Discriminated result; never throws to the client.
 */
import { getServerContext, services } from "@/lib/server/runtime";
import { normalizeError, toErrorEnvelope, type AppErrorEnvelope } from "@/lib/server/errors";
import type { MonitoringDTO } from "@/lib/server/dto";

export type MonitoringResult =
  | { readonly ok: true; readonly monitoring: MonitoringDTO }
  | { readonly ok: false; readonly error: AppErrorEnvelope };

export async function refreshMonitoring(): Promise<MonitoringResult> {
  try {
    const context = await getServerContext();
    const monitoring = await services().monitoring.getMonitoring(context, {});
    return { ok: true, monitoring };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}
