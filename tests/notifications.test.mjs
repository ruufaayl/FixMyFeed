/**
 * Notification (SMTP email) adapter tests (task T024).
 *
 * Imports the built @fixmyfeed/notifications package. The validation and
 * selector logic is pure; the SMTP adapter runs against an in-memory fake
 * transport — so no live mail server is required.
 *
 * Traceability: docs/25-architecture-decisions/ADR-009-smtp-email.md,
 * docs/04-system-architecture/notification-architecture.md,
 * docs/03-domain-model/notification-domain.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NotificationError,
  NOTIFICATION_ERROR_CODE,
  MAX_RECIPIENTS,
  assertEmailAddress,
  validateEmailMessage,
  createEmailNotifier,
  createSmtpNotifier,
} from "../packages/notifications/dist/index.js";

const baseMsg = {
  to: ["user@example.com"],
  subject: "Feed report ready",
  text: "Your feed diagnosis is complete.",
};

// ---------------------------------------------------------------------------
// email.ts — validation
// ---------------------------------------------------------------------------

test("assertEmailAddress: accepts valid, rejects malformed", () => {
  assert.equal(assertEmailAddress("a@b.co", "to"), "a@b.co");
  for (const bad of ["", "no-at", "a@b", "a b@c.com", "a@ b.com", "@b.com", "a@.com"]) {
    assert.throws(
      () => assertEmailAddress(bad, "to"),
      (e) => e instanceof NotificationError && e.code === NOTIFICATION_ERROR_CODE.INVALID_MESSAGE,
      `expected "${bad}" to be rejected`,
    );
  }
});

test("validateEmailMessage: resolves default from and returns a normalized copy", () => {
  const v = validateEmailMessage(baseMsg, "noreply@fixmyfeed.com");
  assert.equal(v.from, "noreply@fixmyfeed.com");
  assert.deepEqual([...v.to], ["user@example.com"]);
  // An explicit from overrides the default.
  const v2 = validateEmailMessage({ ...baseMsg, from: "alerts@fixmyfeed.com" }, "noreply@x.com");
  assert.equal(v2.from, "alerts@fixmyfeed.com");
});

test("validateEmailMessage: rejects empty recipients, subject, body, and bad from", () => {
  const from = "noreply@fixmyfeed.com";
  assert.throws(() => validateEmailMessage({ ...baseMsg, to: [] }, from), NotificationError);
  assert.throws(() => validateEmailMessage({ ...baseMsg, subject: "" }, from), NotificationError);
  assert.throws(() => validateEmailMessage({ ...baseMsg, text: "" }, from), NotificationError);
  assert.throws(() => validateEmailMessage(baseMsg, "not-an-email"), NotificationError);
  assert.throws(
    () => validateEmailMessage({ ...baseMsg, cc: ["bad addr"] }, from),
    NotificationError,
  );
});

test("validateEmailMessage: enforces the recipient bound across to/cc/bcc", () => {
  const many = Array.from({ length: MAX_RECIPIENTS + 1 }, (_, i) => `u${i}@example.com`);
  assert.throws(
    () => validateEmailMessage({ ...baseMsg, to: many }, "noreply@fixmyfeed.com"),
    (e) => e instanceof NotificationError && e.code === NOTIFICATION_ERROR_CODE.INVALID_MESSAGE,
  );
});

// ---------------------------------------------------------------------------
// email.ts — channel selector
// ---------------------------------------------------------------------------

test("createEmailNotifier: throws UNAVAILABLE when disabled or unwired, else builds", () => {
  const marker = { send: async () => ({ messageId: "m", accepted: [], rejected: [] }) };
  // Disabled: missing host/from (mirrors config's email feature flag).
  assert.throws(
    () => createEmailNotifier({ host: undefined, from: "x@y.com" }, {}),
    (e) => e instanceof NotificationError && e.code === NOTIFICATION_ERROR_CODE.UNAVAILABLE,
  );
  assert.throws(
    () => createEmailNotifier({ host: "smtp.local", from: undefined }, {}),
    (e) => e instanceof NotificationError && e.code === NOTIFICATION_ERROR_CODE.UNAVAILABLE,
  );
  // Enabled but no transport injected.
  assert.throws(
    () => createEmailNotifier({ host: "smtp.local", from: "x@y.com" }, {}),
    (e) => e instanceof NotificationError && e.code === NOTIFICATION_ERROR_CODE.UNAVAILABLE,
  );
  // Wired: forwards the resolved default From to the factory.
  let seenFrom;
  const notifier = createEmailNotifier(
    { host: "smtp.local", from: "noreply@fixmyfeed.com" },
    {
      createSmtpNotifier: (defaultFrom) => {
        seenFrom = defaultFrom;
        return marker;
      },
    },
  );
  assert.equal(notifier, marker);
  assert.equal(seenFrom, "noreply@fixmyfeed.com");
});

// ---------------------------------------------------------------------------
// smtp-notifier.ts — fake transport
// ---------------------------------------------------------------------------

function fakeTransport(behavior = {}) {
  const sent = [];
  return {
    sent,
    transport: {
      async sendMail(input) {
        sent.push(input);
        if (behavior.throw) throw new Error("connection refused");
        if (behavior.noId) return { accepted: input.to, rejected: [] };
        return {
          messageId: "msg-123",
          accepted: behavior.accepted ?? input.to,
          rejected: behavior.rejected ?? [],
        };
      },
    },
  };
}

test("smtp notifier: sends a validated message and returns a receipt", async () => {
  const { transport, sent } = fakeTransport();
  const notifier = createSmtpNotifier(transport, "noreply@fixmyfeed.com");
  const receipt = await notifier.send(baseMsg);

  assert.equal(receipt.messageId, "msg-123");
  assert.deepEqual([...receipt.accepted], ["user@example.com"]);
  assert.deepEqual([...receipt.rejected], []);
  // Default From is applied and the body/subject are forwarded unchanged.
  assert.equal(sent[0].from, "noreply@fixmyfeed.com");
  assert.equal(sent[0].subject, "Feed report ready");
  assert.equal(sent[0].text, "Your feed diagnosis is complete.");
});

test("smtp notifier: surfaces per-recipient rejections (partial success preserved)", async () => {
  const { transport } = fakeTransport({ accepted: ["a@x.com"], rejected: ["b@x.com"] });
  const notifier = createSmtpNotifier(transport, "noreply@fixmyfeed.com");
  const receipt = await notifier.send({ ...baseMsg, to: ["a@x.com", "b@x.com"] });
  assert.deepEqual([...receipt.accepted], ["a@x.com"]);
  assert.deepEqual([...receipt.rejected], ["b@x.com"]);
});

test("smtp notifier: transport throw -> retryable UPSTREAM; missing id -> UPSTREAM", async () => {
  const failing = createSmtpNotifier(fakeTransport({ throw: true }).transport, "noreply@x.com");
  await assert.rejects(
    () => failing.send(baseMsg),
    (e) =>
      e instanceof NotificationError &&
      e.code === NOTIFICATION_ERROR_CODE.UPSTREAM &&
      e.retryable === true,
  );

  const noId = createSmtpNotifier(fakeTransport({ noId: true }).transport, "noreply@x.com");
  await assert.rejects(
    () => noId.send(baseMsg),
    (e) => e instanceof NotificationError && e.code === NOTIFICATION_ERROR_CODE.UPSTREAM,
  );
});

test("smtp notifier: invalid messages are rejected before the transport is called", async () => {
  const { transport, sent } = fakeTransport();
  const notifier = createSmtpNotifier(transport, "noreply@fixmyfeed.com");
  await assert.rejects(
    () => notifier.send({ ...baseMsg, to: ["bad addr"] }),
    (e) => e instanceof NotificationError && e.code === NOTIFICATION_ERROR_CODE.INVALID_MESSAGE,
  );
  assert.equal(sent.length, 0);
});
