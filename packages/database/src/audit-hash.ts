/**
 * Tamper-evident audit hash chain (task T016).
 *
 * Pure and deterministic (node:crypto only). Each audit record's hash is
 * SHA-256 over a canonical, order-independent serialization of its content
 * plus the previous record's hash. Re-computing the chain and comparing hashes
 * detects any insertion, mutation, deletion, or reordering of records.
 */
import { createHash } from "node:crypto";

/** The subset of an audit record that is bound into its hash. */
export interface AuditHashInput {
  readonly id: string;
  readonly organizationId: string | null;
  readonly actorUserId: string | null;
  readonly actorType: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly outcome: string;
  readonly code: string | null;
  readonly operationId: string | null;
  readonly payload: unknown;
  readonly occurredAt: Date | string;
}

const GENESIS_PREV_HASH = "0".repeat(64);

/** Stable JSON: object keys sorted recursively so serialization is canonical. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
}

/**
 * Computes the hex SHA-256 hash for an audit record chained to `prevHash`.
 * @param prevHash Previous record's hash, or null for the genesis record.
 */
export function computeAuditHash(input: AuditHashInput, prevHash: string | null): string {
  const occurredAt =
    input.occurredAt instanceof Date ? input.occurredAt.toISOString() : input.occurredAt;
  const content = canonicalize({
    id: input.id,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    actorType: input.actorType,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    outcome: input.outcome,
    code: input.code,
    operationId: input.operationId,
    payload: input.payload ?? null,
    occurredAt,
  });
  return createHash("sha256")
    .update(`${prevHash ?? GENESIS_PREV_HASH}\n${content}`)
    .digest("hex");
}

export interface AuditChainRecord extends AuditHashInput {
  readonly prevHash: string | null;
  readonly hash: string;
}

export interface AuditChainVerification {
  readonly valid: boolean;
  /** Index of the first record whose hash/link does not verify, or -1 if valid. */
  readonly brokenAt: number;
  readonly reason?: string;
}

/**
 * Verifies an ordered slice of the audit chain: each record's `prevHash` must
 * match the prior record's `hash`, and each `hash` must equal the recomputed
 * value. Returns the first break, if any.
 */
export function verifyAuditChain(
  records: readonly AuditChainRecord[],
  expectedFirstPrevHash: string | null = null,
): AuditChainVerification {
  let previous = expectedFirstPrevHash;
  for (let i = 0; i < records.length; i++) {
    const record = records[i]!;
    if ((record.prevHash ?? null) !== (previous ?? null)) {
      return {
        valid: false,
        brokenAt: i,
        reason: "prev_hash does not chain to the previous record",
      };
    }
    const expected = computeAuditHash(record, record.prevHash);
    if (expected !== record.hash) {
      return { valid: false, brokenAt: i, reason: "hash does not match recomputed content" };
    }
    previous = record.hash;
  }
  return { valid: true, brokenAt: -1 };
}
