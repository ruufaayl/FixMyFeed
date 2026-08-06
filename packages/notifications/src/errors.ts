/**
 * Canonical error envelope for notification delivery (task T024).
 *
 * Messages are secret-free — they never contain SMTP credentials, the transport
 * password, or message bodies — and every error carries a stable machine-
 * readable `code` plus a `retryable` flag so callers can distinguish transient
 * upstream failures (retry) from permanent validation/config failures (do not
 * retry).
 */
export const NOTIFICATION_ERROR_CODE = {
  /** The message failed trust-boundary validation (bad recipients, subject, or body). */
  INVALID_MESSAGE: "NOTIFICATION_INVALID_MESSAGE",
  /** The channel is not configured/wireable (bootstrap-disabled or missing dependency). */
  UNAVAILABLE: "NOTIFICATION_UNAVAILABLE",
  /** The underlying transport failed (network, auth, quota, or 5xx). */
  UPSTREAM: "NOTIFICATION_UPSTREAM_ERROR",
} as const;

export type NotificationErrorCode =
  (typeof NOTIFICATION_ERROR_CODE)[keyof typeof NOTIFICATION_ERROR_CODE];

export class NotificationError extends Error {
  readonly code: NotificationErrorCode;
  /** True when retrying the same operation could reasonably succeed. */
  readonly retryable: boolean;
  constructor(
    message: string,
    code: NotificationErrorCode,
    options: { retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "NotificationError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}
