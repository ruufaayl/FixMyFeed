export const DATABASE_ERROR_CODE = {
  CONFIGURATION_INVALID: "DATABASE_CONFIGURATION_INVALID",
  MIGRATION_FAILED: "DATABASE_MIGRATION_FAILED",
} as const;

export class DatabaseConfigurationError extends Error {
  readonly code = DATABASE_ERROR_CODE.CONFIGURATION_INVALID;

  constructor() {
    super("Database configuration is invalid");
    this.name = "DatabaseConfigurationError";
  }
}

export class DatabaseMigrationError extends Error {
  readonly code = DATABASE_ERROR_CODE.MIGRATION_FAILED;

  constructor(options?: ErrorOptions) {
    super("Database migration failed", options);
    this.name = "DatabaseMigrationError";
  }
}
