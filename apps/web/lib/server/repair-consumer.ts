/**
 * Repair outbox consumer (task T159) — server-only.
 *
 * Drains pending `repair.execute` outbox events and runs the durable repair
 * workers, re-reading authoritative state from the execution id the job carries
 * (never a serialized plan). An `apply` execution runs the writeback then
 * verification (the only place that reports "verified"); a `rollback` execution
 * reverses the source's verified items. Idempotent per event (dedup key), with
 * bounded retries — a persistent failure is dead-lettered, never dropped.
 *
 * The concrete factory wires the real catalog-writeback transport and the
 * connector-backed observe port; production swaps a connector HTTP transport.
 * The dispatch logic is injected (unit-tested); the whole chain is exercised
 * against real Postgres in `tools/repair-e2e.mjs`.
 */
import { outboxEvents, repairExecutions, type DatabaseClient } from "@fixmyfeed/database";
import { and, asc, eq } from "drizzle-orm";
import {
  runRepairExecution,
  runRepairRollback,
  runRepairVerification,
  type AuditSink,
  type ObservePort,
} from "./repair-ops";
import type { AppConfig } from "@fixmyfeed/config";
import {
  createAuditSink,
  createCatalogWritebackPort,
  createObservePort,
  createRollbackWorkerRepository,
  createVerificationWorkerRepository,
  createWorkerRepository,
} from "./adapters/repair-ops-adapters";
import {
  getActiveShopifyConnection,
  withShopifyAdminClient,
} from "./adapters/shopify-client-adapter";
import {
  createRefusingWritebackPort,
  createShopifyWritebackPort,
  resolveWritebackEligibility,
} from "./adapters/shopify-writeback-adapter";
import { createShopifyObservePort } from "./adapters/shopify-observe-adapter";
import { evaluateDestructiveBoundary, isExecutionPlanApproved } from "./adapters/writeback-guard";
import { withBoundedRetry } from "./adapters/writeback-failures";
import type { WritebackPort } from "@fixmyfeed/repairs";

const REPAIR_EXECUTE_EVENT = "repair.execute";
const DEFAULT_MAX_ATTEMPTS = 8;
const DEFAULT_BATCH = 50;

export interface RepairOutboxEvent {
  readonly eventId: string;
  readonly organizationId: string;
  readonly executionId: string;
  readonly principalUserId: string;
  readonly attemptCount: number;
}

/** Reads/updates pending repair-execution outbox events and execution kind. */
export interface RepairOutboxStore {
  fetchPending(limit: number): Promise<readonly RepairOutboxEvent[]>;
  markPublished(eventId: string): Promise<void>;
  markFailed(eventId: string, attemptCount: number, dead: boolean): Promise<void>;
  getExecutionKind(executionId: string): Promise<"apply" | "rollback" | null>;
}

/** Runs the durable worker for one execution (apply→verify, or rollback). */
export interface RepairWorkerPorts {
  runApply(event: RepairOutboxEvent): Promise<void>;
  runRollback(event: RepairOutboxEvent): Promise<void>;
}

export interface RepairConsumerOptions {
  readonly batchSize?: number;
  readonly maxAttempts?: number;
}

export interface RepairConsumerResult {
  readonly processed: number;
  readonly retried: number;
  readonly deadLettered: number;
}

/**
 * Processes one batch of pending repair-execution events. For each event it
 * dispatches to the worker by execution kind, then marks the event published; a
 * throw increments the attempt count and retries until `maxAttempts`, after which
 * the event is dead-lettered.
 */
export async function runRepairOutboxOnce(
  store: RepairOutboxStore,
  ports: RepairWorkerPorts,
  options: RepairConsumerOptions = {},
): Promise<RepairConsumerResult> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const events = await store.fetchPending(options.batchSize ?? DEFAULT_BATCH);
  let processed = 0;
  let retried = 0;
  let deadLettered = 0;

  for (const event of events) {
    try {
      const kind = await store.getExecutionKind(event.executionId);
      if (kind === "apply") await ports.runApply(event);
      else if (kind === "rollback") await ports.runRollback(event);
      // kind === null → execution already finalized/missing; nothing to run.
      await store.markPublished(event.eventId);
      processed += 1;
    } catch {
      const attempt = event.attemptCount + 1;
      const dead = attempt >= maxAttempts;
      await store.markFailed(event.eventId, attempt, dead);
      if (dead) deadLettered += 1;
      else retried += 1;
    }
  }

  return { processed, retried, deadLettered };
}

/** Drizzle-backed store over `outbox_events` + `repair_executions`. */
export function createRepairOutboxStore(client: DatabaseClient): RepairOutboxStore {
  const db = client.db;
  return {
    async fetchPending(limit) {
      const rows = await db
        .select({
          eventId: outboxEvents.id,
          organizationId: outboxEvents.organizationId,
          payload: outboxEvents.payload,
          attemptCount: outboxEvents.attemptCount,
        })
        .from(outboxEvents)
        .where(
          and(eq(outboxEvents.status, "pending"), eq(outboxEvents.eventType, REPAIR_EXECUTE_EVENT)),
        )
        .orderBy(asc(outboxEvents.occurredAt))
        .limit(limit);
      return rows.flatMap((r) => {
        const payload = (r.payload ?? {}) as {
          executionId?: string;
          principalUserId?: string;
        };
        if (!r.organizationId || !payload.executionId) return [];
        return [
          {
            eventId: r.eventId,
            organizationId: r.organizationId,
            executionId: payload.executionId,
            principalUserId: payload.principalUserId ?? "system",
            attemptCount: r.attemptCount,
          },
        ];
      });
    },
    async markPublished(eventId) {
      await db
        .update(outboxEvents)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(outboxEvents.id, eventId));
    },
    async markFailed(eventId, attemptCount, dead) {
      await db
        .update(outboxEvents)
        .set({ status: dead ? "dead" : "pending", attemptCount })
        .where(eq(outboxEvents.id, eventId));
    },
    async getExecutionKind(executionId) {
      const [row] = await db
        .select({ kind: repairExecutions.kind })
        .from(repairExecutions)
        .where(eq(repairExecutions.id, executionId))
        .limit(1);
      return row?.kind ?? null;
    },
  };
}

/**
 * Real worker ports. When the org has an active Shopify connection, destructive
 * work runs against the live Shopify Admin API (T161) — gated by the server-side
 * writeback safety mode — and verification re-reads Shopify directly (T162,
 * fresh read; success is never verification). Without a connection it uses the
 * catalog-store transport (the T159 path, used by CI/dev).
 */
export function createRepairWorkerPorts(
  client: DatabaseClient,
  config: AppConfig,
  audit: AuditSink = createAuditSink(client),
): RepairWorkerPorts {
  async function runApplyWith(
    event: RepairOutboxEvent,
    writeback: WritebackPort,
    observe: ObservePort,
  ): Promise<void> {
    await runRepairExecution(
      event.executionId,
      createWorkerRepository(client),
      writeback,
      audit,
      event.principalUserId,
    );
    await runRepairVerification(
      event.executionId,
      createVerificationWorkerRepository(client),
      observe,
      audit,
      event.principalUserId,
    );
  }
  async function runRollbackWith(
    event: RepairOutboxEvent,
    writeback: WritebackPort,
  ): Promise<void> {
    await runRepairRollback(
      event.executionId,
      createRollbackWorkerRepository(client),
      writeback,
      audit,
      event.principalUserId,
    );
  }

  async function withTransport(
    event: RepairOutboxEvent,
    run: (writeback: WritebackPort, observe: ObservePort) => Promise<void>,
  ): Promise<void> {
    const connection = await getActiveShopifyConnection(client, event.organizationId);
    if (connection === null) {
      // No live connection: catalog-store transport + catalog observe (T159).
      await run(
        createCatalogWritebackPort(client, event.organizationId),
        createObservePort(client, event.organizationId),
      );
      return;
    }
    await withShopifyAdminClient(client, config, event.organizationId, async (admin, ctx) => {
      // Final destructive boundary: re-check safety, capability, scope, approval
      // from authoritative state immediately before any live write (T163).
      const eligibility = await resolveWritebackEligibility(admin, ctx.shop, {
        mode: config.writeback.safetyMode,
        allowedShops: config.writeback.allowedShops,
      });
      const approvedPlan = await isExecutionPlanApproved(client, event.executionId);
      const decision = evaluateDestructiveBoundary({
        eligibility,
        scopes: ctx.scopes,
        approvedPlan,
      });
      const writeback = decision.allowed
        ? withBoundedRetry(createShopifyWritebackPort(admin, { executionId: event.executionId }))
        : createRefusingWritebackPort(decision.reason);
      // Verification always re-reads Shopify directly (fresh read).
      await run(writeback, createShopifyObservePort(admin));
    });
  }

  return {
    runApply: (event) =>
      withTransport(event, (writeback, observe) => runApplyWith(event, writeback, observe)),
    runRollback: (event) => withTransport(event, (writeback) => runRollbackWith(event, writeback)),
  };
}

/** Convenience: process one batch with the concrete Drizzle store + real ports. */
export function createRepairConsumer(client: DatabaseClient, config: AppConfig) {
  const store = createRepairOutboxStore(client);
  const ports = createRepairWorkerPorts(client, config);
  return {
    runOnce: (options?: RepairConsumerOptions) => runRepairOutboxOnce(store, ports, options),
  };
}
