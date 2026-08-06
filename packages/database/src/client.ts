import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import type { AppConfig } from "@fixmyfeed/config";

import { DatabaseConfigurationError } from "./errors.js";
import { schema } from "./schema.js";

export interface DatabaseClientOptions {
  readonly url: string;
  readonly poolMax?: number;
  readonly applicationName?: string;
}

export interface DatabaseClient {
  readonly db: PostgresJsDatabase<typeof schema>;
  readonly sql: Sql;
  close(): Promise<void>;
}

export type DatabaseApplicationConfig = Pick<AppConfig, "database">;

export function validateDatabaseOptions(options: DatabaseClientOptions): void {
  let protocol: string;
  try {
    protocol = new URL(options.url).protocol;
  } catch {
    throw new DatabaseConfigurationError();
  }

  const poolMax = options.poolMax ?? 10;
  if (
    (protocol !== "postgres:" && protocol !== "postgresql:") ||
    !Number.isInteger(poolMax) ||
    poolMax < 1 ||
    poolMax > 100 ||
    (options.applicationName !== undefined && options.applicationName.trim() === "")
  ) {
    throw new DatabaseConfigurationError();
  }
}

/** Creates the sole lazy SQL adapter used by application packages. */
export function createDatabaseClient(options: DatabaseClientOptions): DatabaseClient {
  validateDatabaseOptions(options);

  const sql = postgres(options.url, {
    max: options.poolMax ?? 10,
    connection: options.applicationName ? { application_name: options.applicationName } : undefined,
  });
  const db = drizzle(sql, { schema });
  let closePromise: Promise<void> | undefined;

  return {
    db,
    sql,
    close() {
      closePromise ??= sql.end();
      return closePromise;
    },
  };
}

/** Maps the validated application configuration through the SQL adapter. */
export function createDatabaseClientFromConfig(
  config: DatabaseApplicationConfig,
  applicationName?: string,
): DatabaseClient {
  return createDatabaseClient({
    url: config.database.url,
    poolMax: config.database.poolMax,
    applicationName,
  });
}
