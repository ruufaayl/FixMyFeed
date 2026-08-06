/**
 * Email message contract, trust-boundary validation, and channel selector
 * (task T024).
 *
 * `EmailNotifier` is the provider-neutral port consumers code against. ADR-009
 * makes SMTP the mandatory email abstraction; the concrete transport (e.g.
 * nodemailer) is injected by the application, so this package holds no SMTP
 * credentials and pulls no mail SDK into its dependency graph.
 */
import { NotificationError, NOTIFICATION_ERROR_CODE } from "./errors.js";

/** A single outbound email. `text` is required so every message degrades to plain text. */
export interface EmailMessage {
  readonly to: readonly string[];
  readonly subject: string;
  /** Plain-text body (always present). */
  readonly text: string;
  /** Optional HTML alternative. */
  readonly html?: string;
  readonly cc?: readonly string[];
  readonly bcc?: readonly string[];
  readonly replyTo?: string;
  /** Overrides the channel's default From address. */
  readonly from?: string;
}

/** Outcome of a send: the transport message id and per-recipient disposition. */
export interface EmailReceipt {
  readonly messageId: string;
  readonly accepted: readonly string[];
  readonly rejected: readonly string[];
}

/** The provider-neutral email delivery contract. */
export interface EmailNotifier {
  send(message: EmailMessage): Promise<EmailReceipt>;
}

/** Max recipients across to/cc/bcc for one message (bounded to limit abuse/fan-out). */
export const MAX_RECIPIENTS = 50;
/** Max subject length (RFC 2822 soft limits; keeps headers bounded). */
export const MAX_SUBJECT_LENGTH = 998;

// Conservative address check for the trust boundary; the SMTP server performs
// authoritative validation. Rejects whitespace and requires a single "@" with a
// dotted domain.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function invalid(message: string): never {
  throw new NotificationError(message, NOTIFICATION_ERROR_CODE.INVALID_MESSAGE);
}

/** Validates a single email address, returning it unchanged. */
export function assertEmailAddress(address: unknown, field: string): string {
  if (typeof address !== "string" || !EMAIL_PATTERN.test(address)) {
    invalid(`${field} must be a valid email address`);
  }
  return address;
}

function assertAddressList(list: readonly string[] | undefined, field: string): void {
  if (list === undefined) return;
  if (!Array.isArray(list)) invalid(`${field} must be an array of email addresses`);
  for (const address of list) assertEmailAddress(address, field);
}

/**
 * Validates an email message at the trust boundary. `defaultFrom` supplies the
 * From address when the message omits one. Throws NOTIFICATION_INVALID_MESSAGE
 * on any violation. Returns a normalized copy with a resolved `from`.
 */
export function validateEmailMessage(
  message: EmailMessage,
  defaultFrom: string,
): Required<Pick<EmailMessage, "to" | "subject" | "text" | "from">> & EmailMessage {
  if (message === null || typeof message !== "object") {
    invalid("message must be an object");
  }
  if (!Array.isArray(message.to) || message.to.length === 0) {
    invalid("message.to must be a non-empty array");
  }
  assertAddressList(message.to, "to");
  assertAddressList(message.cc, "cc");
  assertAddressList(message.bcc, "bcc");

  const recipientCount = message.to.length + (message.cc?.length ?? 0) + (message.bcc?.length ?? 0);
  if (recipientCount > MAX_RECIPIENTS) {
    invalid(`message exceeds ${MAX_RECIPIENTS} recipients`);
  }

  if (typeof message.subject !== "string" || message.subject.length === 0) {
    invalid("message.subject must be a non-empty string");
  }
  if (message.subject.length > MAX_SUBJECT_LENGTH) {
    invalid(`message.subject exceeds ${MAX_SUBJECT_LENGTH} characters`);
  }
  if (typeof message.text !== "string" || message.text.length === 0) {
    invalid("message.text must be a non-empty string");
  }
  if (message.html !== undefined && typeof message.html !== "string") {
    invalid("message.html must be a string when present");
  }
  if (message.replyTo !== undefined) assertEmailAddress(message.replyTo, "replyTo");

  const from = message.from ?? defaultFrom;
  assertEmailAddress(from, "from");

  return { ...message, from };
}

/** Resolved email-channel settings (mirrors AppConfig.smtp: host+from => enabled). */
export interface EmailChannelSettings {
  readonly host: string | undefined;
  readonly from: string | undefined;
}

/** Injected factory the application supplies to wire the concrete SMTP transport. */
export interface EmailNotifierDeps {
  /** Builds the SMTP-backed notifier bound to the resolved default From address. */
  readonly createSmtpNotifier?: (defaultFrom: string) => EmailNotifier;
}

/**
 * Selects and constructs the email notifier, or throws NOTIFICATION_UNAVAILABLE
 * when the channel is disabled (no host/from — matching config's `email`
 * feature flag) or unwired — letting the app degrade safely with a truthful
 * disabled state instead of failing mid-send.
 */
export function createEmailNotifier(
  settings: EmailChannelSettings,
  deps: EmailNotifierDeps,
): EmailNotifier {
  if (!settings.host || !settings.from) {
    throw new NotificationError(
      "email channel is disabled: SMTP host and from address are required",
      NOTIFICATION_ERROR_CODE.UNAVAILABLE,
    );
  }
  if (!deps.createSmtpNotifier) {
    throw new NotificationError(
      "email channel requires an injected SMTP transport (createSmtpNotifier)",
      NOTIFICATION_ERROR_CODE.UNAVAILABLE,
    );
  }
  return deps.createSmtpNotifier(settings.from);
}
