/**
 * Database schema and migration framework tests (task T010).
 *
 * Traceability: ADR-004 (PostgreSQL 17+), ADR-005 (Drizzle ORM),
 * logical-data-model.md, identifier-strategy.md, timestamp-and-time-zone-standard.md,
 * schema-versioning.md, and database-definition-of-done.md.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  DATABASE_ERROR_CODE,
  DatabaseConfigurationError,
  DatabaseMigrationError,
  createDatabaseClient,
  createDatabaseClientFromConfig,
  createUuidV7,
  isUuidV7,
  organizationId,
  primaryId,
  recordVersion,
  runDatabaseMigrations,
  tenantRecordColumns,
} from "../packages/database/dist/index.js";

const databasePackage = fileURLToPath(new URL("../packages/database/", import.meta.url));

test("primary: UUIDv7 identifiers are application-generated and timestamp ordered", () => {
  const earlier = createUuidV7(1_700_000_000_000);
  const later = createUuidV7(1_700_000_000_001);

  assert.match(earlier, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(isUuidV7(earlier), true);
  assert.equal(isUuidV7(later), true);
  assert.ok(earlier < later, "UUIDv7 lexical order must follow its millisecond timestamp");
});

test("failure: UUIDv7 generation rejects timestamps outside its 48-bit field", () => {
  for (const value of [-1, Number.NaN, 0x1_0000_0000_0000]) {
    assert.throws(() => createUuidV7(value), {
      name: "RangeError",
      message: "UUIDv7 timestamp must be an integer between 0 and 281474976710655",
    });
  }
  assert.equal(isUuidV7("not-a-uuid"), false);
});

test("primary: reusable columns encode the physical schema conventions", () => {
  const id = primaryId();
  const owner = organizationId();
  const version = recordVersion();
  const tenant = tenantRecordColumns();

  assert.equal(id.config.name, "id");
  assert.equal(id.config.primaryKey, true);
  assert.equal(id.config.hasDefault, true);
  assert.equal(owner.config.name, "organization_id");
  assert.equal(owner.config.notNull, true);
  assert.equal(version.config.name, "version");
  assert.equal(version.config.default, 1);
  assert.equal(version.config.notNull, true);
  assert.deepEqual(Object.keys(tenant), [
    "id",
    "organizationId",
    "createdAt",
    "updatedAt",
    "version",
  ]);
});

test("failure: database client rejects unsafe configuration without exposing credentials", () => {
  const secretUrl = "mysql://alice:super-secret@example.test/feed";
  const capture = () => createDatabaseClient({ url: secretUrl, poolMax: 0 });

  assert.throws(capture, (error) => {
    assert.ok(error instanceof DatabaseConfigurationError);
    assert.equal(error.code, DATABASE_ERROR_CODE.CONFIGURATION_INVALID);
    assert.doesNotMatch(error.message, /alice|super-secret/);
    return true;
  });
});

test("primary: database client construction is lazy and can close without connecting", async () => {
  const client = createDatabaseClient({
    url: "postgres://user:password@127.0.0.1:1/fixmyfeed",
    poolMax: 2,
  });

  assert.ok(client.db);
  assert.equal(typeof client.sql, "function");
  await client.close();
  await client.close();
});

test("primary: validated application config maps through the database adapter", async () => {
  const client = createDatabaseClientFromConfig(
    {
      database: {
        url: "postgresql://user:password@127.0.0.1:1/fixmyfeed",
        poolMax: 3,
      },
    },
    "fixmyfeed-test",
  );

  assert.ok(client.db);
  await client.close();
});

test("primary: migration runner emits safe lifecycle events and always closes", async () => {
  const events = [];
  let closed = 0;
  const fakeDb = {};

  const result = await runDatabaseMigrations({
    databaseUrl: "postgres://user:password@example.test/fixmyfeed",
    migrationsFolder: "C:\\synthetic\\migrations",
    onEvent: (event) => events.push(event),
    createClient: () => ({ db: fakeDb, close: async () => void (closed += 1) }),
    applyMigrations: async (db, options) => {
      assert.equal(db, fakeDb);
      assert.equal(options.migrationsFolder, "C:\\synthetic\\migrations");
    },
  });

  assert.deepEqual(result, { status: "completed" });
  assert.equal(closed, 1);
  assert.deepEqual(
    events.map((event) => event.type),
    ["migration_started", "migration_succeeded"],
  );
  assert.ok(events.every((event) => !JSON.stringify(event).includes("password")));
});

test("failure: migration errors are stable, redacted, observable, and close resources", async () => {
  const events = [];
  let closed = 0;
  const secret = "do-not-leak";

  await assert.rejects(
    runDatabaseMigrations({
      databaseUrl: `postgres://user:${secret}@example.test/fixmyfeed`,
      onEvent: (event) => events.push(event),
      createClient: () => ({ db: {}, close: async () => void (closed += 1) }),
      applyMigrations: async () => {
        throw new Error(`connection failed for ${secret}`);
      },
    }),
    (error) => {
      assert.ok(error instanceof DatabaseMigrationError);
      assert.equal(error.code, DATABASE_ERROR_CODE.MIGRATION_FAILED);
      assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    },
  );

  assert.equal(closed, 1);
  assert.deepEqual(
    events.map((event) => event.type),
    ["migration_started", "migration_failed"],
  );
  assert.ok(events.every((event) => !JSON.stringify(event).includes(secret)));
});

test("failure: migration teardown failure cannot emit a false success", async () => {
  const events = [];

  await assert.rejects(
    runDatabaseMigrations({
      databaseUrl: "postgres://user:secret@example.test/fixmyfeed",
      onEvent: (event) => events.push(event),
      createClient: () => ({
        db: {},
        close: async () => {
          throw new Error("socket teardown exposed secret");
        },
      }),
      applyMigrations: async () => {},
    }),
    (error) => {
      assert.ok(error instanceof DatabaseMigrationError);
      assert.equal(error.code, DATABASE_ERROR_CODE.MIGRATION_FAILED);
      assert.equal(error.message, "Database migration failed");
      return true;
    },
  );

  assert.deepEqual(
    events.map((event) => event.type),
    ["migration_started", "migration_failed"],
  );
});

test("contract: migration commands use reviewed files and expose no schema push shortcut", async () => {
  const packageJson = JSON.parse(await readFile(`${databasePackage}package.json`, "utf8"));
  const journal = JSON.parse(
    await readFile(`${databasePackage}drizzle/meta/_journal.json`, "utf8"),
  );
  const config = await readFile(`${databasePackage}drizzle.config.ts`, "utf8");

  assert.match(packageJson.scripts["db:generate"], /drizzle-kit generate/);
  assert.match(packageJson.scripts["db:check"], /drizzle-kit check/);
  assert.match(packageJson.scripts["db:migrate"], /drizzle-kit migrate/);
  assert.equal(packageJson.scripts["db:push"], undefined);
  assert.deepEqual(
    journal.entries.map((entry) => entry.tag),
    ["0000_t011_better_auth", "0001_t012_organizations_workspaces_memberships"],
  );
  assert.match(config, /strict: true/);
  assert.match(config, /schema: "\.\/src\/schema\.ts"/);
  assert.match(config, /table: "__drizzle_migrations"/);
});

test("failure: telemetry callback failure cannot block migration or leak its client", async () => {
  let applied = 0;
  let closed = 0;

  const result = await runDatabaseMigrations({
    databaseUrl: "postgres://user:secret@example.test/fixmyfeed",
    onEvent: () => {
      throw new Error("telemetry unavailable");
    },
    createClient: () => ({ db: {}, close: async () => void (closed += 1) }),
    applyMigrations: async () => void (applied += 1),
  });

  assert.deepEqual(result, { status: "completed" });
  assert.equal(applied, 1);
  assert.equal(closed, 1);
});
