/**
 * Transactional outbox / inbox tests (task T022).
 *
 * Imports the built database package. Pure Node.js — the relay and inbox run
 * over in-memory ports, so no database is required.
 *
 * Traceability: event-driven-architecture.md, asynchronous-communication.md,
 * platform-operations/outbox-events.md, inbox-events.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createOutboxEvent,
  createOutboxRelay,
  consumeOnce,
  OutboxError,
  OUTBOX_STATUSES,
  outboxEvents,
  inboxEvents,
} from "../packages/database/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");

let seq = 0;
const evt = (overrides = {}) =>
  createOutboxEvent(
    {
      organizationId: "org-1",
      eventType: "catalog.synced",
      aggregateType: "store",
      payload: { n: 1 },
      ...overrides,
    },
    () => `evt-${++seq}`,
    () => new Date("2026-08-06T00:00:00.000Z"),
  );

test("createOutboxEvent: builds a pending event and validates required fields", () => {
  const e = evt();
  assert.equal(e.status, "pending");
  assert.equal(e.attemptCount, 0);
  assert.equal(e.eventType, "catalog.synced");
  assert.throws(
    () => createOutboxEvent({ organizationId: null, eventType: "", aggregateType: "x" }),
    OutboxError,
  );
  assert.throws(
    () => createOutboxEvent({ organizationId: null, eventType: "x", aggregateType: "" }),
    OutboxError,
  );
  assert.deepEqual(OUTBOX_STATUSES, ["pending", "published", "failed", "dead"]);
});

/** In-memory outbox persistence + a controllable publisher. */
function harness({ failTimes = 0, maxAttempts = 3 } = {}) {
  const rows = [evt(), evt(), evt()].map((e) => ({ ...e }));
  const marks = { published: [], failed: [] };
  let remainingFailures = failTimes;
  const persistence = {
    async fetchPending(limit) {
      return rows.filter((r) => r.status === "pending").slice(0, limit);
    },
    async markPublished(id) {
      rows.find((r) => r.id === id).status = "published";
      marks.published.push(id);
    },
    async markFailed(id, attemptCount, dead) {
      const r = rows.find((x) => x.id === id);
      r.attemptCount = attemptCount;
      r.status = dead ? "dead" : "pending";
      marks.failed.push({ id, attemptCount, dead });
    },
  };
  const publisher = {
    async publish() {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw new Error("publish failed");
      }
    },
  };
  return { rows, marks, relay: createOutboxRelay({ persistence, publisher, maxAttempts }) };
}

test("relay: publishes all pending events and marks them published", async () => {
  const h = harness();
  const result = await h.relay.runOnce();
  assert.equal(result.published, 3);
  assert.equal(result.retried, 0);
  assert.ok(h.rows.every((r) => r.status === "published"));
});

test("relay: a publish failure schedules a retry (stays pending, attempt incremented)", async () => {
  const h = harness({ failTimes: 3, maxAttempts: 3 }); // fail all 3 this pass
  const result = await h.relay.runOnce();
  assert.equal(result.published, 0);
  assert.equal(result.retried, 3);
  assert.ok(h.rows.every((r) => r.status === "pending" && r.attemptCount === 1));
});

test("relay: an event is dead-lettered after maxAttempts, never dropped", async () => {
  const h = harness({ failTimes: 99, maxAttempts: 1 }); // one attempt allowed -> dead immediately
  const result = await h.relay.runOnce();
  assert.equal(result.deadLettered, 3);
  assert.ok(h.rows.every((r) => r.status === "dead"));
});

test("consumeOnce: idempotent — the handler runs only on first delivery", async () => {
  const consumed = new Set();
  const inbox = {
    async recordConsumed(eventId, consumer) {
      const key = `${consumer}:${eventId}`;
      if (consumed.has(key)) return false;
      consumed.add(key);
      return true;
    },
  };
  let runs = 0;
  const event = { id: "evt-x", organizationId: "org-1" };
  const first = await consumeOnce(inbox, event, "syncer", async () => void runs++);
  const second = await consumeOnce(inbox, event, "syncer", async () => void runs++);
  assert.equal(first.processed, true);
  assert.equal(second.processed, false);
  assert.equal(runs, 1);
});

test("schema: outbox_events and inbox_events have the expected shape", () => {
  const outbox = getTableConfig(outboxEvents);
  assert.equal(outbox.name, "outbox_events");
  const oc = new Set(outbox.columns.map((c) => c.name));
  for (const c of [
    "event_type",
    "aggregate_type",
    "status",
    "attempt_count",
    "occurred_at",
    "published_at",
  ]) {
    assert.ok(oc.has(c), `outbox_events missing ${c}`);
  }
  const inbox = getTableConfig(inboxEvents);
  assert.equal(inbox.name, "inbox_events");
  const ic = new Set(inbox.columns.map((c) => c.name));
  for (const c of ["event_id", "consumer", "consumed_at"]) {
    assert.ok(ic.has(c), `inbox_events missing ${c}`);
  }
});

test("migration 0006 creates the outbox/inbox tables and is recorded at its index", () => {
  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0006_t022_transactional_outbox.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "outbox_events"/);
  assert.match(sql, /CREATE TABLE "inbox_events"/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[6].tag, "0006_t022_transactional_outbox");
});
