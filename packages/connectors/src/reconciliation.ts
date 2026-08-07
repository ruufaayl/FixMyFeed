/**
 * Reconciliation diff (task T034).
 *
 * Pure, deterministic comparison of a local snapshot against the remote source
 * of truth, classifying each item as added / updated / removed / unchanged
 * (data-reconciliation.md, consistency-and-reconciliation.md). The caller
 * supplies `keyOf` (a stable external id) and `fingerprintOf` (a value/version
 * hash used to detect changes), so the diff is provider- and shape-neutral.
 */

export interface ReconciliationOptions<L, R> {
  /** Stable external identifier for a local item. */
  readonly keyOfLocal: (item: L) => string;
  /** Stable external identifier for a remote item. */
  readonly keyOfRemote: (item: R) => string;
  /** Change-detection fingerprint for a local item (e.g. content hash / version). */
  readonly fingerprintOfLocal: (item: L) => string;
  /** Change-detection fingerprint for a remote item. */
  readonly fingerprintOfRemote: (item: R) => string;
}

export interface ReconciliationSummary {
  readonly added: number;
  readonly updated: number;
  readonly removed: number;
  readonly unchanged: number;
  readonly total: number;
}

export interface ReconciliationResult<L, R> {
  /** Present remotely, absent locally — ingest these. */
  readonly added: readonly R[];
  /** Present in both, fingerprint differs — refresh these. */
  readonly updated: readonly R[];
  /** Present locally, absent remotely — remove/soft-delete these. */
  readonly removed: readonly L[];
  /** Present in both with the same fingerprint — no action. */
  readonly unchanged: readonly R[];
  readonly summary: ReconciliationSummary;
}

/**
 * Diffs `local` against `remote` (the source of truth). Deterministic: the
 * result arrays preserve the input order of `remote` (added/updated/unchanged)
 * and `local` (removed).
 */
export function reconcile<L, R>(
  local: readonly L[],
  remote: readonly R[],
  options: ReconciliationOptions<L, R>,
): ReconciliationResult<L, R> {
  const localByKey = new Map<string, L>();
  for (const item of local) {
    localByKey.set(options.keyOfLocal(item), item);
  }

  const added: R[] = [];
  const updated: R[] = [];
  const unchanged: R[] = [];
  const remoteKeys = new Set<string>();

  for (const remoteItem of remote) {
    const key = options.keyOfRemote(remoteItem);
    remoteKeys.add(key);
    const localItem = localByKey.get(key);
    if (localItem === undefined) {
      added.push(remoteItem);
    } else if (options.fingerprintOfLocal(localItem) !== options.fingerprintOfRemote(remoteItem)) {
      updated.push(remoteItem);
    } else {
      unchanged.push(remoteItem);
    }
  }

  const removed: L[] = [];
  for (const item of local) {
    if (!remoteKeys.has(options.keyOfLocal(item))) {
      removed.push(item);
    }
  }

  return {
    added,
    updated,
    removed,
    unchanged,
    summary: {
      added: added.length,
      updated: updated.length,
      removed: removed.length,
      unchanged: unchanged.length,
      total: added.length + updated.length + removed.length + unchanged.length,
    },
  };
}
