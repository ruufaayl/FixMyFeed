/**
 * Configuration schema & startup validation tests (task T003).
 *
 * Imports the built package (`tsc -b` emits dist/ before tests run in the
 * `check` and pre-push flows). Pure Node.js (node:test).
 *
 * Traceability: ENVIRONMENT_VARIABLE_CATALOG.md (closed variable set, required/
 * optional/failure semantics) and configuration-architecture.md (deterministic
 * startup validation, safe degradation, secret redaction).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadConfig,
  ConfigValidationError,
  CONFIG_ERROR_CODE,
  VARIABLES,
} from "../packages/config/dist/index.js";

const WEB = { role: "web" };

// Minimal env that satisfies the always-required variables.
const validSecret = "x".repeat(32);
const base = (overrides = {}) => ({
  NODE_ENV: "test",
  DATABASE_URL: "postgres://user:pass@localhost:5432/feeddb",
  AUTH_SECRET: validSecret,
  ...overrides,
});

function capture(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  return undefined;
}

test("catalog is closed and complete (43 variables, no duplicates)", () => {
  assert.equal(VARIABLES.length, 43);
  const names = VARIABLES.map((v) => v.name);
  assert.equal(new Set(names).size, names.length, "variable names must be unique");
  for (const required of ["DATABASE_URL", "AUTH_SECRET", "NODE_ENV", "BILLING_ENABLED"]) {
    assert.ok(names.includes(required), `catalog missing ${required}`);
  }
});

test("primary: minimal valid env loads with documented defaults", () => {
  const { config, features } = loadConfig(base(), WEB);
  assert.equal(config.nodeEnv, "test");
  assert.equal(config.role, "web");
  assert.equal(config.database.url, "postgres://user:pass@localhost:5432/feeddb");
  assert.equal(config.database.poolMax, 10);
  assert.equal(config.smtp.port, 587);
  assert.equal(config.logging.level, "info");
  assert.equal(config.objectStorage.driver, "filesystem");
  assert.equal(config.limits.tenantProduct, 5000);
  // Optional integrations disabled; documented always-on defaults on.
  assert.equal(features.objectStorage, "filesystem");
  assert.equal(features.shopify, false);
  assert.equal(features.billing, false);
  assert.equal(features.woocommerce, true);
  assert.equal(features.analytics, true);
});

test("failure: missing mandatory secrets aggregate into one error", () => {
  const err = capture(() => loadConfig({ NODE_ENV: "test" }, WEB));
  assert.ok(err instanceof ConfigValidationError);
  assert.equal(err.code, CONFIG_ERROR_CODE);
  const vars = err.issues.map((i) => i.variable);
  assert.ok(vars.includes("DATABASE_URL"));
  assert.ok(vars.includes("AUTH_SECRET"));
  assert.ok(err.issues.every((i) => i.code === "missing_required"));
});

test("failure: invalid values are rejected with ranges", () => {
  const poolErr = capture(() => loadConfig(base({ DATABASE_POOL_MAX: "0" }), WEB));
  assert.ok(poolErr instanceof ConfigValidationError);
  assert.ok(
    poolErr.issues.some((i) => i.variable === "DATABASE_POOL_MAX" && i.code === "invalid_value"),
  );

  const concErr = capture(() => loadConfig(base({ JOB_CONCURRENCY: "99" }), WEB));
  assert.ok(concErr.issues.some((i) => i.variable === "JOB_CONCURRENCY"));

  const authErr = capture(() => loadConfig(base({ AUTH_SECRET: "tooshort" }), WEB));
  assert.ok(authErr.issues.some((i) => i.variable === "AUTH_SECRET" && i.code === "invalid_value"));
});

test("production rules: https, s3 driver, and non-debug logging are enforced", () => {
  const err = capture(() =>
    loadConfig(
      base({
        NODE_ENV: "production",
        APP_BASE_URL: "http://insecure.example",
        OBJECT_STORAGE_DRIVER: "filesystem",
        LOG_LEVEL: "debug",
      }),
      WEB,
    ),
  );
  assert.ok(err instanceof ConfigValidationError);
  const byVar = new Map(err.issues.map((i) => [i.variable, i.code]));
  assert.equal(byVar.get("APP_BASE_URL"), "not_allowed_in_context");
  assert.equal(byVar.get("OBJECT_STORAGE_DRIVER"), "not_allowed_in_context");
  assert.equal(byVar.get("LOG_LEVEL"), "not_allowed_in_context");
});

test("billing fails closed: enabling it requires Stripe secrets", () => {
  const err = capture(() => loadConfig(base({ BILLING_ENABLED: "true" }), WEB));
  assert.ok(err instanceof ConfigValidationError);
  const vars = err.issues.map((i) => i.variable);
  assert.ok(vars.includes("STRIPE_SECRET_KEY"));
  assert.ok(vars.includes("STRIPE_WEBHOOK_SECRET"));
});

test("s3 driver requires a bucket", () => {
  const err = capture(() => loadConfig(base({ OBJECT_STORAGE_DRIVER: "s3" }), WEB));
  assert.ok(err instanceof ConfigValidationError);
  assert.ok(
    err.issues.some((i) => i.variable === "OBJECT_STORAGE_BUCKET" && i.code === "missing_required"),
  );
});

test("feature derivation: integrations enable only when fully configured", () => {
  const { features } = loadConfig(
    base({
      SHOPIFY_CLIENT_ID: "shop-id",
      SHOPIFY_CLIENT_SECRET: "shop-secret",
      DATA_ENCRYPTION_KEY: Buffer.alloc(32).toString("base64"),
      SMTP_HOST: "smtp.example.com",
      SMTP_FROM: "alerts@example.com",
    }),
    WEB,
  );
  assert.equal(features.shopify, true);
  assert.equal(features.google, false);
  assert.equal(features.connectorEncryption, true);
  assert.equal(features.email, true);
});

test("redaction: secrets are never echoed in the summary", () => {
  const { redactedSummary } = loadConfig(base(), WEB);
  assert.equal(redactedSummary.AUTH_SECRET, "***set***");
  assert.equal(redactedSummary.DATABASE_URL, "***set***");
  assert.notEqual(redactedSummary.AUTH_SECRET, validSecret);
  // Non-secret values are shown for operability.
  assert.equal(redactedSummary.NODE_ENV, "test");
  assert.equal(redactedSummary.STRIPE_SECRET_KEY, "(unset)");
});

test("invalid base64 encryption key is rejected", () => {
  const err = capture(() => loadConfig(base({ DATA_ENCRYPTION_KEY: "not-32-bytes" }), WEB));
  assert.ok(err instanceof ConfigValidationError);
  assert.ok(err.issues.some((i) => i.variable === "DATA_ENCRYPTION_KEY"));
});
