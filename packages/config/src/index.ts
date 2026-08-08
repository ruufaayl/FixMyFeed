/**
 * @fixmyfeed/config
 *
 * Configuration schema and startup validation. Public entry point (task T003).
 * Models exactly the variables in /ENVIRONMENT_VARIABLE_CATALOG.md; introduces
 * no new environment variable, service, or runtime dependency.
 */
export const workspaceName = "@fixmyfeed/config" as const;
export const workspaceKind = "package" as const;

export { loadConfig } from "./load.js";
export { ConfigValidationError, CONFIG_ERROR_CODE } from "./errors.js";
export type { ConfigIssue, ConfigIssueCode } from "./errors.js";
export {
  VARIABLES,
  SECRET_VARIABLES,
  NODE_ENVS,
  LOG_LEVELS,
  OBJECT_STORAGE_DRIVERS,
  WRITEBACK_SAFETY_MODES,
} from "./schema.js";
export type {
  AppConfig,
  FeatureFlags,
  LoadResult,
  ConfigContext,
  ProcessRole,
  NodeEnv,
  LogLevel,
  ObjectStorageDriver,
  VarSpec,
  VarKind,
  WritebackSafetyMode,
} from "./schema.js";
