/**
 * @fixmyfeed/notifications
 *
 * Notification delivery abstraction (task T024). Its first channel is a
 * provider-neutral SMTP email adapter: consumers code against the
 * `EmailNotifier` port and the concrete SMTP transport is injected by the
 * application (ADR-009 — SMTP is the mandatory email abstraction; vendor APIs
 * are optional adapters). Credentials and mail SDKs live in the application,
 * never in this package.
 *
 * Boundary: this package may depend only on domain/contracts/config/observability
 * (see /boundaries.json and docs/04-system-architecture/monorepo-architecture.md).
 */
export const workspaceName = "@fixmyfeed/notifications" as const;
export const workspaceKind = "package" as const;

export { NotificationError, NOTIFICATION_ERROR_CODE } from "./errors.js";
export type { NotificationErrorCode } from "./errors.js";

export {
  MAX_RECIPIENTS,
  MAX_SUBJECT_LENGTH,
  assertEmailAddress,
  validateEmailMessage,
  createEmailNotifier,
} from "./email.js";
export type {
  EmailMessage,
  EmailReceipt,
  EmailNotifier,
  EmailChannelSettings,
  EmailNotifierDeps,
} from "./email.js";

export { createSmtpNotifier } from "./smtp-notifier.js";
export type { SmtpTransportLike, SmtpSendInput, SmtpSendResult } from "./smtp-notifier.js";
