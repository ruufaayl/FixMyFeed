/**
 * Configuration schema (task T003).
 *
 * A declarative, closed model of every permitted runtime variable defined in
 * /ENVIRONMENT_VARIABLE_CATALOG.md. No variable outside this catalog may be
 * introduced (AGENTS.md; ENVIRONMENT_VARIABLE_CATALOG functional requirements).
 */

export type ProcessRole = "web" | "worker" | "maintenance";
export type NodeEnv = "development" | "test" | "production";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type ObjectStorageDriver = "filesystem" | "s3";

export interface ConfigContext {
  /** Which process is starting up; affects which variables are required. */
  readonly role: ProcessRole;
}

export type VarKind =
  | "enum"
  | "boolean"
  | "integer"
  | "decimal"
  | "url"
  | "dsn"
  | "base64key"
  | "secret"
  | "mailbox"
  | "hostname"
  | "string";

export interface VarSpec {
  readonly name: string;
  readonly kind: VarKind;
  readonly secret: boolean;
  /** Safe default (string form) applied when the value is absent, or undefined. */
  readonly default?: string;
  /** Value is fatal-required in every context when true. */
  readonly alwaysRequired?: boolean;
  readonly enumValues?: readonly string[];
  readonly min?: number;
  readonly max?: number;
  /** Decoded byte length for base64key, or minimum byte length for secret. */
  readonly bytes?: number;
}

export const NODE_ENVS = ["development", "test", "production"] as const;
export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export const OBJECT_STORAGE_DRIVERS = ["filesystem", "s3"] as const;

/**
 * The authoritative variable list, mirroring ENVIRONMENT_VARIABLE_CATALOG.md.
 * Order follows the catalog groups: application, database, auth, encryption,
 * jobs, storage, email, anti-abuse, Shopify, Google, WooCommerce, billing,
 * feature flags, observability, and limits.
 */
export const VARIABLES: readonly VarSpec[] = [
  { name: "NODE_ENV", kind: "enum", secret: false, default: "development", enumValues: NODE_ENVS },
  { name: "APP_BASE_URL", kind: "url", secret: false, default: "http://localhost:3000" },

  { name: "DATABASE_URL", kind: "dsn", secret: true, alwaysRequired: true },
  { name: "DATABASE_POOL_MAX", kind: "integer", secret: false, default: "10", min: 1, max: 100 },

  { name: "AUTH_SECRET", kind: "secret", secret: true, alwaysRequired: true, bytes: 32 },

  { name: "DATA_ENCRYPTION_KEY", kind: "base64key", secret: true, bytes: 32 },
  { name: "PREVIOUS_DATA_ENCRYPTION_KEY", kind: "base64key", secret: true, bytes: 32 },

  { name: "JOB_WORKER_ENABLED", kind: "boolean", secret: false, default: "false" },
  { name: "JOB_CONCURRENCY", kind: "integer", secret: false, default: "4", min: 1, max: 32 },

  {
    name: "OBJECT_STORAGE_DRIVER",
    kind: "enum",
    secret: false,
    default: "filesystem",
    enumValues: OBJECT_STORAGE_DRIVERS,
  },
  { name: "OBJECT_STORAGE_ENDPOINT", kind: "url", secret: false },
  { name: "OBJECT_STORAGE_BUCKET", kind: "string", secret: false },
  { name: "OBJECT_STORAGE_ACCESS_KEY_ID", kind: "string", secret: true },
  { name: "OBJECT_STORAGE_SECRET_ACCESS_KEY", kind: "string", secret: true },

  { name: "SMTP_HOST", kind: "hostname", secret: false },
  { name: "SMTP_PORT", kind: "integer", secret: false, default: "587", min: 1, max: 65535 },
  { name: "SMTP_USERNAME", kind: "string", secret: true },
  { name: "SMTP_PASSWORD", kind: "string", secret: true },
  { name: "SMTP_FROM", kind: "mailbox", secret: false },

  { name: "TURNSTILE_SITE_KEY", kind: "string", secret: false },
  { name: "TURNSTILE_SECRET_KEY", kind: "string", secret: true },

  { name: "SHOPIFY_CLIENT_ID", kind: "string", secret: false },
  { name: "SHOPIFY_CLIENT_SECRET", kind: "string", secret: true },
  { name: "SHOPIFY_APP_URL", kind: "url", secret: false },

  { name: "GOOGLE_CLIENT_ID", kind: "string", secret: false },
  { name: "GOOGLE_CLIENT_SECRET", kind: "string", secret: true },
  { name: "GOOGLE_OAUTH_REDIRECT_URI", kind: "url", secret: false },

  { name: "WOOCOMMERCE_CONNECTOR_ENABLED", kind: "boolean", secret: false, default: "true" },

  { name: "BILLING_ENABLED", kind: "boolean", secret: false, default: "false" },
  { name: "STRIPE_SECRET_KEY", kind: "string", secret: true },
  { name: "STRIPE_WEBHOOK_SECRET", kind: "string", secret: true },

  { name: "PUBLIC_TOOLS_ENABLED", kind: "boolean", secret: false, default: "false" },
  { name: "AUTOMATED_WRITEBACK_ENABLED", kind: "boolean", secret: false, default: "false" },
  { name: "AI_ASSISTANCE_ENABLED", kind: "boolean", secret: false, default: "false" },
  {
    name: "LOCAL_MODEL_BASE_URL",
    kind: "url",
    secret: false,
    default: "http://localhost:11434",
  },
  { name: "ANALYTICS_ENABLED", kind: "boolean", secret: false, default: "true" },

  { name: "LOG_LEVEL", kind: "enum", secret: false, default: "info", enumValues: LOG_LEVELS },
  { name: "SENTRY_DSN", kind: "url", secret: false },

  { name: "MONTHLY_EXTERNAL_COST_CAP_USD", kind: "decimal", secret: false, default: "0", min: 0 },
  { name: "ANONYMOUS_SCAN_DAILY_LIMIT", kind: "integer", secret: false, default: "3", min: 0 },
  { name: "TENANT_PRODUCT_LIMIT", kind: "integer", secret: false, default: "5000", min: 1 },
  {
    name: "TEMP_FILE_RETENTION_HOURS",
    kind: "integer",
    secret: false,
    default: "24",
    min: 1,
    max: 168,
  },
  { name: "EXPORT_RETENTION_DAYS", kind: "integer", secret: false, default: "7", min: 1, max: 30 },
] as const;

export const SECRET_VARIABLES: ReadonlySet<string> = new Set(
  VARIABLES.filter((v) => v.secret).map((v) => v.name),
);

/** Feature availability derived from configuration (safe degradation). */
export interface FeatureFlags {
  readonly objectStorage: "filesystem" | "s3" | "disabled";
  readonly email: boolean;
  readonly shopify: boolean;
  readonly google: boolean;
  readonly woocommerce: boolean;
  readonly billing: boolean;
  readonly publicTools: boolean;
  readonly turnstile: boolean;
  readonly automatedWriteback: boolean;
  readonly aiAssistance: boolean;
  readonly analytics: boolean;
  readonly connectorEncryption: boolean;
  readonly sentry: boolean;
}

/** Fully validated, typed application configuration. */
export interface AppConfig {
  readonly nodeEnv: NodeEnv;
  readonly role: ProcessRole;
  readonly app: { readonly baseUrl: string };
  readonly database: { readonly url: string; readonly poolMax: number };
  readonly auth: { readonly secret: string };
  readonly encryption: {
    readonly dataKey: string | undefined;
    readonly previousDataKey: string | undefined;
  };
  readonly jobs: { readonly workerEnabled: boolean; readonly concurrency: number };
  readonly objectStorage: {
    readonly driver: ObjectStorageDriver;
    readonly endpoint: string | undefined;
    readonly bucket: string | undefined;
    readonly accessKeyId: string | undefined;
    readonly secretAccessKey: string | undefined;
  };
  readonly smtp: {
    readonly host: string | undefined;
    readonly port: number;
    readonly username: string | undefined;
    readonly password: string | undefined;
    readonly from: string | undefined;
  };
  readonly turnstile: {
    readonly siteKey: string | undefined;
    readonly secretKey: string | undefined;
  };
  readonly shopify: {
    readonly clientId: string | undefined;
    readonly clientSecret: string | undefined;
    readonly appUrl: string;
  };
  readonly google: {
    readonly clientId: string | undefined;
    readonly clientSecret: string | undefined;
    readonly oauthRedirectUri: string | undefined;
  };
  readonly woocommerce: { readonly connectorEnabled: boolean };
  readonly billing: {
    readonly enabled: boolean;
    readonly stripeSecretKey: string | undefined;
    readonly stripeWebhookSecret: string | undefined;
  };
  readonly publicTools: { readonly enabled: boolean };
  readonly writeback: { readonly automatedEnabled: boolean };
  readonly ai: { readonly assistanceEnabled: boolean; readonly localModelBaseUrl: string };
  readonly analytics: { readonly enabled: boolean };
  readonly logging: { readonly level: LogLevel };
  readonly sentry: { readonly dsn: string | undefined };
  readonly cost: { readonly monthlyExternalCapUsd: number };
  readonly limits: {
    readonly anonymousScanDaily: number;
    readonly tenantProduct: number;
    readonly tempFileRetentionHours: number;
    readonly exportRetentionDays: number;
  };
}

export interface LoadResult {
  readonly config: AppConfig;
  readonly features: FeatureFlags;
  /** Secret-safe view suitable for logging at startup. */
  readonly redactedSummary: Readonly<Record<string, string>>;
}
