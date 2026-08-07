/**
 * Sync cursor + reconciliation tests (task T034).
 *
 * Reconciliation diff (@fixmyfeed/connectors) and cursor advancement + schema
 * (@fixmyfeed/database) are pure — no network, no database.
 *
 * Traceability: docs/04-system-architecture/consistency-and-reconciliation.md,
 * docs/07-data-architecture/data-reconciliation.md,
 * docs/07-data-architecture/tables/stores-and-integrations/connector-sync-cursors.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { reconcile } from "../packages/connectors/dist/index.js";
import {
  SYNC_CURSOR_MODELS,
  SYNC_CURSOR_STATUSES,
  SyncCursorError,
  SYNC_CURSOR_ERROR_CODE,
  advanceCursor,
  needsFullSync,
  connectorSyncCursors,
} from "../packages/database/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");

// ---------------------------------------------------------------------------
// reconciliation.ts (connectors)
// ---------------------------------------------------------------------------

test("reconcile: classifies added / updated / removed / unchanged", () => {
  const local = [
    { id: "a", v: "1" },
    { id: "b", v: "1" },
    { id: "c", v: "1" }, // will be removed (absent remotely)
  ];
  const remote = [
    { id: "a", v: "1" }, // unchanged
    { id: "b", v: "2" }, // updated (fingerprint differs)
    { id: "d", v: "1" }, // added
  ];
  const opts = {
    keyOfLocal: (x) => x.id,
    keyOfRemote: (x) => x.id,
    fingerprintOfLocal: (x) => x.v,
    fingerprintOfRemote: (x) => x.v,
  };
  const r = reconcile(local, remote, opts);
  assert.deepEqual(
    r.added.map((x) => x.id),
    ["d"],
  );
  assert.deepEqual(
    r.updated.map((x) => x.id),
    ["b"],
  );
  assert.deepEqual(
    r.removed.map((x) => x.id),
    ["c"],
  );
  assert.deepEqual(
    r.unchanged.map((x) => x.id),
    ["a"],
  );
  assert.deepEqual(r.summary, { added: 1, updated: 1, removed: 1, unchanged: 1, total: 4 });
});

test("reconcile: empty local -> all added; empty remote -> all removed", () => {
  const opts = {
    keyOfLocal: (x) => x.id,
    keyOfRemote: (x) => x.id,
    fingerprintOfLocal: (x) => x.v,
    fingerprintOfRemote: (x) => x.v,
  };
  const remote = [
    { id: "a", v: "1" },
    { id: "b", v: "1" },
  ];
  const local = [{ id: "x", v: "1" }];
  assert.equal(reconcile([], remote, opts).summary.added, 2);
  assert.equal(reconcile(local, [], opts).summary.removed, 1);
  assert.deepEqual(reconcile([], [], opts).summary, {
    added: 0,
    updated: 0,
    removed: 0,
    unchanged: 0,
    total: 0,
  });
});

// ---------------------------------------------------------------------------
// connector-sync-cursor.ts (database)
// ---------------------------------------------------------------------------

test("advanceCursor: timestamp is monotonic (rejects regression)", () => {
  assert.equal(
    advanceCursor("timestamp", null, "2026-08-07T00:00:00Z"),
    "2026-08-07T00:00:00.000Z",
  );
  assert.equal(
    advanceCursor("timestamp", "2026-08-07T00:00:00Z", "2026-08-07T01:00:00Z"),
    "2026-08-07T01:00:00.000Z",
  );
  // equal is allowed (idempotent re-sync)
  assert.equal(
    advanceCursor("timestamp", "2026-08-07T01:00:00Z", "2026-08-07T01:00:00Z"),
    "2026-08-07T01:00:00.000Z",
  );
  // backwards throws REGRESSION
  assert.throws(
    () => advanceCursor("timestamp", "2026-08-07T01:00:00Z", "2026-08-07T00:00:00Z"),
    (e) => e instanceof SyncCursorError && e.code === SYNC_CURSOR_ERROR_CODE.REGRESSION,
  );
  assert.throws(
    () => advanceCursor("timestamp", null, "not-a-date"),
    (e) => e instanceof SyncCursorError && e.code === SYNC_CURSOR_ERROR_CODE.INVALID_INPUT,
  );
});

test("advanceCursor: opaque/page replace, none is always null, candidate required", () => {
  assert.equal(advanceCursor("opaque", "tok1", "tok2"), "tok2");
  assert.equal(advanceCursor("page", "5", "6"), "6");
  assert.equal(advanceCursor("none", "anything", "x"), null);
  assert.throws(() => advanceCursor("opaque", "tok1", ""), SyncCursorError);
  assert.throws(() => advanceCursor("bogus", null, "x"), SyncCursorError);
  assert.deepEqual(SYNC_CURSOR_MODELS, ["none", "timestamp", "opaque", "page"]);
  assert.deepEqual(SYNC_CURSOR_STATUSES, ["idle", "running", "error"]);
});

test("needsFullSync: true until a cursor and a full sync exist", () => {
  assert.equal(needsFullSync(null, null), true);
  assert.equal(needsFullSync("tok", null), true);
  assert.equal(needsFullSync(null, new Date()), true);
  assert.equal(needsFullSync("tok", new Date()), false);
});

test("schema + migration: connector_sync_cursors shape and migration 0010", () => {
  const cfg = getTableConfig(connectorSyncCursors);
  assert.equal(cfg.name, "connector_sync_cursors");
  const cols = new Set(cfg.columns.map((c) => c.name));
  for (const c of [
    "connector_id",
    "object_type",
    "cursor_model",
    "cursor_value",
    "status",
    "last_synced_at",
  ]) {
    assert.ok(cols.has(c), `connector_sync_cursors missing ${c}`);
  }
  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0010_t034_connector_sync_cursors.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "connector_sync_cursors"/);
  assert.match(sql, /connector_sync_cursors_org_connector_object_unique/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[10].tag, "0010_t034_connector_sync_cursors");
});
