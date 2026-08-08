#!/usr/bin/env node
/**
 * Repair loop end-to-end test (task T159) — run after `drizzle-kit migrate`
 * against a live PostgreSQL instance (CI Postgres service). Exercises the full
 * authenticated repair loop on real Postgres using the compiled repair domain
 * (@fixmyfeed/repairs) and the outbox as the durable queue:
 *
 *   seed catalog+product+approved plan → enqueue repair.execute (apply)
 *     → drain outbox → writeback to the catalog store → verify (observe re-read)
 *   → enqueue repair.execute (rollback) → drain → reverse verified items
 *
 * Asserts the applied change verifies and the rollback restores the prior value.
 * This mirrors the TypeScript workers (runRepairExecution / runRepairVerification
 * / runRepairRollback) which call the same pure domain functions; production
 * swaps the catalog-writeback transport for a connector HTTP transport.
 *
 * Requires DATABASE_URL. Uses the `postgres` driver declared by packages/database
 * and the compiled functions from packages/repairs.
 */
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const postgres = databaseRequire("postgres");
const {
  buildWritebackInstructions,
  executeWriteback,
  verifyExecution,
  buildRollbackInstructions,
  executeRollback,
} = await import("../packages/repairs/dist/index.js");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for the repair E2E test");

const sql = postgres(url, { max: 1, onnotice: () => {} });

const org = randomUUID();
const catalogId = randomUUID();
const externalId = `E2E-SKU-${randomUUID().slice(0, 8)}`;
const planId = randomUUID();
const proposer = randomUUID();

const change = {
  issueCode: "e2e_title",
  productExternalId: externalId,
  variantExternalId: null,
  field: "title",
  safetyClass: "automatic",
  riskLevel: "low",
  currentValue: "Old title",
  proposedValue: "New title",
  requiresInput: false,
};

/** WritebackPort that applies to the stored catalog product payload. */
const writebackPort = {
  async apply(instruction) {
    const [row] = await sql`
      select id, payload from catalog_products
      where organization_id = ${org} and external_id = ${instruction.productExternalId} limit 1`;
    if (!row) return { ok: false, error: "product_not_found" };
    const payload = { ...row.payload, [instruction.field]: instruction.after };
    await sql`update catalog_products set payload = ${sql.json(payload)} where id = ${row.id}`;
    return { ok: true, error: null };
  },
};

async function productTitle() {
  const [row] = await sql`
    select payload from catalog_products
    where organization_id = ${org} and external_id = ${externalId} limit 1`;
  return row?.payload?.title ?? null;
}

async function persistItems(executionId, items, finalStatusOf) {
  for (const item of items) {
    await sql`
      insert into repair_execution_items
        (id, organization_id, execution_id, product_external_id, variant_external_id,
         field, before_value, after_value, status, error)
      values (${randomUUID()}, ${org}, ${executionId}, ${item.instruction.productExternalId},
         ${item.instruction.variantExternalId}, ${item.instruction.field},
         ${item.instruction.before}, ${item.instruction.after},
         ${finalStatusOf(item)}, ${item.error ?? null})`;
  }
}

/** Enqueue a repair.execute outbox event and return the created execution id. */
async function enqueueExecution(kind, sourceExecutionId = null) {
  const executionId = randomUUID();
  await sql`
    insert into repair_executions
      (id, organization_id, plan_id, kind, source_execution_id, status, total_items)
    values (${executionId}, ${org}, ${planId}, ${kind}, ${sourceExecutionId}, 'queued', 0)`;
  await sql`
    insert into outbox_events
      (id, organization_id, event_type, aggregate_type, aggregate_id, status, attempt_count,
       payload, occurred_at)
    values (${randomUUID()}, ${org}, 'repair.execute', 'repair_execution', ${executionId},
       'pending', 0, ${sql.json({ executionId, principalUserId: proposer })}, now())`;
  return executionId;
}

/** Drain pending repair.execute events, dispatching by execution kind. */
async function drainOutbox() {
  const events = await sql`
    select id, payload from outbox_events
    where status = 'pending' and event_type = 'repair.execute' order by occurred_at asc`;
  for (const event of events) {
    const executionId = event.payload.executionId;
    const [exec] = await sql`select kind from repair_executions where id = ${executionId} limit 1`;
    if (exec?.kind === "apply") await runApply(executionId);
    else if (exec?.kind === "rollback") await runRollback(executionId);
    await sql`update outbox_events set status = 'published', published_at = now() where id = ${event.id}`;
  }
}

async function runApply(executionId) {
  const [plan] = await sql`select change_set from repair_plans where id = ${planId} limit 1`;
  const instructions = buildWritebackInstructions(plan.change_set);
  const outcome = await executeWriteback(instructions, writebackPort);
  await persistItems(executionId, outcome.items, (i) => i.status);
  await sql`update repair_executions set status = ${outcome.status}, total_items = ${outcome.total},
    succeeded_items = ${outcome.succeeded}, failed_items = ${outcome.failed}, completed_at = now()
    where id = ${executionId}`;

  // Verification (T095): re-observe the written field from the catalog store.
  const observedTitle = await productTitle();
  const verification = verifyExecution(outcome, (i) =>
    i.field === "title" ? observedTitle : null,
  );
  for (const item of verification.items) {
    await sql`update repair_execution_items set status = ${item.status}, error = ${item.error}
      where execution_id = ${executionId} and product_external_id = ${item.instruction.productExternalId}
        and field = ${item.instruction.field}`;
  }
  await sql`update repair_executions set status = ${verification.status},
    succeeded_items = ${verification.verified}, failed_items = ${verification.failed}
    where id = ${executionId}`;
}

async function runRollback(executionId) {
  const [exec] =
    await sql`select source_execution_id from repair_executions where id = ${executionId} limit 1`;
  const verified = await sql`
    select product_external_id, variant_external_id, field, before_value, after_value, status
    from repair_execution_items where execution_id = ${exec.source_execution_id} and status = 'verified'`;
  const sources = verified.map((r) => ({
    productExternalId: r.product_external_id,
    variantExternalId: r.variant_external_id,
    field: r.field,
    beforeValue: r.before_value,
    afterValue: r.after_value,
    status: "verified",
  }));
  const instructions = buildRollbackInstructions(sources);
  const outcome = await executeRollback(instructions, writebackPort);
  await persistItems(executionId, outcome.items, (i) =>
    i.status === "succeeded" ? "rolled_back" : "failed",
  );
  await sql`update repair_executions set status = ${outcome.status}, total_items = ${outcome.total},
    succeeded_items = ${outcome.succeeded}, failed_items = ${outcome.failed}, completed_at = now()
    where id = ${executionId}`;
}

async function seed() {
  await sql`insert into catalogs (id, organization_id, connector_id, external_account_id, status)
    values (${catalogId}, ${org}, 'shopify', 'e2e-shop', 'active')`;
  await sql`insert into catalog_products
      (id, organization_id, catalog_id, external_id, fingerprint, payload)
    values (${randomUUID()}, ${org}, ${catalogId}, ${externalId}, 'fp-e2e',
      ${sql.json({ title: "Old title", variants: [] })})`;
  await sql`insert into repair_plans
      (id, organization_id, catalog_id, status, change_set, proposer_id, risk_level)
    values (${planId}, ${org}, ${catalogId}, 'approved', ${sql.json([change])}, ${proposer}, 'low')`;
}

async function main() {
  await seed();

  // 1. Apply + verify.
  const applyId = await enqueueExecution("apply");
  await drainOutbox();
  assert.equal(await productTitle(), "New title", "apply did not write the new value");
  const [appliedItem] = await sql`
    select status from repair_execution_items where execution_id = ${applyId} limit 1`;
  assert.equal(appliedItem.status, "verified", "applied change was not verified");

  // 2. Rollback restores the prior value.
  await enqueueExecution("rollback", applyId);
  await drainOutbox();
  assert.equal(await productTitle(), "Old title", "rollback did not restore the prior value");

  // 3. The outbox fully drained.
  const [{ count }] = await sql`
    select count(*)::int as count from outbox_events
    where organization_id = ${org} and status = 'pending'`;
  assert.equal(count, 0, "pending outbox events remain after draining");

  console.log(
    "Repair E2E passed: apply → verify → rollback ran through the outbox on real Postgres; " +
      "value written, verified, and restored.",
  );
}

try {
  await main();
} finally {
  await sql`delete from outbox_events where organization_id = ${org}`;
  await sql`delete from catalogs where organization_id = ${org}`; // cascades products/plans/executions/items
  await sql.end({ timeout: 5 });
}
