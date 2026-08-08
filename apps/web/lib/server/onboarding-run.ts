/**
 * Onboarding first-run journey (task T166) — server-only.
 *
 * After a successful Shopify OAuth the app schedules an async job that imports the
 * catalog and then runs the first diagnostic scan, tracked by a durable
 * `operations` row (queued → running → completed / failed) whose progress and
 * result the onboarding screen surfaces: connect → import → scan → first
 * catalog-health result. The orchestration is pure over injected ports (import +
 * scan + operation store) so it is unit-testable; the concrete Shopify import and
 * diagnostics scan are wired in the adapter. The queue job carries only durable
 * identifiers — never credentials or serialized data.
 */

export type OnboardingState = "none" | "queued" | "running" | "completed" | "failed";

export interface OnboardingStatusDTO {
  readonly state: OnboardingState;
  readonly progress: number;
  readonly productCount: number | null;
  readonly healthScore: number | null;
  readonly issuesFound: number | null;
}

export interface OnboardingResult {
  readonly productCount: number;
  readonly healthScore: number;
  readonly issuesFound: number;
}

/** Long-running steps for the first-run journey. */
export interface OnboardingPorts {
  /** Imports the connected store's catalog; returns how many products landed. */
  importCatalog(): Promise<{ productCount: number }>;
  /** Runs the first diagnostic scan; returns the health score + issue count. */
  runScan(): Promise<{ healthScore: number; issuesFound: number }>;
}

/** Durable progress/result tracking for one onboarding operation. */
export interface OnboardingStore {
  markRunning(operationId: string): Promise<void>;
  setProgress(operationId: string, progress: number): Promise<void>;
  complete(operationId: string, result: OnboardingResult): Promise<void>;
  fail(operationId: string, reason: string): Promise<void>;
}

/**
 * Runs the connect→import→scan journey for one operation, recording progress at
 * each step and the final catalog-health result. Any failure is recorded as a
 * terminal `failed` state (never left hanging); returns the result on success.
 */
export async function runOnboardingImportScan(
  operationId: string,
  store: OnboardingStore,
  ports: OnboardingPorts,
): Promise<OnboardingResult | null> {
  try {
    await store.markRunning(operationId);
    const imported = await ports.importCatalog();
    await store.setProgress(operationId, 50);
    const scan = await ports.runScan();
    const result: OnboardingResult = {
      productCount: imported.productCount,
      healthScore: scan.healthScore,
      issuesFound: scan.issuesFound,
    };
    await store.complete(operationId, result);
    return result;
  } catch (error) {
    await store.fail(operationId, error instanceof Error ? error.message : "onboarding_failed");
    return null;
  }
}
