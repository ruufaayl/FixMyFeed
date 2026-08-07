/**
 * Webhook receipt verification + deduplication tests (task T032).
 *
 * HMAC verification (@fixmyfeed/connectors) and receipt dedup/lifecycle + schema
 * (@fixmyfeed/database) are pure — no network, no database.
 *
 * Traceability: docs/06-security-privacy-and-compliance/webhook-security.md,
 * docs/07-data-architecture/tables/stores-and-integrations/webhook-receipts.md,
 * docs/08-api-and-contracts/api-webhooks.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeWebhookSignature,
  verifyWebhookSignature,
  assertWebhookSignature,
  isWebhookTimestampFresh,
  ConnectorError,
} from "../packages/connectors/dist/index.js";
import {
  WEBHOOK_RECEIPT_STATUSES,
  WebhookReceiptError,
  createWebhookReceipt,
  decideWebhookReceipt,
  markWebhookReceipt,
  webhookReceipts,
} from "../packages/database/dist/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");
const at = (iso) => () => new Date(iso);

// ---------------------------------------------------------------------------
// webhook signature verification (connectors)
// ---------------------------------------------------------------------------

test("computeWebhookSignature + verify: base64 and hex, constant-time match", () => {
  const payload = '{"id":123,"topic":"orders/create"}';
  const secret = "shhh";
  const b64 = computeWebhookSignature({ payload, secret });
  assert.equal(b64, createHmac("sha256", secret).update(payload).digest("base64"));
  assert.equal(verifyWebhookSignature({ payload, secret, signature: b64 }), true);

  const hex = computeWebhookSignature({ payload, secret, encoding: "hex" });
  assert.equal(verifyWebhookSignature({ payload, secret, signature: hex, encoding: "hex" }), true);

  // tampered body / wrong secret / missing signature -> false (never throws)
  assert.equal(verifyWebhookSignature({ payload: payload + "x", secret, signature: b64 }), false);
  assert.equal(verifyWebhookSignature({ payload, secret: "nope", signature: b64 }), false);
  assert.equal(verifyWebhookSignature({ payload, secret, signature: "" }), false);
  assert.equal(verifyWebhookSignature({ payload, secret, signature: 42 }), false);
});

test("computeWebhookSignature: requires a secret; assert throws on mismatch", () => {
  assert.throws(
    () => computeWebhookSignature({ payload: "x", secret: "" }),
    (e) => e instanceof ConnectorError && e.category === "validation",
  );
  assert.throws(
    () => assertWebhookSignature({ payload: "x", secret: "s", signature: "bad" }),
    (e) => e instanceof ConnectorError && e.category === "authentication",
  );
  // Buffer payloads are accepted.
  const sig = computeWebhookSignature({ payload: Buffer.from("bytes"), secret: "s" });
  assert.equal(
    verifyWebhookSignature({ payload: Buffer.from("bytes"), secret: "s", signature: sig }),
    true,
  );
});

test("isWebhookTimestampFresh: rejects stale/replayed timestamps", () => {
  const now = at("2026-08-07T00:05:00Z");
  assert.equal(isWebhookTimestampFresh("2026-08-07T00:04:00Z", now), true); // 1 min old
  assert.equal(isWebhookTimestampFresh("2026-08-06T23:59:00Z", now), false); // 6 min stale (> tolerance)
  assert.equal(isWebhookTimestampFresh(Date.parse("2026-08-07T00:04:00Z") / 1000, now), true); // epoch seconds
  assert.equal(isWebhookTimestampFresh("not-a-date", now), false);
});

// ---------------------------------------------------------------------------
// webhook receipt dedup + lifecycle (database)
// ---------------------------------------------------------------------------

let seq = 0;
const genId = () => `wr-${++seq}`;
const receiptInput = (overrides = {}) => ({
  organizationId: "org-1",
  connectorId: "shopify",
  externalId: "evt-1",
  topic: "orders/create",
  signatureValid: true,
  ...overrides,
});

test("createWebhookReceipt: builds a received receipt and validates input", () => {
  const r = createWebhookReceipt(receiptInput(), genId, at("2026-08-07T00:00:00Z"));
  assert.equal(r.status, "received");
  assert.equal(r.processedAt, null);
  assert.equal(r.externalId, "evt-1");
  assert.deepEqual(WEBHOOK_RECEIPT_STATUSES, ["received", "processed", "failed", "duplicate"]);
  assert.throws(
    () => createWebhookReceipt(receiptInput({ externalId: "" }), genId),
    WebhookReceiptError,
  );
  assert.throws(
    () => createWebhookReceipt(receiptInput({ signatureValid: "yes" }), genId),
    WebhookReceiptError,
  );
});

test("decideWebhookReceipt: first delivery processes, redelivery is a duplicate", () => {
  assert.deepEqual(decideWebhookReceipt(null), { action: "process" });
  const existing = createWebhookReceipt(receiptInput(), genId, at("2026-08-07T00:00:00Z"));
  const decision = decideWebhookReceipt(existing);
  assert.equal(decision.action, "duplicate");
  assert.equal(decision.receipt, existing);
});

test("markWebhookReceipt: stamps processedAt and forbids re-marking terminal receipts", () => {
  const r = createWebhookReceipt(receiptInput(), genId, at("2026-08-07T00:00:00Z"));
  const done = markWebhookReceipt(r, "processed", at("2026-08-07T00:00:01Z"));
  assert.equal(done.status, "processed");
  assert.equal(done.processedAt.toISOString(), "2026-08-07T00:00:01.000Z");
  assert.throws(() => markWebhookReceipt(done, "failed"), WebhookReceiptError); // already terminal
});

test("schema + migration: webhook_receipts shape and migration 0009", () => {
  const cfg = getTableConfig(webhookReceipts);
  assert.equal(cfg.name, "webhook_receipts");
  const cols = new Set(cfg.columns.map((c) => c.name));
  for (const c of [
    "connector_id",
    "external_id",
    "topic",
    "signature_valid",
    "status",
    "received_at",
  ]) {
    assert.ok(cols.has(c), `webhook_receipts missing ${c}`);
  }
  const sql = readFileSync(
    join(ROOT, "packages/database/drizzle/0009_t032_webhook_receipts.sql"),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE "webhook_receipts"/);
  assert.match(sql, /webhook_receipts_connector_external_unique/); // dedup index
  assert.doesNotMatch(sql, /DROP TABLE/i);
  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[9].tag, "0009_t032_webhook_receipts");
});
