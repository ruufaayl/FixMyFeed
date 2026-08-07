import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabaseClient, validateDatabaseOptions } from "./client.js";
import { DatabaseMigrationError } from "./errors.js";

export interface MigrationEvent {
  readonly type: "migration_started" | "migration_succeeded" | "migration_failed";
}

interface MigrationClient {
  readonly db: unknown;
  close(): Promise<void>;
}

export interface RunDatabaseMigrationsOptions {
  readonly databaseUrl: string;
  readonly migrationsFolder?: string;
  readonly onEvent?: (event: MigrationEvent) => void;
  readonly createClient?: () => MigrationClient;
  readonly applyMigrations?: (
    db: unknown,
    options: { readonly migrationsFolder: string },
  ) => Promise<void>;
}

export interface MigrationResult {
  readonly status: "completed";
}

// Computed via path.join (not `new URL("../drizzle", …)`) so application bundlers
// (e.g. Next.js/Turbopack) do not statically resolve it as a module import; the
// runtime path is identical (packages/database/drizzle).
export const DEFAULT_MIGRATIONS_FOLDER = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "drizzle",
);

/** Applies committed migrations with a single-purpose connection. */
export async function runDatabaseMigrations(
  options: RunDatabaseMigrationsOptions,
): Promise<MigrationResult> {
  validateDatabaseOptions({ url: options.databaseUrl, poolMax: 1 });

  const client =
    options.createClient?.() ??
    createDatabaseClient({
      url: options.databaseUrl,
      poolMax: 1,
      applicationName: "fixmyfeed-migrator",
    });
  const migrationsFolder = options.migrationsFolder ?? DEFAULT_MIGRATIONS_FOLDER;
  const applyMigrations =
    options.applyMigrations ??
    (async (db, config) => {
      await migrate(db as Parameters<typeof migrate>[0], config);
    });
  let closeAttempted = false;
  const close = async () => {
    if (!closeAttempted) {
      closeAttempted = true;
      await client.close();
    }
  };
  const emit = (event: MigrationEvent) => {
    try {
      options.onEvent?.(event);
    } catch {
      // Telemetry is non-authoritative and must never control a migration.
    }
  };

  emit({ type: "migration_started" });
  try {
    await applyMigrations(client.db, { migrationsFolder });
    await close();
    emit({ type: "migration_succeeded" });
    return { status: "completed" };
  } catch (caught) {
    let cause = caught;
    try {
      await close();
    } catch (closeCause) {
      cause = new AggregateError([cause, closeCause], "Migration or teardown failed");
    }
    emit({ type: "migration_failed" });
    throw new DatabaseMigrationError({ cause });
  }
}
