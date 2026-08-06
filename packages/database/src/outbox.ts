/**
 * Transactional outbox relay and idempotent inbox (task T022).
 *
 * Pure and deterministic over persistence/publisher *ports*, so it is fully
 * unit-testable without a database or a real queue runtime. The worker app
 * wires the ports to the Drizzle outbox table and the T021 queue runtime.
 */
import { randomUUID } from "node:crypto";
import type { OutboxStatus } from "./outbox-schema.js";

export const OUTBOX_ERROR_CODE = {
  INVALID_EVENT: "OUTBOX_INVALID_EVENT",
} as const;
export type OutboxErrorCode = (typeof OUTBOX_ERROR_CODE)[keyof typeof OUTBOX_ERROR_CODE];

export class OutboxError extends Error {
  readonly code: OutboxErrorCode;
  constructor(message: string, code: OutboxErrorCode = OUTBOX_ERROR_CODE.INVALID_EVENT) {
    super(message);
    this.name = "OutboxError";
    this.code = code;
  }
}

export interface NewOutboxEventInput {
  readonly organizationId: string | null;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId?: string | null;
  readonly payload?: unknown;
  readonly occurredAt?: Date;
}

export interface OutboxEventRecord {
  readonly id: string;
  readonly organizationId: string | null;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: string | null;
  readonly status: OutboxStatus;
  readonly attemptCount: number;
  readonly payload: unknown;
  readonly occurredAt: Date;
}

/** Builds a validated, pending outbox event row (to be inserted inside the caller's transaction). */
export function createOutboxEvent(
  input: NewOutboxEventInput,
  generateId: () => string = randomUUID,
  now: () => Date = () => new Date(),
): OutboxEventRecord {
  if (typeof input.eventType !== "string" || input.eventType.length === 0) {
    throw new OutboxError("eventType is required");
  }
  if (typeof input.aggregateType !== "string" || input.aggregateType.length === 0) {
    throw new OutboxError("aggregateType is required");
  }
  return {
    id: generateId(),
    organizationId: input.organizationId,
    eventType: input.eventType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId ?? null,
    status: "pending",
    attemptCount: 0,
    payload: input.payload ?? null,
    occurredAt: input.occurredAt ?? now(),
  };
}

/** Reads and updates pending outbox rows. Implemented by the Drizzle adapter. */
export interface OutboxRelayPersistence {
  fetchPending(limit: number): Promise<readonly OutboxEventRecord[]>;
  markPublished(id: string): Promise<void>;
  /** Records a failed attempt; `dead` marks it terminally dead-lettered. */
  markFailed(id: string, attemptCount: number, dead: boolean): Promise<void>;
}

/** Publishes an event (e.g. enqueues it onto a durable queue). */
export interface OutboxPublisher {
  publish(record: OutboxEventRecord): Promise<void>;
}

export interface OutboxRelayEvent {
  readonly type: "published" | "retry_scheduled" | "dead_lettered";
  readonly id: string;
  readonly eventType: string;
}

export interface OutboxRelayOptions {
  readonly persistence: OutboxRelayPersistence;
  readonly publisher: OutboxPublisher;
  /** Max publish attempts before an event is dead-lettered. Default 8. */
  readonly maxAttempts?: number;
  readonly batchSize?: number;
  readonly onEvent?: (event: OutboxRelayEvent) => void;
}

export interface OutboxRelayResult {
  readonly published: number;
  readonly retried: number;
  readonly deadLettered: number;
}

export interface OutboxRelay {
  runOnce(): Promise<OutboxRelayResult>;
}

/**
 * Builds a relay that publishes one batch of pending events per `runOnce`.
 * Publish failures increment the attempt count and are retried until
 * `maxAttempts`, after which the event is dead-lettered — never dropped.
 */
export function createOutboxRelay(options: OutboxRelayOptions): OutboxRelay {
  const maxAttempts = options.maxAttempts ?? 8;
  const batchSize = options.batchSize ?? 100;
  const emit = (event: OutboxRelayEvent) => options.onEvent?.(event);

  return {
    async runOnce() {
      const pending = await options.persistence.fetchPending(batchSize);
      let published = 0;
      let retried = 0;
      let deadLettered = 0;

      for (const record of pending) {
        try {
          await options.publisher.publish(record);
          await options.persistence.markPublished(record.id);
          published += 1;
          emit({ type: "published", id: record.id, eventType: record.eventType });
        } catch {
          const attempt = record.attemptCount + 1;
          const dead = attempt >= maxAttempts;
          await options.persistence.markFailed(record.id, attempt, dead);
          if (dead) {
            deadLettered += 1;
            emit({ type: "dead_lettered", id: record.id, eventType: record.eventType });
          } else {
            retried += 1;
            emit({ type: "retry_scheduled", id: record.id, eventType: record.eventType });
          }
        }
      }

      return { published, retried, deadLettered };
    },
  };
}

/** Records consumption of an event by a named consumer. Adapter-backed. */
export interface InboxPersistence {
  /** Returns true if newly recorded, false if the event was already consumed (idempotent). */
  recordConsumed(
    eventId: string,
    consumer: string,
    organizationId: string | null,
  ): Promise<boolean>;
}

/**
 * Idempotent consumption guard: runs `handler` only the first time an event is
 * seen by `consumer`; subsequent deliveries are no-ops.
 */
export async function consumeOnce(
  inbox: InboxPersistence,
  event: { readonly id: string; readonly organizationId: string | null },
  consumer: string,
  handler: () => Promise<void>,
): Promise<{ readonly processed: boolean }> {
  const isNew = await inbox.recordConsumed(event.id, consumer, event.organizationId);
  if (!isNew) return { processed: false };
  await handler();
  return { processed: true };
}
