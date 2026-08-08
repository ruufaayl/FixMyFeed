"use server";

/**
 * Repair-rules server actions (task T157).
 *
 * CRUD + enable/disable + dry-run simulation for auto-remediation rules, all
 * through the typed boundary (`rule:manage` enforced server-side for mutations).
 * Discriminated results; never throws to the client, never leaks infrastructure.
 */
import { revalidatePath } from "next/cache";
import { getServerContext, services } from "@/lib/server/runtime";
import { normalizeError, toErrorEnvelope, type AppErrorEnvelope } from "@/lib/server/errors";
import type { RuleDraftDTO, RuleSimulationDTO } from "@/lib/server/dto";

export type RuleResult =
  { readonly ok: true } | { readonly ok: false; readonly error: AppErrorEnvelope };

export type SimulationResult =
  | { readonly ok: true; readonly simulation: RuleSimulationDTO }
  | { readonly ok: false; readonly error: AppErrorEnvelope };

export async function createRule(draft: RuleDraftDTO): Promise<RuleResult> {
  try {
    const context = await getServerContext();
    await services().repairRules.create(context, draft);
    revalidatePath("/repairs/rules");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}

export async function updateRule(ruleId: string, draft: RuleDraftDTO): Promise<RuleResult> {
  try {
    const context = await getServerContext();
    await services().repairRules.update(context, ruleId, draft);
    revalidatePath("/repairs/rules");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}

export async function setRuleEnabled(ruleId: string, enabled: boolean): Promise<RuleResult> {
  try {
    const context = await getServerContext();
    await services().repairRules.setEnabled(context, ruleId, enabled);
    revalidatePath("/repairs/rules");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}

export async function removeRule(ruleId: string): Promise<RuleResult> {
  try {
    const context = await getServerContext();
    await services().repairRules.remove(context, ruleId);
    revalidatePath("/repairs/rules");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}

/** Dry-run the current rules against open issues; applies nothing. */
export async function runSimulation(): Promise<SimulationResult> {
  try {
    const context = await getServerContext();
    const simulation = await services().repairRules.simulate(context);
    return { ok: true, simulation };
  } catch (error) {
    return { ok: false, error: toErrorEnvelope(normalizeError(error)) };
  }
}
