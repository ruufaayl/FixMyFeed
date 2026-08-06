/**
 * SMTP email notifier over an injected transport port (task T024).
 *
 * ADR-009 makes SMTP the mandatory email abstraction. Rather than bind this
 * package to a specific mail library (and its credentials), the adapter depends
 * on a minimal `SmtpTransportLike` port that any SMTP client (e.g. nodemailer)
 * can satisfy; the application constructs the transport with owner-supplied
 * SMTP credentials and injects it. Credentials, TLS setup, and the mail SDK all
 * live in the application, never here — which also makes the adapter fully
 * unit-testable.
 */
import { NotificationError, NOTIFICATION_ERROR_CODE } from "./errors.js";
import {
  validateEmailMessage,
  type EmailMessage,
  type EmailNotifier,
  type EmailReceipt,
} from "./email.js";

/** What the transport is asked to send (already validated, From resolved). */
export interface SmtpSendInput {
  readonly from: string;
  readonly to: readonly string[];
  readonly cc?: readonly string[];
  readonly bcc?: readonly string[];
  readonly replyTo?: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
}

/** What the transport reports back. `accepted`/`rejected` default to all recipients. */
export interface SmtpSendResult {
  readonly messageId: string;
  readonly accepted?: readonly string[];
  readonly rejected?: readonly string[];
}

/** The minimal, provider-neutral SMTP surface the adapter needs (nodemailer-shaped). */
export interface SmtpTransportLike {
  sendMail(input: SmtpSendInput): Promise<SmtpSendResult>;
}

/**
 * Builds an EmailNotifier backed by `transport`. `defaultFrom` is used when a
 * message omits its own From address. Transport failures are surfaced as a
 * retryable NOTIFICATION_UPSTREAM_ERROR; the returned receipt lists per-
 * recipient acceptance so a partial delivery preserves the successful work.
 */
export function createSmtpNotifier(
  transport: SmtpTransportLike,
  defaultFrom: string,
): EmailNotifier {
  return {
    async send(message: EmailMessage): Promise<EmailReceipt> {
      const valid = validateEmailMessage(message, defaultFrom);
      const input: SmtpSendInput = {
        from: valid.from,
        to: valid.to,
        cc: valid.cc,
        bcc: valid.bcc,
        replyTo: valid.replyTo,
        subject: valid.subject,
        text: valid.text,
        html: valid.html,
      };
      let result: SmtpSendResult;
      try {
        result = await transport.sendMail(input);
      } catch (error) {
        if (error instanceof NotificationError) throw error;
        // SMTP transport failures (connection, greylisting, 4xx/5xx) are transient.
        throw new NotificationError("smtp send failed", NOTIFICATION_ERROR_CODE.UPSTREAM, {
          retryable: true,
          cause: error,
        });
      }
      if (typeof result?.messageId !== "string" || result.messageId.length === 0) {
        throw new NotificationError(
          "smtp transport returned no message id",
          NOTIFICATION_ERROR_CODE.UPSTREAM,
          { retryable: true },
        );
      }
      const allRecipients = [...valid.to, ...(valid.cc ?? []), ...(valid.bcc ?? [])];
      return {
        messageId: result.messageId,
        accepted: result.accepted ?? allRecipients,
        rejected: result.rejected ?? [],
      };
    },
  };
}
