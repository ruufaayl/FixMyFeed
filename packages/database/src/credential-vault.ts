/** Tenant-scoped encrypted credential lifecycle service (task T015). */
import { timingSafeEqual } from "node:crypto";

import type { AppConfig } from "@fixmyfeed/config";
import { and, eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client.js";
import { createUuidV7, isUuidV7 } from "./ids.js";
import {
  createCredentialCipher,
  type CredentialCipher,
  type CredentialEnvelope,
} from "./credential-vault-crypto.js";
import { encryptedCredentials, type CredentialStatus } from "./credential-vault-schema.js";
import { CREDENTIAL_VAULT_ERROR_CODE, CredentialVaultError } from "./credential-vault-errors.js";

export interface CredentialVaultRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly provider: string;
  readonly credentialType: string;
  readonly status: CredentialStatus;
  readonly algorithm: "aes-256-gcm";
  readonly keyId: string;
  readonly nonce: Buffer;
  readonly ciphertext: Buffer;
  readonly authTag: Buffer;
  readonly idempotencyKey: string;
  readonly createdByUserId: string;
  readonly expiresAt: Date | null;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
}

export interface NewCredentialVaultRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly provider: string;
  readonly credentialType: string;
  readonly algorithm: "aes-256-gcm";
  readonly keyId: string;
  readonly nonce: Buffer;
  readonly ciphertext: Buffer;
  readonly authTag: Buffer;
  readonly idempotencyKey: string;
  readonly createdByUserId: string;
  readonly expiresAt: Date | null;
}

export interface CredentialVaultMetadata {
  readonly id: string;
  readonly organizationId: string;
  readonly provider: string;
  readonly credentialType: string;
  readonly status: CredentialStatus;
  readonly expiresAt: Date | null;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
}

export interface CredentialVaultPersistence {
  insert(input: NewCredentialVaultRecord): Promise<{
    readonly record: CredentialVaultRecord;
    readonly inserted: boolean;
  }>;
  findById(input: {
    readonly organizationId: string;
    readonly credentialId: string;
  }): Promise<CredentialVaultRecord | undefined>;
  replaceEnvelope(input: {
    readonly organizationId: string;
    readonly credentialId: string;
    readonly expectedVersion: number;
    readonly envelope: CredentialEnvelope;
  }): Promise<CredentialVaultRecord | undefined>;
  revoke(input: {
    readonly organizationId: string;
    readonly credentialId: string;
    readonly expectedVersion: number;
    readonly revokedAt: Date;
  }): Promise<CredentialVaultRecord | undefined>;
}

export type CredentialVaultDatabaseClient = Pick<DatabaseClient, "db">;
type ReplaceEnvelopeInput = Parameters<CredentialVaultPersistence["replaceEnvelope"]>[0];
type PersistRevocationInput = Parameters<CredentialVaultPersistence["revoke"]>[0];

export interface StoreCredentialInput {
  readonly organizationId: string;
  readonly provider: string;
  readonly credentialType: string;
  readonly createdByUserId: string;
  readonly idempotencyKey: string;
  readonly plaintext: Uint8Array;
  readonly expiresAt?: Date | null;
}

export interface CredentialReference {
  readonly organizationId: string;
  readonly credentialId: string;
}

export interface CredentialVault {
  store(input: StoreCredentialInput): Promise<CredentialVaultMetadata>;
  withCredential<T>(
    reference: CredentialReference,
    callback: (plaintext: Buffer) => T | Promise<T>,
  ): Promise<T>;
  rotate(input: RotateCredentialInput): Promise<CredentialVaultMetadata>;
  revoke(input: RevokeCredentialInput): Promise<CredentialVaultMetadata>;
}

export interface RotateCredentialInput extends CredentialReference {
  readonly expectedVersion: number;
}

export interface RevokeCredentialInput extends CredentialReference {
  readonly expectedVersion: number;
}

export interface CredentialVaultOptions {
  readonly cipher: CredentialCipher;
  readonly persistence: CredentialVaultPersistence;
  readonly now?: () => Date;
  readonly observe?: (event: CredentialVaultEvent) => void | Promise<void>;
}

export type CredentialVaultApplicationConfig = Pick<AppConfig, "encryption">;
export type CredentialVaultRuntimeOptions = Pick<CredentialVaultOptions, "now" | "observe">;

export interface CredentialVaultEvent {
  readonly type:
    "credential_stored" | "credential_accessed" | "credential_rotated" | "credential_revoked";
  readonly organizationId: string;
  readonly credentialId: string;
  readonly provider: string;
  readonly outcome: "success";
}

function metadataOf(record: CredentialVaultRecord): CredentialVaultMetadata {
  return {
    id: record.id,
    organizationId: record.organizationId,
    provider: record.provider,
    credentialType: record.credentialType,
    status: record.status,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}

function envelopeOf(record: CredentialVaultRecord): CredentialEnvelope {
  return {
    algorithm: record.algorithm,
    keyId: record.keyId,
    nonce: record.nonce,
    ciphertext: record.ciphertext,
    authTag: record.authTag,
  };
}

const CREDENTIAL_IDENTIFIER = /^[a-z][a-z0-9_-]{0,63}$/;

function validationFailure(): never {
  throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.validationFailed);
}

function validateStoreInput(input: StoreCredentialInput, currentTime: Date): void {
  if (
    !isUuidV7(input.organizationId) ||
    !isUuidV7(input.createdByUserId) ||
    !CREDENTIAL_IDENTIFIER.test(input.provider) ||
    !CREDENTIAL_IDENTIFIER.test(input.credentialType) ||
    input.idempotencyKey.length < 1 ||
    input.idempotencyKey.length > 200 ||
    input.plaintext.byteLength < 1 ||
    input.plaintext.byteLength > 65_536 ||
    (input.expiresAt !== undefined &&
      input.expiresAt !== null &&
      (!Number.isFinite(input.expiresAt.getTime()) ||
        input.expiresAt.getTime() <= currentTime.getTime()))
  ) {
    validationFailure();
  }
}

function validateReference(reference: CredentialReference): void {
  if (!isUuidV7(reference.organizationId) || !isUuidV7(reference.credentialId)) {
    validationFailure();
  }
}

function validateExpectedVersion(version: number): void {
  if (!Number.isSafeInteger(version) || version < 1) {
    validationFailure();
  }
}

function ensureAccessible(record: CredentialVaultRecord, now: Date): void {
  if (record.status === "revoked") {
    throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.revoked);
  }
  if (record.expiresAt !== null && record.expiresAt.getTime() <= now.getTime()) {
    throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.expired);
  }
}

function sameOptionalDate(left: Date | null, right: Date | null | undefined): boolean {
  return (left?.getTime() ?? null) === (right?.getTime() ?? null);
}

function idempotentReplayMatches(
  cipher: CredentialCipher,
  record: CredentialVaultRecord,
  input: StoreCredentialInput,
): boolean {
  if (
    record.organizationId !== input.organizationId ||
    record.provider !== input.provider ||
    record.credentialType !== input.credentialType ||
    record.createdByUserId !== input.createdByUserId ||
    !sameOptionalDate(record.expiresAt, input.expiresAt)
  ) {
    return false;
  }
  const decrypted = cipher.decrypt({
    credentialId: record.id,
    organizationId: record.organizationId,
    provider: record.provider,
    credentialType: record.credentialType,
    envelope: envelopeOf(record),
  });
  const candidate = Buffer.from(input.plaintext);
  try {
    return (
      decrypted.plaintext.length === candidate.length &&
      timingSafeEqual(decrypted.plaintext, candidate)
    );
  } finally {
    decrypted.plaintext.fill(0);
    candidate.fill(0);
  }
}

async function reportEvent(
  observer: CredentialVaultOptions["observe"],
  event: CredentialVaultEvent,
): Promise<void> {
  try {
    await observer?.(event);
  } catch {
    // Telemetry is best-effort and cannot alter durable vault outcomes.
  }
}

async function persistenceCall<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof CredentialVaultError) throw error;
    throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.persistenceFailed);
  }
}

export function createCredentialVault(options: CredentialVaultOptions): CredentialVault {
  const now = options.now ?? (() => new Date());
  return {
    async store(input) {
      validateStoreInput(input, now());
      const id = createUuidV7();
      const envelope = options.cipher.encrypt({
        credentialId: id,
        organizationId: input.organizationId,
        provider: input.provider,
        credentialType: input.credentialType,
        plaintext: input.plaintext,
      });
      const result = await persistenceCall(() =>
        options.persistence.insert({
          id,
          organizationId: input.organizationId,
          provider: input.provider,
          credentialType: input.credentialType,
          ...envelope,
          idempotencyKey: input.idempotencyKey,
          createdByUserId: input.createdByUserId,
          expiresAt: input.expiresAt ?? null,
        }),
      );
      if (!result.inserted && !idempotentReplayMatches(options.cipher, result.record, input)) {
        throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.conflict);
      }
      const metadata = metadataOf(result.record);
      await reportEvent(options.observe, {
        type: "credential_stored",
        organizationId: metadata.organizationId,
        credentialId: metadata.id,
        provider: metadata.provider,
        outcome: "success",
      });
      return metadata;
    },
    async withCredential(reference, callback) {
      validateReference(reference);
      const record = await persistenceCall(() => options.persistence.findById(reference));
      if (record === undefined) {
        throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.notFound);
      }
      ensureAccessible(record, now());
      const decrypted = options.cipher.decrypt({
        credentialId: record.id,
        organizationId: record.organizationId,
        provider: record.provider,
        credentialType: record.credentialType,
        envelope: envelopeOf(record),
      });
      try {
        const result = await callback(decrypted.plaintext);
        await reportEvent(options.observe, {
          type: "credential_accessed",
          organizationId: record.organizationId,
          credentialId: record.id,
          provider: record.provider,
          outcome: "success",
        });
        return result;
      } finally {
        decrypted.plaintext.fill(0);
      }
    },
    async rotate(input) {
      validateReference(input);
      validateExpectedVersion(input.expectedVersion);
      const record = await persistenceCall(() => options.persistence.findById(input));
      if (record === undefined) {
        throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.notFound);
      }
      ensureAccessible(record, now());
      const decrypted = options.cipher.decrypt({
        credentialId: record.id,
        organizationId: record.organizationId,
        provider: record.provider,
        credentialType: record.credentialType,
        envelope: envelopeOf(record),
      });
      try {
        if (!decrypted.requiresRotation) {
          return metadataOf(record);
        }
        const envelope = options.cipher.encrypt({
          credentialId: record.id,
          organizationId: record.organizationId,
          provider: record.provider,
          credentialType: record.credentialType,
          plaintext: decrypted.plaintext,
        });
        const rotated = await persistenceCall(() =>
          options.persistence.replaceEnvelope({
            organizationId: input.organizationId,
            credentialId: input.credentialId,
            expectedVersion: input.expectedVersion,
            envelope,
          }),
        );
        if (rotated === undefined) {
          throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.conflict);
        }
        const metadata = metadataOf(rotated);
        await reportEvent(options.observe, {
          type: "credential_rotated",
          organizationId: metadata.organizationId,
          credentialId: metadata.id,
          provider: metadata.provider,
          outcome: "success",
        });
        return metadata;
      } finally {
        decrypted.plaintext.fill(0);
      }
    },
    async revoke(input) {
      validateReference(input);
      validateExpectedVersion(input.expectedVersion);
      const record = await persistenceCall(() => options.persistence.findById(input));
      if (record === undefined) {
        throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.notFound);
      }
      if (record.status === "revoked") {
        return metadataOf(record);
      }
      const revoked = await persistenceCall(() =>
        options.persistence.revoke({
          organizationId: input.organizationId,
          credentialId: input.credentialId,
          expectedVersion: input.expectedVersion,
          revokedAt: now(),
        }),
      );
      if (revoked === undefined) {
        throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.conflict);
      }
      const metadata = metadataOf(revoked);
      await reportEvent(options.observe, {
        type: "credential_revoked",
        organizationId: metadata.organizationId,
        credentialId: metadata.id,
        provider: metadata.provider,
        outcome: "success",
      });
      return metadata;
    },
  };
}

export function createCredentialVaultFromConfig(
  config: CredentialVaultApplicationConfig,
  persistence: CredentialVaultPersistence,
  runtime: CredentialVaultRuntimeOptions = {},
): CredentialVault {
  if (config.encryption.dataKey === undefined) {
    throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.configurationInvalid);
  }
  return createCredentialVault({
    cipher: createCredentialCipher({
      activeKey: config.encryption.dataKey,
      ...(config.encryption.previousDataKey === undefined
        ? {}
        : { previousKey: config.encryption.previousDataKey }),
    }),
    persistence,
    ...runtime,
  });
}

const firstRecord = (rows: readonly unknown[]): CredentialVaultRecord | undefined =>
  rows[0] as CredentialVaultRecord | undefined;

export function createDrizzleCredentialVaultPersistence(
  client: CredentialVaultDatabaseClient,
): CredentialVaultPersistence {
  if (client === null || typeof client?.db?.select !== "function") {
    validationFailure();
  }

  return Object.freeze({
    async insert(input: NewCredentialVaultRecord) {
      const insertedRows = await client.db
        .insert(encryptedCredentials)
        .values(input)
        .onConflictDoNothing({
          target: [
            encryptedCredentials.organizationId,
            encryptedCredentials.createdByUserId,
            encryptedCredentials.idempotencyKey,
          ],
        })
        .returning();
      const inserted = firstRecord(insertedRows);
      if (inserted !== undefined) {
        return { record: inserted, inserted: true };
      }
      const existingRows = await client.db
        .select()
        .from(encryptedCredentials)
        .where(
          and(
            eq(encryptedCredentials.organizationId, input.organizationId),
            eq(encryptedCredentials.createdByUserId, input.createdByUserId),
            eq(encryptedCredentials.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      const existing = firstRecord(existingRows);
      if (existing === undefined) {
        throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.conflict);
      }
      return { record: existing, inserted: false };
    },
    async findById(input: CredentialReference) {
      const rows = await client.db
        .select()
        .from(encryptedCredentials)
        .where(
          and(
            eq(encryptedCredentials.organizationId, input.organizationId),
            eq(encryptedCredentials.id, input.credentialId),
          ),
        )
        .limit(1);
      return firstRecord(rows);
    },
    async replaceEnvelope(input: ReplaceEnvelopeInput) {
      const rows = await client.db
        .update(encryptedCredentials)
        .set({
          ...input.envelope,
          updatedAt: new Date(),
          version: sql`${encryptedCredentials.version} + 1`,
        })
        .where(
          and(
            eq(encryptedCredentials.organizationId, input.organizationId),
            eq(encryptedCredentials.id, input.credentialId),
            eq(encryptedCredentials.version, input.expectedVersion),
            eq(encryptedCredentials.status, "active"),
          ),
        )
        .returning();
      return firstRecord(rows);
    },
    async revoke(input: PersistRevocationInput) {
      const rows = await client.db
        .update(encryptedCredentials)
        .set({
          status: "revoked",
          revokedAt: input.revokedAt,
          updatedAt: input.revokedAt,
          version: sql`${encryptedCredentials.version} + 1`,
        })
        .where(
          and(
            eq(encryptedCredentials.organizationId, input.organizationId),
            eq(encryptedCredentials.id, input.credentialId),
            eq(encryptedCredentials.version, input.expectedVersion),
            eq(encryptedCredentials.status, "active"),
          ),
        )
        .returning();
      return firstRecord(rows);
    },
  });
}
