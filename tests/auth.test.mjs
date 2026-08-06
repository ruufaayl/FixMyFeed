/**
 * Better Auth integration contract tests (task T011).
 *
 * Traceability: ADR-006 (Better Auth), security-architecture.md,
 * authentication-security.md, session-management.md, and the identity table
 * specifications in the Physical Schema Registry.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  authenticationVerifications,
  createDatabaseClient,
  createUuidV7,
  isUuidV7,
  schema,
  sessions,
  userIdentities,
  users,
} from "../packages/database/dist/index.js";
import {
  AUTH_ERROR_CODE,
  AuthConfigurationError,
  createAuth,
} from "../packages/auth/dist/index.js";

const validSecret = "a".repeat(32);
const tableName = (table) => table[Symbol.for("drizzle:Name")];
const tableColumns = (table) => table[Symbol.for("drizzle:Columns")];

function config(baseUrl = "https://app.example.test/path") {
  return {
    app: { baseUrl },
    auth: { secret: validSecret },
  };
}

function fakeDatabaseClient() {
  return {
    db: {},
    sql: () => {},
    close: async () => {},
  };
}

function captureAuth(overrides = {}) {
  let captured;
  const handler = async () => new Response(null, { status: 204 });
  const integration = createAuth({
    config: config(),
    database: fakeDatabaseClient(),
    databaseAdapterFactory: () => ({ adapterId: "test" }),
    betterAuthFactory: (options) => {
      captured = options;
      return { handler };
    },
    ...overrides,
  });

  return { captured, handler, integration };
}

test("schema: Better Auth tables remain present in the aggregated documented schema", () => {
  assert.deepEqual(Object.keys(schema).sort(), [
    "authenticationVerifications",
    "memberships",
    "organizations",
    "sessions",
    "userIdentities",
    "users",
    "workspaces",
  ]);

  assert.equal(tableName(users), "users");
  assert.equal(tableName(userIdentities), "user_identities");
  assert.equal(tableName(sessions), "sessions");
  assert.equal(tableName(authenticationVerifications), "authentication_verifications");
});

test("schema: core fields use Better Auth properties and approved SQL names", () => {
  assert.deepEqual(Object.keys(tableColumns(users)), [
    "id",
    "name",
    "email",
    "emailVerified",
    "image",
    "createdAt",
    "updatedAt",
  ]);
  assert.equal(users.emailVerified.name, "email_verified");
  assert.equal(userIdentities.accountId.name, "account_id");
  assert.equal(userIdentities.providerId.name, "provider_id");
  assert.equal(userIdentities.userId.name, "user_id");
  assert.equal(sessions.expiresAt.name, "expires_at");
  assert.equal(sessions.ipAddress.name, "ip_address");
  assert.equal(sessions.userAgent.name, "user_agent");
  assert.equal(authenticationVerifications.expiresAt.name, "expires_at");
});

test("schema: auth primary identifiers are application-generated UUIDv7 values", () => {
  assert.equal(users.id.hasDefault, true);
  assert.equal(isUuidV7(users.id.defaultFn()), true);
});

test("factory: configuration is explicit, origin-bound, and handler-ready", () => {
  const { captured, handler, integration } = captureAuth();

  assert.equal(integration.handler, handler);
  assert.equal(integration.auth.handler, handler);
  assert.deepEqual(integration.policy, {
    baseUrl: "https://app.example.test",
    trustedOrigins: ["https://app.example.test"],
    signUpEnabled: false,
    emailVerificationRequired: true,
    secureCookies: true,
    sessionCookieCacheEnabled: false,
    rateLimitStorage: "memory",
  });
  assert.equal(Object.isFrozen(integration.policy), true);
  assert.equal(captured.baseURL, "https://app.example.test");
  assert.deepEqual(captured.trustedOrigins, ["https://app.example.test"]);
  assert.equal(captured.secret, validSecret);
  assert.equal(captured.emailAndPassword.enabled, true);
  assert.equal(captured.emailAndPassword.disableSignUp, true);
  assert.equal(captured.emailAndPassword.requireEmailVerification, true);
  assert.equal(captured.emailVerification.sendVerificationEmail, undefined);
  assert.equal(captured.emailAndPassword.sendResetPassword, undefined);
  assert.equal(captured.verification.storeIdentifier, "hashed");
  assert.equal(captured.session.cookieCache.enabled, false);
  assert.equal(captured.advanced.useSecureCookies, true);
  assert.equal(captured.rateLimit.storage, "memory");
  assert.equal(captured.socialProviders, undefined);
  assert.equal(captured.plugins, undefined);
  assert.equal(captured.secondaryStorage, undefined);
  assert.equal(isUuidV7(captured.advanced.database.generateId()), true);
});

test("integration: official Drizzle adapter constructs a real Better Auth handler lazily", async () => {
  const database = createDatabaseClient({
    url: "postgresql://localhost:5432/fixmyfeed_t011_contract",
    poolMax: 1,
  });

  try {
    const integration = createAuth({ config: config(), database });

    assert.equal(typeof integration.handler, "function");
    assert.equal(integration.handler, integration.auth.handler);
  } finally {
    await database.close();
  }
});

test("factory: HTTP localhost does not receive falsely secure cookies", () => {
  const { captured, integration } = captureAuth({ config: config("http://localhost:3000/") });

  assert.equal(captured.advanced.useSecureCookies, false);
  assert.equal(integration.policy.secureCookies, false);
  assert.deepEqual(captured.trustedOrigins, ["http://localhost:3000"]);
});

test("failure: invalid base URLs and secrets are stable and redacted", () => {
  const visibleSecret = "visible-secret";
  const attempts = [
    { app: { baseUrl: "not a URL" }, auth: { secret: validSecret } },
    { app: { baseUrl: "https://user:password@example.test" }, auth: { secret: validSecret } },
    { app: { baseUrl: "https://example.test?next=evil" }, auth: { secret: validSecret } },
    { app: { baseUrl: "http://example.test" }, auth: { secret: validSecret } },
    { app: { baseUrl: "https://example.test" }, auth: { secret: visibleSecret } },
  ];

  for (const invalidConfig of attempts) {
    assert.throws(
      () =>
        createAuth({
          config: invalidConfig,
          database: fakeDatabaseClient(),
          databaseAdapterFactory: () => ({}),
          betterAuthFactory: () => ({ handler: async () => new Response() }),
        }),
      (error) => {
        assert.ok(error instanceof AuthConfigurationError);
        assert.equal(error.code, AUTH_ERROR_CODE.CONFIGURATION_INVALID);
        assert.doesNotMatch(error.message, /visible-secret|user|password|not a URL/);
        return true;
      },
    );
  }
});

test("email: injected delivery enables signup and receives only bounded messages", async () => {
  const messages = [];
  const emailDelivery = {
    sendVerificationEmail: async (message) => messages.push(message),
    sendPasswordResetEmail: async (message) => messages.push(message),
  };
  const { captured, integration } = captureAuth({ emailDelivery });

  assert.equal(integration.policy.signUpEnabled, true);
  assert.equal(captured.emailAndPassword.disableSignUp, false);

  const user = {
    id: createUuidV7(),
    name: "User",
    email: "user@example.test",
    emailVerified: false,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await captured.emailVerification.sendVerificationEmail({
    user,
    url: "https://app.example.test/verify?token=opaque",
    token: "must-not-be-forwarded-separately",
  });
  await captured.emailAndPassword.sendResetPassword({
    user,
    url: "https://app.example.test/reset?token=opaque",
    token: "must-not-be-forwarded-separately",
  });

  assert.deepEqual(messages, [
    {
      purpose: "verify_email",
      to: "user@example.test",
      url: "https://app.example.test/verify?token=opaque",
    },
    {
      purpose: "reset_password",
      to: "user@example.test",
      url: "https://app.example.test/reset?token=opaque",
    },
  ]);
});

test("observability: telemetry failure cannot block construction", () => {
  assert.doesNotThrow(() =>
    captureAuth({
      telemetry: {
        record: () => {
          throw new Error("telemetry unavailable");
        },
      },
    }),
  );
});

test("migration: reviewed SQL creates only the four core auth tables", async () => {
  const migration = await readFile(
    new URL("../packages/database/drizzle/0000_t011_better_auth.sql", import.meta.url),
    "utf8",
  );
  const journal = JSON.parse(
    await readFile(
      new URL("../packages/database/drizzle/meta/_journal.json", import.meta.url),
      "utf8",
    ),
  );

  assert.equal((migration.match(/CREATE TABLE/g) ?? []).length, 4);
  for (const table of ["authentication_verifications", "sessions", "user_identities", "users"]) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
  }
  assert.match(migration, /sessions_user_id_users_id_fk[\s\S]*ON DELETE restrict/);
  assert.match(migration, /user_identities_user_id_users_id_fk[\s\S]*ON DELETE restrict/);
  assert.match(migration, /CREATE UNIQUE INDEX "sessions_token_unique"/);
  assert.match(migration, /CREATE UNIQUE INDEX "users_email_unique"/);
  assert.match(migration, /CREATE UNIQUE INDEX "user_identities_provider_account_unique"/);
  assert.match(migration, /CREATE INDEX "authentication_verifications_expires_at_idx"/);
  assert.doesNotMatch(
    migration,
    /\bDROP\b|organizations|memberships|roles|mfa|security_events|rate_limit/i,
  );
  assert.deepEqual(
    journal.entries.map((entry) => entry.tag),
    ["0000_t011_better_auth"],
  );
});

test("dependencies: Better Auth packages are patch-pinned with the audited esbuild override", async () => {
  const [authPackage, databasePackage, workspace] = await Promise.all([
    readFile(new URL("../packages/auth/package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../packages/database/package.json", import.meta.url), "utf8").then(
      JSON.parse,
    ),
    readFile(new URL("../pnpm-workspace.yaml", import.meta.url), "utf8"),
  ]);

  assert.equal(authPackage.dependencies["better-auth"], "1.6.26");
  assert.equal(databasePackage.dependencies["@better-auth/drizzle-adapter"], "1.6.26");
  assert.match(workspace, /"@esbuild-kit\/core-utils>esbuild": 0\.25\.12/);
});

test("specifications: physical registry and table authorities match the implemented schema", async () => {
  const docsRoot = new URL(
    "../feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/docs/07-data-architecture/",
    import.meta.url,
  );
  const tableRoot = new URL("tables/identity-and-tenancy/", docsRoot);
  const [registry, usersSpec, identitiesSpec, sessionsSpec, verificationsSpec] = await Promise.all([
    readFile(new URL("PHYSICAL_SCHEMA_REGISTRY.md", docsRoot), "utf8"),
    readFile(new URL("users.md", tableRoot), "utf8"),
    readFile(new URL("user-identities.md", tableRoot), "utf8"),
    readFile(new URL("sessions.md", tableRoot), "utf8"),
    readFile(new URL("authentication-verifications.md", tableRoot), "utf8"),
  ]);

  for (const [table, count, path] of [
    ["users", 7, "users.md"],
    ["user_identities", 13, "user-identities.md"],
    ["sessions", 8, "sessions.md"],
    ["authentication_verifications", 6, "authentication-verifications.md"],
  ]) {
    const expectedRow = `| \`identity-and-tenancy\` | \`${table}\` | ${count} | \`docs/07-data-architecture/tables/identity-and-tenancy/${path}\` |`;
    assert.ok(registry.includes(expectedRow), `missing physical registry row: ${expectedRow}`);
  }

  assert.equal(Object.keys(tableColumns(users)).length, 7);
  assert.equal(Object.keys(tableColumns(userIdentities)).length, 13);
  assert.equal(Object.keys(tableColumns(sessions)).length, 8);
  assert.equal(Object.keys(tableColumns(authenticationVerifications)).length, 6);
  assert.match(usersSpec, /global Better Auth user identity/);
  assert.match(identitiesSpec, /user_identities_provider_account_unique/);
  assert.match(sessionsSpec, /session cookie cache|Cookie cache MUST remain disabled/i);
  assert.match(verificationsSpec, /identifier MUST be a deterministic hash/);
  assert.doesNotMatch(verificationsSpec, /\| `organization_id`/);
});
