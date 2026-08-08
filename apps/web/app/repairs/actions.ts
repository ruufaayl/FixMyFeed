"use server";

/**
 * Repairs server actions (task T154).
 *
 * Applies an assisted value or a conflict resolution to a plan change through the
 * typed boundary, then revalidates the page. Discriminated result; never throws
 * to the client, never leaks infrastructure errors.
 */
import { revalidatePath } from "next/cache";
import { getServerContext, services } from "@/lib/server/runtime";
import { normalizeError, toErrorEnvelope, type AppErrorEnvelope } from "@/lib/server/errors";

export type ResolveResult =
  { readonly ok: true } | { readonly ok: false; readonly error: AppErrorEnvelope };

export async function resolveRepairChange(
  planId: string,
  productExternalId: string,
  field: string,
  value: string,
): Promise<ResolveResult> {
  try {
    const context = await getServerContext();
    await services().repairs.resolveChange(context, planId, { productExternalId, field }, value);
    revalidatePath("/repairs");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}

/** Approve or reject a plan (four-eyes enforced server-side). Never executes. */
export async function decidePlan(
  planId: string,
  decision: "approve" | "reject",
  note?: string,
): Promise<ResolveResult> {
  try {
    const context = await getServerContext();
    const governance = services().repairGovernance;
    if (decision === "approve") await governance.approve(context, planId, note);
    else await governance.reject(context, planId, note);
    revalidatePath("/repairs");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}

/** Request asynchronous writeback execution; returns a durable execution id. */
export async function requestExecution(
  planId: string,
  idempotencyKey: string,
): Promise<
  | { readonly ok: true; readonly executionId: string; readonly status: string }
  | { readonly ok: false; readonly error: AppErrorEnvelope }
> {
  try {
    const context = await getServerContext();
    const ref = await services().repairExecution.requestExecution(context, planId, idempotencyKey);
    revalidatePath("/repairs");
    return { ok: true, executionId: ref.executionId, status: ref.status };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}
