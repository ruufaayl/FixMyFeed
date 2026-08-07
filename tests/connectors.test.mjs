/**
 * Connector capability and error contract tests (task T030).
 *
 * Imports the built @fixmyfeed/connectors package. Everything is pure — no
 * external providers or network.
 *
 * Traceability: docs/05-integrations/common/connector-contract.md,
 * connector-capability-model.md, connector-error-normalization.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  // errors
  ConnectorError,
  CONNECTOR_ERROR_CATEGORIES,
  isRetryableCategory,
  connectorErrorCode,
  categoryFromHttpStatus,
  normalizeConnectorError,
  // capabilities
  validateConnectorContract,
  supportsObject,
  supportsAuthMode,
  CONNECTOR_AUTH_MODES,
  // result
  ok,
  fail,
  isOk,
  unwrap,
} from "../packages/connectors/dist/index.js";

const validContract = () => ({
  connectorId: "shopify",
  displayName: "Shopify",
  authModes: ["oauth2"],
  objects: [
    { type: "product", scopes: ["read", "write"] },
    { type: "inventory", scopes: ["read"] },
  ],
  rateLimit: { requestsPerWindow: 40, windowSeconds: 1, retryAfterHonored: true },
  webhooks: { supported: true, verification: "hmac" },
  cursor: "opaque",
  apiVersions: { supported: ["2025-01", "2025-04"], default: "2025-04" },
});

// ---------------------------------------------------------------------------
// errors.ts
// ---------------------------------------------------------------------------

test("error taxonomy: retryability, codes, and http-status mapping", () => {
  assert.ok(CONNECTOR_ERROR_CATEGORIES.includes("rate_limit"));
  assert.equal(isRetryableCategory("rate_limit"), true);
  assert.equal(isRetryableCategory("upstream"), true);
  assert.equal(isRetryableCategory("authentication"), false);
  assert.equal(isRetryableCategory("validation"), false);
  assert.equal(connectorErrorCode("not_found"), "CONNECTOR_NOT_FOUND");

  assert.equal(categoryFromHttpStatus(401), "authentication");
  assert.equal(categoryFromHttpStatus(403), "authorization");
  assert.equal(categoryFromHttpStatus(404), "not_found");
  assert.equal(categoryFromHttpStatus(409), "conflict");
  assert.equal(categoryFromHttpStatus(422), "validation");
  assert.equal(categoryFromHttpStatus(429), "rate_limit");
  assert.equal(categoryFromHttpStatus(503), "upstream");
  assert.equal(categoryFromHttpStatus(418), "validation"); // other 4xx
});

test("ConnectorError: category-derived retryable, overridable", () => {
  const e = new ConnectorError("boom", "rate_limit", { providerCode: 429, retryAfterMs: 2000 });
  assert.equal(e.code, "CONNECTOR_RATE_LIMIT");
  assert.equal(e.retryable, true);
  assert.equal(e.providerCode, 429);
  assert.equal(e.retryAfterMs, 2000);
  const forced = new ConnectorError("x", "validation", { retryable: true });
  assert.equal(forced.retryable, true); // override wins
});

test("normalizeConnectorError: network, http, explicit, and unknown", () => {
  assert.equal(normalizeConnectorError({ networkError: true }).category, "network");
  assert.equal(normalizeConnectorError({ networkError: true }).retryable, true);
  assert.equal(normalizeConnectorError({ httpStatus: 429 }).category, "rate_limit");
  assert.equal(normalizeConnectorError({ httpStatus: 401 }).retryable, false);
  // explicit category wins over status
  assert.equal(normalizeConnectorError({ httpStatus: 500, category: "quota" }).category, "quota");
  // no signal -> unknown; providerCode falls back to httpStatus
  assert.equal(normalizeConnectorError({}).category, "unknown");
  assert.equal(normalizeConnectorError({ httpStatus: 404 }).providerCode, 404);
});

// ---------------------------------------------------------------------------
// capabilities.ts
// ---------------------------------------------------------------------------

test("validateConnectorContract: accepts a well-formed contract", () => {
  const c = validContract();
  assert.equal(validateConnectorContract(c), c);
  assert.ok(CONNECTOR_AUTH_MODES.includes("oauth2"));
});

test("validateConnectorContract: rejects malformed contracts", () => {
  const bad = [
    (c) => (c.connectorId = "Shopify"), // uppercase slug
    (c) => (c.connectorId = "1shop"), // must start with a letter
    (c) => (c.authModes = []), // empty
    (c) => (c.authModes = ["magic"]), // unknown mode
    (c) => (c.objects = []), // empty
    (c) => (c.objects = [{ type: "widget", scopes: ["read"] }]), // unknown type
    (c) => (c.objects = [{ type: "product", scopes: [] }]), // empty scopes
    (c) => (c.objects = [{ type: "product", scopes: ["delete"] }]), // unknown scope
    (c) => (c.rateLimit = { requestsPerWindow: 0, windowSeconds: 1 }), // non-positive
    (c) => (c.webhooks = { supported: true, verification: "none" }), // supported w/o verification
    (c) => (c.cursor = "magic"), // unknown cursor
    (c) => (c.apiVersions = { supported: ["a"], default: "b" }), // default not supported
  ];
  for (const mutate of bad) {
    const c = validContract();
    mutate(c);
    assert.throws(
      () => validateConnectorContract(c),
      (e) => e instanceof ConnectorError && e.category === "validation",
      `expected mutation to be rejected: ${mutate}`,
    );
  }
});

test("validateConnectorContract: rejects duplicate object types", () => {
  const c = validContract();
  c.objects = [
    { type: "product", scopes: ["read"] },
    { type: "product", scopes: ["write"] },
  ];
  assert.throws(() => validateConnectorContract(c), ConnectorError);
});

test("supportsObject / supportsAuthMode introspection", () => {
  const c = validContract();
  assert.equal(supportsObject(c, "product", "write"), true);
  assert.equal(supportsObject(c, "inventory", "write"), false); // read-only
  assert.equal(supportsObject(c, "order", "read"), false); // not declared
  assert.equal(supportsAuthMode(c, "oauth2"), true);
  assert.equal(supportsAuthMode(c, "api_key"), false);
});

// ---------------------------------------------------------------------------
// result.ts
// ---------------------------------------------------------------------------

test("result envelope: ok/fail/isOk/unwrap", () => {
  const good = ok({ id: 1 });
  assert.equal(isOk(good), true);
  assert.deepEqual(unwrap(good), { id: 1 });

  const err = new ConnectorError("nope", "not_found");
  const bad = fail(err);
  assert.equal(isOk(bad), false);
  assert.equal(bad.error, err);
  assert.throws(() => unwrap(bad), err);
});
