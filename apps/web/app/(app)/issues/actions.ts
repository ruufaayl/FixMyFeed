"use server";

/**
 * Issues server actions (task T153).
 *
 * Loads evidence for an issue group through the typed boundary. Returns a
 * discriminated result — never throws to the client, never leaks infrastructure.
 */
import { getServerContext, services } from "@/lib/server/runtime";
import { normalizeError, toErrorEnvelope, type AppErrorEnvelope } from "@/lib/server/errors";
import type { EvidenceDTO } from "@/lib/server/dto";

export type EvidenceResult =
  | { readonly ok: true; readonly data: EvidenceDTO }
  | { readonly ok: false; readonly error: AppErrorEnvelope };

export async function loadEvidence(issueGroupId: string): Promise<EvidenceResult> {
  try {
    const context = await getServerContext();
    const data = await services().issues.getEvidence(context, issueGroupId);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}
