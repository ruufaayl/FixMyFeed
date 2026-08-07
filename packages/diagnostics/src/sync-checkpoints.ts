/**
 * Incremental synchronization checkpoints (task T075).
 *
 * Pure logic for incremental catalog sync. Given the fingerprints of the
 * previously-synced products (a baseline, e.g. reconstructed from stored
 * `catalog_products` rows) and the products just pulled from a source, it
 * classifies each product as added / updated / unchanged / removed by content
 * fingerprint, and produces a `SyncCheckpoint` — a resumable high-water mark
 * (opaque source cursor + snapshot hash + count) recorded after each successful
 * sync so the next pull can resume incrementally. No I/O.
 */
import type { CatalogProduct } from "@fixmyfeed/domain";
import { buildCatalogSnapshot, catalogProductFingerprint } from "@fixmyfeed/database";

/** Minimal shape of a stored product row needed to rebuild a baseline. */
export interface FingerprintRow {
  readonly externalId: string;
  readonly fingerprint: string;
}

/** Builds a baseline `externalId → fingerprint` index from stored rows. */
export function fingerprintIndex(rows: readonly FingerprintRow[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const row of rows) index.set(row.externalId, row.fingerprint);
  return index;
}

export interface CatalogDelta {
  /** Products present now but absent from the baseline. */
  readonly added: readonly CatalogProduct[];
  /** Products present in both, whose fingerprint changed. */
  readonly updated: readonly CatalogProduct[];
  /** Products present in both, with an identical fingerprint. */
  readonly unchanged: readonly CatalogProduct[];
  /** External ids present in the baseline but absent from the incoming set. */
  readonly removedExternalIds: readonly string[];
}

/**
 * Classifies each incoming product against a baseline `externalId → fingerprint`
 * index. `added`/`updated`/`unchanged` cover the incoming set; `removedExternalIds`
 * are baseline ids no longer present. Duplicate incoming external ids collapse to
 * the last occurrence for removal accounting but are each still classified.
 */
export function computeCatalogDelta(
  baseline: ReadonlyMap<string, string>,
  incoming: readonly CatalogProduct[],
): CatalogDelta {
  const added: CatalogProduct[] = [];
  const updated: CatalogProduct[] = [];
  const unchanged: CatalogProduct[] = [];
  const seen = new Set<string>();

  for (const product of incoming) {
    seen.add(product.externalId);
    const previous = baseline.get(product.externalId);
    if (previous === undefined) {
      added.push(product);
    } else if (previous === catalogProductFingerprint(product)) {
      unchanged.push(product);
    } else {
      updated.push(product);
    }
  }

  const removedExternalIds: string[] = [];
  for (const externalId of baseline.keys()) {
    if (!seen.has(externalId)) removedExternalIds.push(externalId);
  }

  return { added, updated, unchanged, removedExternalIds };
}

/** Whether a delta carries any change (added / updated / removed). */
export function deltaHasChanges(delta: CatalogDelta): boolean {
  return delta.added.length > 0 || delta.updated.length > 0 || delta.removedExternalIds.length > 0;
}

export interface SyncCheckpointCounts {
  readonly added: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly removed: number;
}

export interface SyncCheckpoint {
  /**
   * Opaque source high-water mark for the next incremental pull (e.g. a Shopify
   * `updated_at` bound or `since_id`). Supplied by the caller; the engine never
   * interprets it.
   */
  readonly cursor: string | null;
  /** Deterministic content hash of the full post-sync catalog. */
  readonly snapshotHash: string;
  readonly productCount: number;
  /** ISO-8601 capture time. */
  readonly capturedAt: string;
  readonly counts: SyncCheckpointCounts;
}

/**
 * Builds the checkpoint to persist after a successful incremental sync: the full
 * catalog's snapshot hash/count plus the delta counts and the caller's next
 * cursor. `products` is the complete post-sync catalog (baseline − removed +
 * added/updated), so the snapshot hash is a full-state checkpoint, not a delta.
 */
export function buildSyncCheckpoint(
  products: readonly CatalogProduct[],
  delta: CatalogDelta,
  options: { cursor?: string | null; capturedAt?: Date } = {},
): SyncCheckpoint {
  const snapshot = buildCatalogSnapshot(products);
  const capturedAt = options.capturedAt ?? new Date();
  return {
    cursor: options.cursor ?? null,
    snapshotHash: snapshot.snapshotHash,
    productCount: snapshot.productCount,
    capturedAt: capturedAt.toISOString(),
    counts: {
      added: delta.added.length,
      updated: delta.updated.length,
      unchanged: delta.unchanged.length,
      removed: delta.removedExternalIds.length,
    },
  };
}
