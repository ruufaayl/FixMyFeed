"use server";

/**
 * Reports server action (task T158).
 *
 * Produces the report CSV server-side through the typed boundary. Export is
 * permission-gated (`report:export`) inside the service. Discriminated result;
 * never throws to the client.
 */
import { getServerContext, services } from "@/lib/server/runtime";
import { normalizeError, toErrorEnvelope, type AppErrorEnvelope } from "@/lib/server/errors";

export type ExportResult =
  | { readonly ok: true; readonly csv: string }
  | { readonly ok: false; readonly error: AppErrorEnvelope };

export async function exportReportsCsv(): Promise<ExportResult> {
  try {
    const context = await getServerContext();
    const csv = await services().reports.exportCsv(context);
    return { ok: true, csv };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}
