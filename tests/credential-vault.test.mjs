import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { inspect } from "node:util";
import { fileURLToPath } from "node:url";

import * as database from "../packages/database/dist/index.js";

const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const { getTableConfig } = databaseRequire("drizzle-orm/pg-core");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const ACTIVE_KEY = Buffer.alloc(32, 0x41).toString("base64");
const PREVIOUS_KEY = Buffer.alloc(32, 0x42).toString("base64");

const context = {
  credentialId: "01988fa6-9328-7000-8000-000000000001",
  organizationId: "01988fa6-9328-7000-8000-000000000002",
  provider: "shopify",
  credentialType: "access_token",
};

function createMemoryCredentialPersistence() {
  const rows = [];

  return {
    rows,
    async insert(input) {
      const existing = rows.find(
        (row) =>
          row.organizationId === input.organizationId &&
          row.createdByUserId === input.createdByUserId &&
          row.idempotencyKey === input.idempotencyKey,
      );
      if (existing !== undefined) return { record: existing, inserted: false };
      const now = new Date("2026-08-06T12:00:00.000Z");
      const record = {
        ...input,
        status: "active",
        revokedAt: null,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };
      rows.push(record);
      return { record, inserted: true };
    },
    async findById(input) {
      return rows.find(
        (row) => row.organizationId === input.organizationId && row.id === input.credentialId,
      );
    },
    async replaceEnvelope(input) {
      const record = rows.find(
        (row) => row.organizationId === input.organizationId && row.id === input.credentialId,
      );
      if (record === undefined || record.version !== input.expectedVersion) return undefined;
      Object.assign(record, input.envelope, {
        updatedAt: new Date("2026-08-06T12:05:00.000Z"),
        version: record.version + 1,
      });
      return record;
    },
    async revoke(input) {
      const record = rows.find(
        (row) => row.organizationId === input.organizationId && row.id === input.credentialId,
      );
      if (record === undefined || record.version !== input.expectedVersion) return undefined;
      Object.assign(record, {
        status: "revoked",
        revokedAt: input.revokedAt,
        updatedAt: input.revokedAt,
        version: record.version + 1,
      });
      return record;
    },
  };
}

test("authenticated envelope round-trips binary credentials without deterministic ciphertext", () => {
  assert.equal(typeof database.createCredentialCipher, "function");

  const cipher = database.createCredentialCipher({ activeKey: ACTIVE_KEY });
  const plaintext = Buffer.from("secret\0credential\u{1f512}", "utf8");
  const first = cipher.encrypt({ ...context, plaintext });
  const second = cipher.encrypt({ ...context, plaintext });

  assert.equal(first.algorithm, "aes-256-gcm");
  assert.equal(first.nonce.length, 12);
  assert.equal(first.authTag.length, 16);
  assert.equal(first.keyId.length, 64);
  assert.notDeepEqual(first.nonce, second.nonce);
  assert.notDeepEqual(first.ciphertext, second.ciphertext);

  const decrypted = cipher.decrypt({ ...context, envelope: first });
  assert.deepEqual(decrypted.plaintext, plaintext);
  assert.equal(decrypted.requiresRotation, false);
});

test("authenticated data rejects cross-tenant ciphertext with a stable redacted error", () => {
  const cipher = database.createCredentialCipher({ activeKey: ACTIVE_KEY });
  const plaintext = Buffer.from("never-log-this-secret", "utf8");
  const envelope = cipher.encrypt({ ...context, plaintext });

  assert.throws(
    () =>
      cipher.decrypt({
        ...context,
        organizationId: "01988fa6-9328-7000-8000-000000000099",
        envelope,
      }),
    (error) => {
      assert.equal(error?.code, "credential_decryption_failed");
      assert.equal(error?.message, "Credential decryption failed.");
      assert.doesNotMatch(String(error), /never-log-this-secret|QUFBQUFB/);
      return true;
    },
  );
});

test("decrypt rejects tampered envelope metadata before returning plaintext", () => {
  const cipher = database.createCredentialCipher({ activeKey: ACTIVE_KEY });
  const envelope = cipher.encrypt({
    ...context,
    plaintext: Buffer.from("metadata-bound-secret"),
  });

  assert.throws(
    () =>
      cipher.decrypt({
        ...context,
        envelope: { ...envelope, algorithm: "aes-128-gcm" },
      }),
    (error) => {
      assert.equal(error?.code, "credential_decryption_failed");
      assert.equal(error?.message, "Credential decryption failed.");
      return true;
    },
  );
});

test("previous key decrypts old envelopes and marks them for rotation", () => {
  const oldCipher = database.createCredentialCipher({ activeKey: PREVIOUS_KEY });
  const oldEnvelope = oldCipher.encrypt({
    ...context,
    plaintext: Buffer.from("rotate-me", "utf8"),
  });
  const rotatingCipher = database.createCredentialCipher({
    activeKey: ACTIVE_KEY,
    previousKey: PREVIOUS_KEY,
  });

  const decrypted = rotatingCipher.decrypt({ ...context, envelope: oldEnvelope });

  assert.equal(decrypted.plaintext.toString("utf8"), "rotate-me");
  assert.equal(decrypted.requiresRotation, true);
  assert.notEqual(rotatingCipher.activeKeyId, oldEnvelope.keyId);
});

test("invalid encryption keys fail closed without echoing key material", () => {
  assert.throws(
    () => database.createCredentialCipher({ activeKey: "not-a-valid-key" }),
    (error) => {
      assert.equal(error?.code, "credential_configuration_invalid");
      assert.equal(error?.message, "Credential vault configuration is invalid.");
      assert.doesNotMatch(String(error), /not-a-valid-key/);
      return true;
    },
  );
});

test("encrypted_credentials exposes the approved tenant-owned 17-column envelope", () => {
  assert.equal(typeof database.encryptedCredentials, "object");
  const config = getTableConfig(database.encryptedCredentials);
  assert.equal(config.name, "encrypted_credentials");
  assert.deepEqual(config.columns.map((column) => column.name).sort(), [
    "algorithm",
    "auth_tag",
    "ciphertext",
    "created_at",
    "created_by_user_id",
    "credential_type",
    "expires_at",
    "id",
    "idempotency_key",
    "key_id",
    "nonce",
    "organization_id",
    "provider",
    "revoked_at",
    "status",
    "updated_at",
    "version",
  ]);
  assert.equal(config.columns.find((column) => column.name === "organization_id").notNull, true);
  assert.equal(config.columns.find((column) => column.name === "ciphertext").notNull, true);
  assert.ok(
    config.indexes.some(
      (index) => index.config.name === "encrypted_credentials_tenant_created_idx",
    ),
  );
});

test("vault stores metadata only and clears callback plaintext after tenant-scoped access", async () => {
  assert.equal(typeof database.createCredentialVault, "function");
  const persistence = createMemoryCredentialPersistence();
  const vault = database.createCredentialVault({
    cipher: database.createCredentialCipher({ activeKey: ACTIVE_KEY }),
    persistence,
  });
  const secret = Buffer.from("callback-only-secret", "utf8");

  const metadata = await vault.store({
    organizationId: context.organizationId,
    provider: context.provider,
    credentialType: context.credentialType,
    createdByUserId: "01988fa6-9328-7000-8000-000000000003",
    idempotencyKey: "install-shopify-1",
    plaintext: secret,
  });

  assert.equal(metadata.organizationId, context.organizationId);
  assert.equal(metadata.status, "active");
  assert.equal("ciphertext" in metadata, false);
  assert.equal("plaintext" in metadata, false);
  assert.doesNotMatch(JSON.stringify(metadata), /callback-only-secret|QUFBQUFB/);

  let callbackBuffer;
  const length = await vault.withCredential(
    { organizationId: context.organizationId, credentialId: metadata.id },
    (plaintext) => {
      callbackBuffer = plaintext;
      assert.equal(plaintext.toString("utf8"), "callback-only-secret");
      return plaintext.length;
    },
  );

  assert.equal(length, secret.length);
  assert.deepEqual(callbackBuffer, Buffer.alloc(secret.length));
});

test("tenant-scoped access conceals credentials owned by another organization", async () => {
  const persistence = createMemoryCredentialPersistence();
  const vault = database.createCredentialVault({
    cipher: database.createCredentialCipher({ activeKey: ACTIVE_KEY }),
    persistence,
  });
  const stored = await vault.store({
    organizationId: context.organizationId,
    provider: context.provider,
    credentialType: context.credentialType,
    createdByUserId: "01988fa6-9328-7000-8000-000000000003",
    idempotencyKey: "tenant-isolation-1",
    plaintext: Buffer.from("tenant-secret"),
  });

  await assert.rejects(
    vault.withCredential(
      {
        organizationId: "01988fa6-9328-7000-8000-000000000099",
        credentialId: stored.id,
      },
      () => undefined,
    ),
    (error) => {
      assert.equal(error?.code, "credential_not_found");
      assert.equal(error?.message, "Credential was not found.");
      return true;
    },
  );
});

test("vault validation rejects malformed identifiers and empty credentials before persistence", async () => {
  const persistence = createMemoryCredentialPersistence();
  const vault = database.createCredentialVault({
    cipher: database.createCredentialCipher({ activeKey: ACTIVE_KEY }),
    persistence,
  });
  const valid = {
    organizationId: context.organizationId,
    provider: context.provider,
    credentialType: context.credentialType,
    createdByUserId: "01988fa6-9328-7000-8000-000000000003",
    idempotencyKey: "validation-1",
    plaintext: Buffer.from("valid"),
  };

  for (const input of [
    { ...valid, provider: "Shopify Admin" },
    { ...valid, plaintext: Buffer.alloc(0) },
    { ...valid, organizationId: "not-a-uuid" },
  ]) {
    await assert.rejects(vault.store(input), (error) => {
      assert.equal(error?.code, "credential_validation_failed");
      assert.equal(error?.message, "Credential vault input is invalid.");
      return true;
    });
  }
  assert.equal(persistence.rows.length, 0);
});

test("expiry validation uses the vault clock rather than ambient wall time", async () => {
  const persistence = createMemoryCredentialPersistence();
  const vault = database.createCredentialVault({
    cipher: database.createCredentialCipher({ activeKey: ACTIVE_KEY }),
    persistence,
    now: () => new Date("2000-01-01T00:00:00.000Z"),
  });

  const stored = await vault.store({
    organizationId: context.organizationId,
    provider: context.provider,
    credentialType: context.credentialType,
    createdByUserId: "01988fa6-9328-7000-8000-000000000003",
    idempotencyKey: "clock-1",
    plaintext: Buffer.from("clock-secret"),
    expiresAt: new Date("2001-01-01T00:00:00.000Z"),
  });

  assert.equal(stored.status, "active");
});

test("expired credentials fail closed before plaintext reaches the callback", async () => {
  const persistence = createMemoryCredentialPersistence();
  const vault = database.createCredentialVault({
    cipher: database.createCredentialCipher({ activeKey: ACTIVE_KEY }),
    persistence,
  });
  const stored = await vault.store({
    organizationId: context.organizationId,
    provider: context.provider,
    credentialType: context.credentialType,
    createdByUserId: "01988fa6-9328-7000-8000-000000000003",
    idempotencyKey: "expiry-1",
    plaintext: Buffer.from("expired-secret"),
    expiresAt: new Date("2099-01-01T00:00:00.000Z"),
  });
  persistence.rows[0].expiresAt = new Date("2000-01-01T00:00:00.000Z");
  let callbackCalled = false;

  await assert.rejects(
    vault.withCredential(
      { organizationId: context.organizationId, credentialId: stored.id },
      () => {
        callbackCalled = true;
      },
    ),
    (error) => {
      assert.equal(error?.code, "credential_expired");
      assert.equal(error?.message, "Credential has expired.");
      return true;
    },
  );
  assert.equal(callbackCalled, false);
});

test("rotation rewrites previous-key envelopes under the active key with optimistic versioning", async () => {
  const persistence = createMemoryCredentialPersistence();
  const oldVault = database.createCredentialVault({
    cipher: database.createCredentialCipher({ activeKey: PREVIOUS_KEY }),
    persistence,
  });
  const stored = await oldVault.store({
    organizationId: context.organizationId,
    provider: context.provider,
    credentialType: context.credentialType,
    createdByUserId: "01988fa6-9328-7000-8000-000000000003",
    idempotencyKey: "rotation-1",
    plaintext: Buffer.from("rotated-secret"),
  });
  const rotatingVault = database.createCredentialVault({
    cipher: database.createCredentialCipher({
      activeKey: ACTIVE_KEY,
      previousKey: PREVIOUS_KEY,
    }),
    persistence,
  });

  assert.equal(typeof rotatingVault.rotate, "function");
  const rotated = await rotatingVault.rotate({
    organizationId: context.organizationId,
    credentialId: stored.id,
    expectedVersion: stored.version,
  });

  assert.equal(rotated.version, 2);
  assert.equal(
    persistence.rows[0].keyId,
    database.createCredentialCipher({ activeKey: ACTIVE_KEY }).activeKeyId,
  );
  const activeOnlyVault = database.createCredentialVault({
    cipher: database.createCredentialCipher({ activeKey: ACTIVE_KEY }),
    persistence,
  });
  const value = await activeOnlyVault.withCredential(
    { organizationId: context.organizationId, credentialId: stored.id },
    (plaintext) => plaintext.toString("utf8"),
  );
  assert.equal(value, "rotated-secret");
});

test("revocation is idempotent and permanently blocks credential access", async () => {
  const persistence = createMemoryCredentialPersistence();
  const now = new Date("2026-08-06T12:10:00.000Z");
  const vault = database.createCredentialVault({
    cipher: database.createCredentialCipher({ activeKey: ACTIVE_KEY }),
    persistence,
    now: () => now,
  });
  const stored = await vault.store({
    organizationId: context.organizationId,
    provider: context.provider,
    credentialType: context.credentialType,
    createdByUserId: "01988fa6-9328-7000-8000-000000000003",
    idempotencyKey: "revocation-1",
    plaintext: Buffer.from("revoked-secret"),
  });

  assert.equal(typeof vault.revoke, "function");
  const revoked = await vault.revoke({
    organizationId: context.organizationId,
    credentialId: stored.id,
    expectedVersion: stored.version,
  });
  const replay = await vault.revoke({
    organizationId: context.organizationId,
    credentialId: stored.id,
    expectedVersion: revoked.version,
  });

  assert.equal(revoked.status, "revoked");
  assert.equal(revoked.revokedAt.toISOString(), now.toISOString());
  assert.equal(revoked.version, 2);
  assert.equal(replay.version, 2);
  await assert.rejects(
    vault.withCredential(
      { organizationId: context.organizationId, credentialId: stored.id },
      () => {
        throw new Error("revoked credential reached callback");
      },
    ),
    (error) => {
      assert.equal(error?.code, "credential_revoked");
      assert.equal(error?.message, "Credential has been revoked.");
      return true;
    },
  );
});

test("idempotent creation replays the original but rejects secret drift", async () => {
  const persistence = createMemoryCredentialPersistence();
  const vault = database.createCredentialVault({
    cipher: database.createCredentialCipher({ activeKey: ACTIVE_KEY }),
    persistence,
  });
  const input = {
    organizationId: context.organizationId,
    provider: context.provider,
    credentialType: context.credentialType,
    createdByUserId: "01988fa6-9328-7000-8000-000000000003",
    idempotencyKey: "idempotency-1",
    plaintext: Buffer.from("original-secret"),
  };

  const first = await vault.store(input);
  const replay = await vault.store(input);
  assert.equal(replay.id, first.id);
  assert.equal(persistence.rows.length, 1);

  await assert.rejects(
    vault.store({ ...input, plaintext: Buffer.from("different-secret") }),
    (error) => {
      assert.equal(error?.code, "credential_conflict");
      assert.equal(error?.message, "Credential changed during the operation.");
      return true;
    },
  );
  assert.equal(persistence.rows.length, 1);
});

test("observer events are bounded and observer failure cannot change vault outcomes", async () => {
  const persistence = createMemoryCredentialPersistence();
  const events = [];
  const vault = database.createCredentialVault({
    cipher: database.createCredentialCipher({ activeKey: ACTIVE_KEY }),
    persistence,
    observe(event) {
      events.push(event);
      throw new Error("telemetry unavailable");
    },
  });
  const stored = await vault.store({
    organizationId: context.organizationId,
    provider: context.provider,
    credentialType: context.credentialType,
    createdByUserId: "01988fa6-9328-7000-8000-000000000003",
    idempotencyKey: "observer-1",
    plaintext: Buffer.from("observer-secret"),
  });
  const value = await vault.withCredential(
    { organizationId: context.organizationId, credentialId: stored.id },
    (plaintext) => plaintext.toString("utf8"),
  );

  assert.equal(value, "observer-secret");
  assert.deepEqual(
    events.map((event) => event.type),
    ["credential_stored", "credential_accessed"],
  );
  const serialized = JSON.stringify(events);
  assert.doesNotMatch(serialized, /observer-secret|ciphertext|authTag|nonce|keyId|idempotency/);
});

test("Drizzle persistence retains organization scope on credential identifier lookups", async () => {
  assert.equal(typeof database.createDrizzleCredentialVaultPersistence, "function");
  const credentialId = "01988fa6-9328-7000-8000-000000000011";
  const row = { id: credentialId, organizationId: context.organizationId };
  let capturedWhere;
  const fakeDatabase = {
    select() {
      return {
        from() {
          return {
            where(expression) {
              capturedWhere = expression;
              return { limit: async () => [row] };
            },
          };
        },
      };
    },
  };
  const persistence = database.createDrizzleCredentialVaultPersistence({ db: fakeDatabase });

  const found = await persistence.findById({
    organizationId: context.organizationId,
    credentialId,
  });

  assert.equal(found, row);
  const predicate = inspect(capturedWhere, { depth: 8 });
  assert.match(predicate, new RegExp(context.organizationId));
  assert.match(predicate, new RegExp(credentialId));
});

test("validated application config constructs the vault without exposing key material", async () => {
  assert.equal(typeof database.createCredentialVaultFromConfig, "function");
  const persistence = createMemoryCredentialPersistence();
  const vault = database.createCredentialVaultFromConfig(
    { encryption: { dataKey: ACTIVE_KEY, previousDataKey: PREVIOUS_KEY } },
    persistence,
  );

  const stored = await vault.store({
    organizationId: context.organizationId,
    provider: context.provider,
    credentialType: context.credentialType,
    createdByUserId: "01988fa6-9328-7000-8000-000000000003",
    idempotencyKey: "config-adapter-1",
    plaintext: Buffer.from("config-secret"),
  });

  assert.equal(stored.status, "active");
  assert.doesNotMatch(JSON.stringify(stored), /config-secret|QUFBQUFB|QkJCQkJC/);
});

test("persistence failures are stable and redact database and credential details", async () => {
  const persistence = createMemoryCredentialPersistence();
  persistence.insert = async () => {
    throw new Error("SQL failed while writing persistence-secret to postgres://private");
  };
  const vault = database.createCredentialVault({
    cipher: database.createCredentialCipher({ activeKey: ACTIVE_KEY }),
    persistence,
  });

  await assert.rejects(
    vault.store({
      organizationId: context.organizationId,
      provider: context.provider,
      credentialType: context.credentialType,
      createdByUserId: "01988fa6-9328-7000-8000-000000000003",
      idempotencyKey: "persistence-1",
      plaintext: Buffer.from("persistence-secret"),
    }),
    (error) => {
      assert.equal(error?.code, "credential_persistence_failed");
      assert.equal(error?.message, "Credential persistence failed.");
      assert.doesNotMatch(String(error), /SQL|persistence-secret|postgres:\/\//);
      return true;
    },
  );
});

test("migration 0004 is additive, literal-safe, and fixed at journal index four", () => {
  const migration = readFileSync(
    join(ROOT, "packages/database/drizzle/0004_t015_encrypted_credential_vault.sql"),
    "utf8",
  );
  assert.deepEqual(
    [...migration.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]),
    ["encrypted_credentials"],
  );
  assert.match(migration, /CHECK \("encrypted_credentials"\."algorithm" = 'aes-256-gcm'\)/);
  assert.match(migration, /ON DELETE restrict/);
  assert.doesNotMatch(migration, /\$\d+/);
  assert.doesNotMatch(migration, /\bDROP\b|\bTRUNCATE\b/i);

  const journal = JSON.parse(
    readFileSync(join(ROOT, "packages/database/drizzle/meta/_journal.json"), "utf8"),
  );
  assert.equal(journal.entries[4].tag, "0004_t015_encrypted_credential_vault");
});

test("physical registry and encrypted_credentials authority match the implemented columns", () => {
  const specificationPath = join(
    ROOT,
    "feed-doctor-implementation-specifications-v1.0.0",
    "feed-doctor-specifications-implementation-v1.0.0",
  );
  const registry = readFileSync(
    join(specificationPath, "docs/07-data-architecture/PHYSICAL_SCHEMA_REGISTRY.md"),
    "utf8",
  );
  assert.match(
    registry,
    /\| `stores-and-integrations` \| `encrypted_credentials` \| 17 \| `docs\/07-data-architecture\/tables\/stores-and-integrations\/encrypted-credentials\.md` \|/,
  );
  let authority;
  try {
    authority = readFileSync(
      join(
        specificationPath,
        "docs/07-data-architecture/tables/stores-and-integrations/encrypted-credentials.md",
      ),
      "utf8",
    );
  } catch {
    authority = undefined;
  }
  assert.equal(typeof authority, "string", "encrypted_credentials authority must exist");
  const physicalSchema = authority.match(/## Physical Schema\s+([\s\S]*?)\n## /)?.[1] ?? "";
  const documentedColumns = [...physicalSchema.matchAll(/^\| `([^`]+)` \|/gm)]
    .map((match) => match[1])
    .sort();
  const implementedColumns = getTableConfig(database.encryptedCredentials)
    .columns.map((column) => column.name)
    .sort();
  assert.deepEqual(documentedColumns, implementedColumns);
});

test("rotation and revocation emit bounded lifecycle events", async () => {
  const persistence = createMemoryCredentialPersistence();
  const events = [];
  const observe = (event) => events.push(event);
  const oldVault = database.createCredentialVault({
    cipher: database.createCredentialCipher({ activeKey: PREVIOUS_KEY }),
    persistence,
    observe,
  });
  const stored = await oldVault.store({
    organizationId: context.organizationId,
    provider: context.provider,
    credentialType: context.credentialType,
    createdByUserId: "01988fa6-9328-7000-8000-000000000003",
    idempotencyKey: "lifecycle-events-1",
    plaintext: Buffer.from("event-secret"),
  });
  const rotatingVault = database.createCredentialVault({
    cipher: database.createCredentialCipher({
      activeKey: ACTIVE_KEY,
      previousKey: PREVIOUS_KEY,
    }),
    persistence,
    observe,
    now: () => new Date("2026-08-06T13:00:00.000Z"),
  });
  const rotated = await rotatingVault.rotate({
    organizationId: context.organizationId,
    credentialId: stored.id,
    expectedVersion: stored.version,
  });
  await rotatingVault.revoke({
    organizationId: context.organizationId,
    credentialId: stored.id,
    expectedVersion: rotated.version,
  });

  assert.deepEqual(
    events.map((event) => event.type),
    ["credential_stored", "credential_rotated", "credential_revoked"],
  );
  assert.doesNotMatch(JSON.stringify(events), /event-secret|ciphertext|authTag|nonce|keyId/);
});
