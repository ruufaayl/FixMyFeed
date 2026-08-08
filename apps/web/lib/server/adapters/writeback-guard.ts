/**
 * Destructive-boundary re-enforcement (task T163) — server-only.
 *
 * Immediately before any live Shopify writeback, every safety condition is
 * re-checked from authoritative state (never trusted from the instruction or an
 * earlier step): the server-side safety-mode eligibility, the connector's
 * capability for product/variant writes, the OAuth connection's granted scopes,
 * and the plan's approval state re-read from the database. Deny-by-default — any
 * unmet condition swaps in a refusing writeback port with a stable reason. The
 * per-field allow-list and live conflict check remain enforced per item (T161).
 */
import { repairExecutions, repairPlans, type DatabaseClient } from "@fixmyfeed/database";
import { shopify } from "@fixmyfeed/connectors";
import { eq } from "drizzle-orm";
import type { WritebackEligibility } from "./shopify-writeback-adapter";

/** OAuth scope required to write products/variants back to Shopify. */
export const REQUIRED_WRITEBACK_SCOPE = "write_products";

/** Plan statuses under which a writeback/rollback execution may proceed. */
const APPROVED_PLAN_STATUSES = new Set([
  "approved",
  "executing",
  "completed",
  "partially_completed",
  "rolled_back",
]);

export interface DestructiveBoundaryInput {
  /** Result of the server-side writeback safety-mode gate. */
  readonly eligibility: WritebackEligibility;
  /** Scopes granted on the OAuth connection. */
  readonly scopes: readonly string[];
  /** Whether the execution's plan is in an approved state (re-read from the DB). */
  readonly approvedPlan: boolean;
}

export interface BoundaryDecision {
  readonly allowed: boolean;
  readonly reason: string;
}

/** Whether the Shopify connector contract permits product + variant writes. */
export function contractSupportsProductWriteback(): boolean {
  const objects = shopify.shopifyConnectorContract.objects;
  const canWrite = (type: string) =>
    objects.some((o) => o.type === type && o.scopes.includes("write"));
  return canWrite("product") && canWrite("variant");
}

/**
 * The final destructive-boundary decision. Order is deny-first: safety mode,
 * then connector capability, then granted scope, then approval state.
 */
export function evaluateDestructiveBoundary(input: DestructiveBoundaryInput): BoundaryDecision {
  if (!input.eligibility.allowed) return { allowed: false, reason: input.eligibility.reason };
  if (!contractSupportsProductWriteback()) {
    return { allowed: false, reason: "capability_unsupported" };
  }
  if (!input.scopes.includes(REQUIRED_WRITEBACK_SCOPE)) {
    return { allowed: false, reason: "missing_write_scope" };
  }
  if (!input.approvedPlan) return { allowed: false, reason: "plan_not_approved" };
  return { allowed: true, reason: "authorized" };
}

/**
 * Re-reads the execution's plan status from the database and reports whether it
 * is in an approved state — defense in depth so a tampered/stale queue entry can
 * never drive an unapproved writeback.
 */
export async function isExecutionPlanApproved(
  client: DatabaseClient,
  executionId: string,
): Promise<boolean> {
  const [row] = await client.db
    .select({ status: repairPlans.status })
    .from(repairExecutions)
    .innerJoin(repairPlans, eq(repairPlans.id, repairExecutions.planId))
    .where(eq(repairExecutions.id, executionId))
    .limit(1);
  return row ? APPROVED_PLAN_STATUSES.has(row.status) : false;
}
