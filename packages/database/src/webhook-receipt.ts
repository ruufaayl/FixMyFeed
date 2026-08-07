/**
 * Webhook receipt dedup and lifecycle logic (task T032).
 *
 * Pure and deterministic. `decideWebhookReceipt` is the ingress dedup decision:
 * given the existing receipt (or null) for a provider delivery id, either
 * process it for the first time or recognize it as a duplicate. Status
 * transitions cover the outcome of processing.
 */
import { WEBHOOK_RECEIPT_STATUSES, type WebhookReceiptStatus } from "./webhook-receipt-schema.js";

export const WEBHOOK_RECEIPT_ERROR_CODE = {
  INVALID_INPUT: "WEBHOOK_RECEIPT_INVALID_INPUT",
  INVALID_TRANSITION: "WEBHOOK_RECEIPT_INVALID_TRANSITION",
} as const;
export type WebhookReceiptErrorCode =
  (typeof WEBHOOK_RECEIPT_ERROR_CODE)[keyof typeof WEBHOOK_RECEIPT_ERROR_CODE];

export class WebhookReceiptError extends Error {
  readonly code: WebhookReceiptErrorCode;
  constructor(message: string, code: WebhookReceiptErrorCode) {
    super(message);
    this.name = "WebhookReceiptError";
    this.code = code;
  }
}

export interface NewWebhookReceiptInput {
  readonly organizationId: string;
  readonly connectorId: string;
  readonly externalId: string;
  readonly topic: string;
  readonly signatureValid: boolean;
  readonly metadata?: unknown;
}

export interface WebhookReceiptRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly connectorId: string;
  readonly externalId: string;
  readonly topic: string;
  readonly signatureValid: boolean;
  readonly status: WebhookReceiptStatus;
  readonly metadata: unknown;
  readonly receivedAt: Date;
  readonly processedAt: Date | null;
}

function requireNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new WebhookReceiptError(`${field} is required`, WEBHOOK_RECEIPT_ERROR_CODE.INVALID_INPUT);
  }
  return value;
}

/** Builds a validated `received` receipt (to be inserted by the caller). */
export function createWebhookReceipt(
  input: NewWebhookReceiptInput,
  generateId: () => string,
  now: () => Date = () => new Date(),
): WebhookReceiptRecord {
  requireNonEmpty(input.organizationId, "organizationId");
  requireNonEmpty(input.connectorId, "connectorId");
  requireNonEmpty(input.externalId, "externalId");
  requireNonEmpty(input.topic, "topic");
  if (typeof input.signatureValid !== "boolean") {
    throw new WebhookReceiptError(
      "signatureValid must be a boolean",
      WEBHOOK_RECEIPT_ERROR_CODE.INVALID_INPUT,
    );
  }
  return {
    id: generateId(),
    organizationId: input.organizationId,
    connectorId: input.connectorId,
    externalId: input.externalId,
    topic: input.topic,
    signatureValid: input.signatureValid,
    status: "received",
    metadata: input.metadata ?? null,
    receivedAt: now(),
    processedAt: null,
  };
}

export type WebhookDedupDecision =
  | { readonly action: "process" }
  | { readonly action: "duplicate"; readonly receipt: WebhookReceiptRecord };

/**
 * Ingress dedup decision: no prior receipt for this delivery id → `process`;
 * an existing receipt → `duplicate` (do not reprocess). The persistence layer
 * still relies on the unique (connector_id, external_id) index to resolve races.
 */
export function decideWebhookReceipt(existing: WebhookReceiptRecord | null): WebhookDedupDecision {
  if (existing === null) return { action: "process" };
  return { action: "duplicate", receipt: existing };
}

const TERMINAL: readonly WebhookReceiptStatus[] = ["processed", "failed", "duplicate"];

/** Applies the outcome of processing a receipt, stamping `processedAt`. */
export function markWebhookReceipt(
  current: WebhookReceiptRecord,
  status: Extract<WebhookReceiptStatus, "processed" | "failed">,
  now: () => Date = () => new Date(),
): WebhookReceiptRecord {
  if (!(WEBHOOK_RECEIPT_STATUSES as readonly string[]).includes(status)) {
    throw new WebhookReceiptError(
      `unknown status: ${status}`,
      WEBHOOK_RECEIPT_ERROR_CODE.INVALID_TRANSITION,
    );
  }
  if (TERMINAL.includes(current.status)) {
    throw new WebhookReceiptError(
      `receipt already ${current.status}`,
      WEBHOOK_RECEIPT_ERROR_CODE.INVALID_TRANSITION,
    );
  }
  return { ...current, status, processedAt: now() };
}
