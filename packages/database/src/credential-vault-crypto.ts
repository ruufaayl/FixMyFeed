/** Application-managed authenticated encryption for provider credentials (T015). */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { CREDENTIAL_VAULT_ERROR_CODE, CredentialVaultError } from "./credential-vault-errors.js";

const ALGORITHM = "aes-256-gcm" as const;

export interface CredentialCipherContext {
  readonly credentialId: string;
  readonly organizationId: string;
  readonly provider: string;
  readonly credentialType: string;
}

export interface CredentialEnvelope {
  readonly algorithm: "aes-256-gcm";
  readonly keyId: string;
  readonly nonce: Buffer;
  readonly ciphertext: Buffer;
  readonly authTag: Buffer;
}

export interface EncryptCredentialInput extends CredentialCipherContext {
  readonly plaintext: Uint8Array;
}

export interface DecryptCredentialInput extends CredentialCipherContext {
  readonly envelope: CredentialEnvelope;
}

export interface DecryptedCredential {
  readonly plaintext: Buffer;
  readonly requiresRotation: boolean;
}

export interface CredentialCipher {
  readonly activeKeyId: string;
  encrypt(input: EncryptCredentialInput): CredentialEnvelope;
  decrypt(input: DecryptCredentialInput): DecryptedCredential;
}

export interface CredentialCipherOptions {
  readonly activeKey: string;
  readonly previousKey?: string;
}

function decodeKey(encoded: string): Buffer {
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) {
    throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.configurationInvalid);
  }
  return key;
}

function identifyKey(key: Uint8Array): string {
  return createHash("sha256").update(key).digest("hex");
}

function encodeAssociatedData(context: CredentialCipherContext): Buffer {
  return Buffer.from(
    JSON.stringify({
      version: 1,
      credentialId: context.credentialId,
      organizationId: context.organizationId,
      provider: context.provider,
      credentialType: context.credentialType,
    }),
    "utf8",
  );
}

export function createCredentialCipher(options: CredentialCipherOptions): CredentialCipher {
  const activeKey = decodeKey(options.activeKey);
  const activeKeyId = identifyKey(activeKey);
  const previousKey =
    options.previousKey === undefined ? undefined : decodeKey(options.previousKey);
  const previousKeyId = previousKey === undefined ? undefined : identifyKey(previousKey);

  return {
    activeKeyId,
    encrypt(input) {
      const nonce = randomBytes(12);
      const cipher = createCipheriv(ALGORITHM, activeKey, nonce, { authTagLength: 16 });
      cipher.setAAD(encodeAssociatedData(input));
      const ciphertext = Buffer.concat([
        cipher.update(Buffer.from(input.plaintext)),
        cipher.final(),
      ]);

      return {
        algorithm: ALGORITHM,
        keyId: activeKeyId,
        nonce,
        ciphertext,
        authTag: cipher.getAuthTag(),
      };
    },
    decrypt(input) {
      try {
        if (
          input.envelope.algorithm !== ALGORITHM ||
          !/^[0-9a-f]{64}$/.test(input.envelope.keyId) ||
          input.envelope.nonce.length !== 12 ||
          input.envelope.ciphertext.length < 1 ||
          input.envelope.ciphertext.length > 65_536 ||
          input.envelope.authTag.length !== 16
        ) {
          throw new Error("Malformed credential envelope.");
        }
        const key =
          input.envelope.keyId === activeKeyId
            ? activeKey
            : input.envelope.keyId === previousKeyId
              ? previousKey
              : undefined;
        if (key === undefined) {
          throw new Error("No matching key.");
        }
        const decipher = createDecipheriv(ALGORITHM, key, input.envelope.nonce, {
          authTagLength: 16,
        });
        decipher.setAAD(encodeAssociatedData(input));
        decipher.setAuthTag(input.envelope.authTag);
        return {
          plaintext: Buffer.concat([decipher.update(input.envelope.ciphertext), decipher.final()]),
          requiresRotation: input.envelope.keyId !== activeKeyId,
        };
      } catch {
        throw new CredentialVaultError(CREDENTIAL_VAULT_ERROR_CODE.decryptionFailed);
      }
    },
  };
}
