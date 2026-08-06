/**
 * @fixmyfeed/auth
 *
 * Better Auth core integration. Organization tenancy, MFA, and security-event
 * processing are added by their separately owned tasks.
 *
 * Boundary established by task T000 (see /boundaries.json and
 * docs/04-system-architecture/monorepo-architecture.md). Implementation is added
 * by later tasks; this module is intentionally inert.
 */
export const workspaceName = "@fixmyfeed/auth" as const;
export const workspaceKind = "package" as const;

export { AUTH_ERROR_CODE, AuthConfigurationError } from "./errors.js";
export { createAuth } from "./factory.js";
export type {
  AuthApplicationConfig,
  AuthIntegration,
  AuthPolicy,
  AuthRuntime,
  CreateAuthOptions,
} from "./factory.js";
export type {
  AuthEmailDelivery,
  AuthEmailMessage,
  AuthEmailPurpose,
  AuthTelemetry,
  AuthTelemetryEvent,
} from "./ports.js";
