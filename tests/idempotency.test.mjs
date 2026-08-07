/**
 * Idempotency-key and operation-resource tests (task T025).
 *
 * Imports the built database package. The logic is pure (no database needed);
 * the schema shape and migration are asserted from the built artifacts.
 *
 * Traceability: idempotency-strategy.md, api-idempotency.md,
 * api-asynchronous-operations.md, operations-api.md,
 * tables/platform-operations/idempotency-keys.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  // operations
  OPERATION_STATUSES,
  OperationError,
  OPERATION_ERROR_CODE,
  createOperation,
  transitionOperation,
  canTransitionOperation,
  isTerminalOperationStatus,
  operations,
  // idempotency
  IDEMPOTENCY_STATUSES,
  IdempotencyError,
  IDEMPOTENCY_ERROR_CODE,
  computeRequestFingerprint,
  createIdempotencyRecord,
  decideIdempotency,
  completeIdempotencyRecord,
  idempotencyKeys,
} from "../packages/database/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");

const at = (iso) => () => new Date(iso);
let seq = 0;
const genId = () => `id-${++seq}`;

// ---------------------------------------------------------------------------
// operations.ts — lifecycle
// ---------------------------------------------------------------------------

test("createOperation: builds a queued operation and validates required fields", () => {
  const op = createOperation({ organizationId: "org-1", operationType: "feed.sync" }, genId);
  assert.equal(op.status, "queued");
  assert.equal(op.progress, null);
  assert.equal(op.version, 1);
  assert.equal(op.startedAt, null);
  assert.throws(
    () => createOperation({ organizationId: "", operationType: "x" }, genId),
    (e) => e instanceof OperationError && e.code === OPERATION_ERROR_CODE.INVALID_OPERATION,
  );
  assert.throws(
    () => createOperation({ organizationId: "org-1", operationType: "" }, genId),
    OperationError,
  );
  assert.deepEqual(OPERATION_STATUSES.slice(0, 4), ["queued", "running", "retrying", "blocked"]);
});

test("transitionOperation: stamps startedAt/completedAt and bumps version", () => {
  const op = createOperation({ organizationId: "org-1", operationType: "feed.sync" }, genId);
  const running = transitionOperation(
    op,
    { status: "running", progress: 10 },
    at("2026-08-07T00:00:00Z"),
  );
  assert.equal(running.status, "running");
  assert.equal(running.progress, 10);
  assert.equal(running.version, 2);
  assert.deepEqual(running.startedAt, new Date("2026-08-07T00:00:00Z"));
  assert.equal(running.completedAt, null);

  const done = transitionOperation(
    running,
    { status: "completed", result: { ok: true } },
    at("2026-08-07T01:00:00Z"),
  );
  assert.equal(done.status, "completed");
  assert.deepEqual(done.completedAt, new Date("2026-08-07T01:00:00Z"));
  assert.deepEqual(done.result, { ok: true });
  assert.equal(done.startedAt.toISOString(), "2026-08-07T00:00:00.000Z"); // preserved
});

test("transitionOperation: rejects illegal transitions and out-of-terminal moves", () => {
  const op = createOperation({ organizationId: "org-1", operationType: "t" }, genId);
  // queued -> completed is not allowed (must run first).
  assert.throws(
    () => transitionOperation(op, { status: "completed" }),
    (e) => e instanceof OperationError && e.code === OPERATION_ERROR_CODE.INVALID_TRANSITION,
  );
  const failed = transitionOperation(transitionOperation(op, { status: "running" }), {
    status: "failed",
  });
  assert.ok(isTerminalOperationStatus("failed"));
  assert.equal(canTransitionOperation("failed", "running"), false);
  assert.throws(() => transitionOperation(failed, { status: "running" }), OperationError);
});

test("transitionOperation: rejects out-of-range progress", () => {
  const op = transitionOperation(
    createOperation({ organizationId: "org-1", operationType: "t" }, genId),
    { status: "running" },
  );
  assert.throws(
    () => transitionOperation(op, { status: "running", progress: 150 }),
    (e) => e instanceof OperationError,
  );
});

// ---------------------------------------------------------------------------
// idempotency.ts — fingerprint + decision
// ---------------------------------------------------------------------------

test("computeRequestFingerprint: deterministic and order-independent, distinguishes bodies", () => {
  const a = computeRequestFingerprint({ method: "post", path: "/v1/x", body: { a: 1, b: 2 } });
  const b = computeRequestFingerprint({ method: "POST", path: "/v1/x", body: { b: 2, a: 1 } });
  assert.equal(a, b); // case-normalized method + key-order-independent body
  const c = computeRequestFingerprint({ method: "POST", path: "/v1/x", body: { a: 1, b: 3 } });
  assert.notEqual(a, c);
  assert.throws(() => computeRequestFingerprint({ method: "", path: "/x" }), IdempotencyError);
});

test("createIdempotencyRecord: pending row with fingerprint and TTL expiry", () => {
  const rec = createIdempotencyRecord(
    {
      organizationId: "org-1",
      idempotencyKey: "k1",
      request: { method: "POST", path: "/v1/x", body: { a: 1 } },
    },
    genId,
    at("2026-08-07T00:00:00Z"),
    1000,
  );
  assert.equal(rec.status, "pending");
  assert.equal(rec.requestMethod, "POST");
  assert.equal(rec.expiresAt.toISOString(), "2026-08-07T00:00:01.000Z");
  assert.equal(rec.requestFingerprint.length, 64); // sha256 hex
  assert.deepEqual(IDEMPOTENCY_STATUSES, ["pending", "completed"]);
});

test("decideIdempotency: proceed / replay / in_progress / conflict / expired", () => {
  const request = { method: "POST", path: "/v1/x", body: { a: 1 } };
  const base = createIdempotencyRecord(
    { organizationId: "org-1", idempotencyKey: "k1", request },
    genId,
    at("2026-08-07T00:00:00Z"),
    10_000,
  );

  // No existing row -> proceed.
  assert.deepEqual(decideIdempotency(null, request, at("2026-08-07T00:00:01Z")), {
    action: "proceed",
  });

  // Pending + same fingerprint -> in_progress.
  const p = decideIdempotency(base, request, at("2026-08-07T00:00:01Z"));
  assert.equal(p.action, "in_progress");

  // Completed + same fingerprint -> replay stored response.
  const completed = { ...base, ...completeIdempotencyRecord(201, { id: "abc" }) };
  const r = decideIdempotency(completed, request, at("2026-08-07T00:00:02Z"));
  assert.equal(r.action, "replay");
  assert.equal(r.responseStatus, 201);
  assert.deepEqual(r.responseBody, { id: "abc" });

  // Same key, different request -> conflict.
  assert.throws(
    () =>
      decideIdempotency(
        base,
        { method: "POST", path: "/v1/x", body: { a: 2 } },
        at("2026-08-07T00:00:03Z"),
      ),
    (e) => e instanceof IdempotencyError && e.code === IDEMPOTENCY_ERROR_CODE.CONFLICT,
  );

  // Expired row -> proceed (key reusable after its window).
  assert.deepEqual(decideIdempotency(base, request, at("2026-08-07T05:00:00Z")), {
    action: "proceed",
  });
});

test("completeIdempotencyRecord: validates the HTTP status code", () => {
  assert.deepEqual(completeIdempotencyRecord(200, { ok: true }, "op-1"), {
    status: "completed",
    responseStatus: 200,
    responseBody: { ok: true },
    operationId: "op-1",
  });
  assert.throws(() => completeIdempotencyRecord(99, null), IdempotencyError);
  assert.throws(() => completeIdempotencyRecord(600, null), IdempotencyError);
});

// ---------------------------------------------------------------------------
// schema + migration
// ---------------------------------------------------------------------------

test("schema: operations and idempotency_keys have the expected shape", () => {
  const ops = getTableConfig(operations);
  assert.equal(ops.name, "operations");
  const oc = new Set(ops.columns.map((c) => c.name));
  for (const c of ["operation_type", "status", "progress", "started_at", "completed_at"]) {
    assert.ok(oc.has(c), `operations missing ${c}`);
  }
  const idem = getTableConfig(idempotencyKeys);
  assert.equal(idem.name, "idempotency_keys");
  const ic = new Set(idem.columns.map((c) => c.name));
  for (const c of [
    "idempotency_key",
    "request_fingerprint",
    "status",
    "operation_id",
    "expires_at",
  ]) {
    assert.ok(ic.has(c), `idempotency_keys missing ${c}`);
  }
});

test("migration 0007 creates the tables and is recorded at its index", () => {
  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0007_t025_idempotency_and_operations.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "operations"/);
  assert.match(sql, /CREATE TABLE "idempotency_keys"/);
  assert.match(sql, /idempotency_keys_org_key_unique/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[7].tag, "0007_t025_idempotency_and_operations");
});
