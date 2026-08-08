/**
 * Configuration loading and startup validation (task T003).
 *
 * Deterministic, dependency-free. Parses an environment record against the
 * closed catalog schema, applies context-aware cross-field rules, and either
 * returns a typed configuration with derived feature flags or throws a single
 * aggregated ConfigValidationError. Secrets are never echoed in errors or the
 * redacted summary.
 *
 * Semantics (per ENVIRONMENT_VARIABLE_CATALOG.md):
 *   - Missing mandatory secrets stop startup.
 *   - Missing optional integration values disable only that integration.
 *   - Behaviour degrades safely; nothing is inferred.
 */
import {
  VARIABLES,
  type AppConfig,
  type ConfigContext,
  type FeatureFlags,
  type LoadResult,
  type NodeEnv,
  type ObjectStorageDriver,
  type LogLevel,
  type VarSpec,
  type WritebackSafetyMode,
} from "./schema.js";
import { ConfigValidationError, type ConfigIssue } from "./errors.js";
import {
  coerceBase64Key,
  coerceBoolean,
  coerceDecimal,
  coerceDsn,
  coerceEnum,
  coerceHostname,
  coerceInteger,
  coerceMailbox,
  coerceSecret,
  coerceString,
  coerceUrl,
  type CoerceResult,
} from "./coerce.js";

type Primitive = string | number | boolean;

function coerceValue(spec: VarSpec, raw: string): CoerceResult<Primitive> {
  switch (spec.kind) {
    case "enum":
      return coerceEnum(raw, spec.enumValues ?? []);
    case "boolean":
      return coerceBoolean(raw);
    case "integer":
      return coerceInteger(raw, { min: spec.min, max: spec.max });
    case "decimal":
      return coerceDecimal(raw, { min: spec.min });
    case "url":
      return coerceUrl(raw);
    case "dsn":
      return coerceDsn(raw);
    case "base64key":
      return coerceBase64Key(raw, spec.bytes ?? 32);
    case "secret":
      return coerceSecret(raw, spec.bytes ?? 1);
    case "mailbox":
      return coerceMailbox(raw);
    case "hostname":
      return coerceHostname(raw);
    case "string":
      return coerceString(raw);
  }
}

/**
 * Loads and validates configuration for the given process role.
 * @throws ConfigValidationError when one or more fatal issues are found.
 */
export function loadConfig(
  env: Record<string, string | undefined>,
  context: ConfigContext,
): LoadResult {
  const issues: ConfigIssue[] = [];
  const values = new Map<string, Primitive>();

  for (const spec of VARIABLES) {
    const rawValue = env[spec.name];
    const raw = typeof rawValue === "string" ? rawValue.trim() : "";
    const provided = raw.length > 0;
    const effective = provided ? raw : spec.default;

    if (effective === undefined) {
      if (spec.alwaysRequired) {
        issues.push({
          variable: spec.name,
          code: "missing_required",
          message: "is required but was not set",
        });
      }
      continue;
    }

    const result = coerceValue(spec, effective);
    if (result.ok) {
      values.set(spec.name, result.value);
    } else {
      issues.push({ variable: spec.name, code: "invalid_value", message: result.message });
    }
  }

  const str = (name: string): string | undefined => {
    const v = values.get(name);
    return typeof v === "string" ? v : undefined;
  };
  const num = (name: string): number | undefined => {
    const v = values.get(name);
    return typeof v === "number" ? v : undefined;
  };
  const bool = (name: string): boolean | undefined => {
    const v = values.get(name);
    return typeof v === "boolean" ? v : undefined;
  };

  const nodeEnv = (str("NODE_ENV") ?? "development") as NodeEnv;
  const isProduction = nodeEnv === "production";

  // Context-aware cross-field rules (only meaningful once base values coerced).
  if (isProduction) {
    const baseUrl = str("APP_BASE_URL");
    if (baseUrl !== undefined && !baseUrl.startsWith("https://")) {
      issues.push({
        variable: "APP_BASE_URL",
        code: "not_allowed_in_context",
        message: "must use https in production",
      });
    }
    if (str("OBJECT_STORAGE_DRIVER") === "filesystem") {
      issues.push({
        variable: "OBJECT_STORAGE_DRIVER",
        code: "not_allowed_in_context",
        message: "filesystem driver is not allowed in production; use s3",
      });
    }
    if (str("LOG_LEVEL") === "debug") {
      issues.push({
        variable: "LOG_LEVEL",
        code: "not_allowed_in_context",
        message: "debug log level is not allowed in production",
      });
    }
  }

  if (str("OBJECT_STORAGE_DRIVER") === "s3" && str("OBJECT_STORAGE_BUCKET") === undefined) {
    issues.push({
      variable: "OBJECT_STORAGE_BUCKET",
      code: "missing_required",
      message: "is required when OBJECT_STORAGE_DRIVER is s3",
    });
  }

  if (bool("BILLING_ENABLED") === true) {
    if (str("STRIPE_SECRET_KEY") === undefined) {
      issues.push({
        variable: "STRIPE_SECRET_KEY",
        code: "missing_required",
        message: "is required when BILLING_ENABLED is true",
      });
    }
    if (str("STRIPE_WEBHOOK_SECRET") === undefined) {
      issues.push({
        variable: "STRIPE_WEBHOOK_SECRET",
        code: "missing_required",
        message: "is required when BILLING_ENABLED is true",
      });
    }
  }

  if (issues.length > 0) {
    throw new ConfigValidationError(issues);
  }

  const required = (name: string): string => {
    const v = str(name);
    if (v === undefined) {
      // Unreachable: alwaysRequired vars are validated above.
      throw new ConfigValidationError([
        { variable: name, code: "missing_required", message: "is required but was not set" },
      ]);
    }
    return v;
  };

  const driver = (str("OBJECT_STORAGE_DRIVER") ?? "filesystem") as ObjectStorageDriver;
  const s3Complete =
    str("OBJECT_STORAGE_BUCKET") !== undefined &&
    str("OBJECT_STORAGE_ACCESS_KEY_ID") !== undefined &&
    str("OBJECT_STORAGE_SECRET_ACCESS_KEY") !== undefined;

  const features: FeatureFlags = {
    objectStorage: driver === "filesystem" ? "filesystem" : s3Complete ? "s3" : "disabled",
    email: str("SMTP_HOST") !== undefined && str("SMTP_FROM") !== undefined,
    shopify: str("SHOPIFY_CLIENT_ID") !== undefined && str("SHOPIFY_CLIENT_SECRET") !== undefined,
    google: str("GOOGLE_CLIENT_ID") !== undefined && str("GOOGLE_CLIENT_SECRET") !== undefined,
    woocommerce: bool("WOOCOMMERCE_CONNECTOR_ENABLED") ?? true,
    billing: bool("BILLING_ENABLED") ?? false,
    publicTools: bool("PUBLIC_TOOLS_ENABLED") ?? false,
    turnstile: str("TURNSTILE_SITE_KEY") !== undefined && str("TURNSTILE_SECRET_KEY") !== undefined,
    automatedWriteback: bool("AUTOMATED_WRITEBACK_ENABLED") ?? false,
    aiAssistance: bool("AI_ASSISTANCE_ENABLED") ?? false,
    analytics: bool("ANALYTICS_ENABLED") ?? true,
    connectorEncryption: str("DATA_ENCRYPTION_KEY") !== undefined,
    sentry: str("SENTRY_DSN") !== undefined,
  };

  const config: AppConfig = {
    nodeEnv,
    role: context.role,
    app: { baseUrl: str("APP_BASE_URL") ?? "http://localhost:3000" },
    database: { url: required("DATABASE_URL"), poolMax: num("DATABASE_POOL_MAX") ?? 10 },
    auth: { secret: required("AUTH_SECRET") },
    encryption: {
      dataKey: str("DATA_ENCRYPTION_KEY"),
      previousDataKey: str("PREVIOUS_DATA_ENCRYPTION_KEY"),
    },
    jobs: {
      workerEnabled: bool("JOB_WORKER_ENABLED") ?? false,
      concurrency: num("JOB_CONCURRENCY") ?? 4,
    },
    objectStorage: {
      driver,
      endpoint: str("OBJECT_STORAGE_ENDPOINT"),
      bucket: str("OBJECT_STORAGE_BUCKET"),
      accessKeyId: str("OBJECT_STORAGE_ACCESS_KEY_ID"),
      secretAccessKey: str("OBJECT_STORAGE_SECRET_ACCESS_KEY"),
    },
    smtp: {
      host: str("SMTP_HOST"),
      port: num("SMTP_PORT") ?? 587,
      username: str("SMTP_USERNAME"),
      password: str("SMTP_PASSWORD"),
      from: str("SMTP_FROM"),
    },
    turnstile: { siteKey: str("TURNSTILE_SITE_KEY"), secretKey: str("TURNSTILE_SECRET_KEY") },
    shopify: {
      clientId: str("SHOPIFY_CLIENT_ID"),
      clientSecret: str("SHOPIFY_CLIENT_SECRET"),
      appUrl: str("SHOPIFY_APP_URL") ?? str("APP_BASE_URL") ?? "http://localhost:3000",
    },
    google: {
      clientId: str("GOOGLE_CLIENT_ID"),
      clientSecret: str("GOOGLE_CLIENT_SECRET"),
      oauthRedirectUri: str("GOOGLE_OAUTH_REDIRECT_URI"),
    },
    woocommerce: { connectorEnabled: bool("WOOCOMMERCE_CONNECTOR_ENABLED") ?? true },
    billing: {
      enabled: bool("BILLING_ENABLED") ?? false,
      stripeSecretKey: str("STRIPE_SECRET_KEY"),
      stripeWebhookSecret: str("STRIPE_WEBHOOK_SECRET"),
    },
    publicTools: { enabled: bool("PUBLIC_TOOLS_ENABLED") ?? false },
    writeback: {
      automatedEnabled: bool("AUTOMATED_WRITEBACK_ENABLED") ?? false,
      safetyMode: (str("WRITEBACK_SAFETY_MODE") ?? "dev_store_only") as WritebackSafetyMode,
      allowedShops: parseShopList(str("WRITEBACK_ALLOWED_SHOPS")),
    },
    ai: {
      assistanceEnabled: bool("AI_ASSISTANCE_ENABLED") ?? false,
      localModelBaseUrl: str("LOCAL_MODEL_BASE_URL") ?? "http://localhost:11434",
    },
    analytics: { enabled: bool("ANALYTICS_ENABLED") ?? true },
    logging: { level: (str("LOG_LEVEL") ?? "info") as LogLevel },
    sentry: { dsn: str("SENTRY_DSN") },
    cost: { monthlyExternalCapUsd: num("MONTHLY_EXTERNAL_COST_CAP_USD") ?? 0 },
    limits: {
      anonymousScanDaily: num("ANONYMOUS_SCAN_DAILY_LIMIT") ?? 3,
      tenantProduct: num("TENANT_PRODUCT_LIMIT") ?? 5000,
      tempFileRetentionHours: num("TEMP_FILE_RETENTION_HOURS") ?? 24,
      exportRetentionDays: num("EXPORT_RETENTION_DAYS") ?? 7,
    },
  };

  return { config, features, redactedSummary: buildRedactedSummary(values) };
}

/** Splits a comma-separated shop allowlist into trimmed, lower-cased entries. */
function parseShopList(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim() === "") return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

/** Builds a secret-safe summary: secrets become set/unset, others show values. */
function buildRedactedSummary(values: Map<string, Primitive>): Record<string, string> {
  const summary: Record<string, string> = {};
  for (const spec of VARIABLES) {
    const present = values.has(spec.name);
    if (spec.secret) {
      summary[spec.name] = present ? "***set***" : "(unset)";
    } else {
      const v = values.get(spec.name);
      summary[spec.name] = present ? String(v) : "(unset)";
    }
  }
  return summary;
}
