import type { AppConfig } from "@fixmyfeed/config";
import { createAuthDatabaseAdapter, createUuidV7, type DatabaseClient } from "@fixmyfeed/database";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";

import { AuthConfigurationError } from "./errors.js";
import type {
  AuthEmailDelivery,
  AuthEmailMessage,
  AuthEmailPurpose,
  AuthTelemetry,
  AuthTelemetryEvent,
} from "./ports.js";

export type AuthApplicationConfig = Pick<AppConfig, "app" | "auth">;

export interface AuthRuntime {
  readonly handler: (request: Request) => Promise<Response>;
}

export interface AuthPolicy {
  readonly baseUrl: string;
  readonly trustedOrigins: readonly string[];
  readonly signUpEnabled: boolean;
  readonly emailVerificationRequired: true;
  readonly secureCookies: boolean;
  readonly sessionCookieCacheEnabled: false;
  readonly rateLimitStorage: "memory";
}

export interface AuthIntegration {
  readonly auth: AuthRuntime;
  readonly handler: AuthRuntime["handler"];
  readonly policy: AuthPolicy;
}

export interface CreateAuthOptions {
  readonly config: AuthApplicationConfig;
  readonly database: DatabaseClient;
  readonly emailDelivery?: AuthEmailDelivery;
  readonly telemetry?: AuthTelemetry;
  /** Test seam; production callers use the official database adapter. */
  readonly databaseAdapterFactory?: (
    client: DatabaseClient,
  ) => NonNullable<BetterAuthOptions["database"]>;
  /** Test seam; production callers use Better Auth minimal mode. */
  readonly betterAuthFactory?: (options: BetterAuthOptions) => AuthRuntime;
}

function normalizeOrigin(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new AuthConfigurationError();
  }

  const isLoopbackHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" ||
      url.hostname.endsWith(".localhost") ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]");

  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    (url.protocol === "http:" && !isLoopbackHttp) ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new AuthConfigurationError();
  }

  return url.origin;
}

function recordBestEffort(telemetry: AuthTelemetry | undefined, event: AuthTelemetryEvent): void {
  if (!telemetry) return;

  try {
    const result = telemetry.record(event);
    if (result) void Promise.resolve(result).catch(() => undefined);
  } catch {
    // Observability is non-authoritative and cannot alter authentication behavior.
  }
}

async function deliverEmail(
  delivery: AuthEmailDelivery,
  telemetry: AuthTelemetry | undefined,
  purpose: AuthEmailPurpose,
  message: Omit<AuthEmailMessage, "purpose">,
): Promise<void> {
  try {
    const boundedMessage: AuthEmailMessage = { purpose, ...message };
    if (purpose === "verify_email") {
      await delivery.sendVerificationEmail(boundedMessage);
    } else {
      await delivery.sendPasswordResetEmail(boundedMessage);
    }
    recordBestEffort(telemetry, { type: "auth_email_delivery", purpose, outcome: "succeeded" });
  } catch (error) {
    recordBestEffort(telemetry, { type: "auth_email_delivery", purpose, outcome: "failed" });
    throw error;
  }
}

function buildAuthOptions(options: CreateAuthOptions): {
  readonly authOptions: BetterAuthOptions;
  readonly policy: AuthPolicy;
} {
  const { config, emailDelivery, telemetry } = options;
  const secret = config?.auth?.secret;
  if (typeof secret !== "string" || secret.length < 32) {
    throw new AuthConfigurationError();
  }

  const baseUrl = normalizeOrigin(config.app.baseUrl);
  const secureCookies = baseUrl.startsWith("https://");
  const signUpEnabled = emailDelivery !== undefined;
  const databaseFactory = options.databaseAdapterFactory ?? createAuthDatabaseAdapter;
  let database: NonNullable<BetterAuthOptions["database"]>;
  try {
    database = databaseFactory(options.database);
  } catch {
    throw new AuthConfigurationError();
  }

  const emailVerification: NonNullable<BetterAuthOptions["emailVerification"]> = {
    sendOnSignUp: signUpEnabled,
    sendOnSignIn: signUpEnabled,
    autoSignInAfterVerification: false,
    ...(emailDelivery
      ? {
          sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) =>
            deliverEmail(emailDelivery, telemetry, "verify_email", { to: user.email, url }),
        }
      : {}),
  };

  const emailAndPassword: NonNullable<BetterAuthOptions["emailAndPassword"]> = {
    enabled: true,
    disableSignUp: !signUpEnabled,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    ...(emailDelivery
      ? {
          sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) =>
            deliverEmail(emailDelivery, telemetry, "reset_password", { to: user.email, url }),
        }
      : {}),
  };

  const authOptions: BetterAuthOptions = {
    appName: "FixMyFeed",
    baseURL: baseUrl,
    basePath: "/api/auth",
    secret,
    database,
    trustedOrigins: [baseUrl],
    emailVerification,
    emailAndPassword,
    user: { modelName: "users" },
    account: { modelName: "user_identities" },
    session: {
      modelName: "sessions",
      cookieCache: { enabled: false },
    },
    verification: {
      modelName: "authentication_verifications",
      storeIdentifier: "hashed",
    },
    rateLimit: {
      enabled: true,
      storage: "memory",
      window: 10,
      max: 100,
    },
    advanced: {
      useSecureCookies: secureCookies,
      disableCSRFCheck: false,
      disableOriginCheck: false,
      trustedProxyHeaders: false,
      database: { generateId: () => createUuidV7() },
    },
    telemetry: { enabled: false, debug: false },
    experimental: { joins: false },
  };

  const policy: AuthPolicy = Object.freeze({
    baseUrl,
    trustedOrigins: Object.freeze([baseUrl]),
    signUpEnabled,
    emailVerificationRequired: true,
    secureCookies,
    sessionCookieCacheEnabled: false,
    rateLimitStorage: "memory",
  });

  return { authOptions, policy };
}

export function createAuth(options: CreateAuthOptions): AuthIntegration {
  const { authOptions, policy } = buildAuthOptions(options);
  const authFactory = options.betterAuthFactory ?? ((config) => betterAuth(config));
  const auth = authFactory(authOptions);

  recordBestEffort(options.telemetry, {
    type: "auth_configured",
    emailDelivery: policy.signUpEnabled ? "available" : "unavailable",
    secureCookies: policy.secureCookies,
  });

  return Object.freeze({ auth, handler: auth.handler, policy });
}
