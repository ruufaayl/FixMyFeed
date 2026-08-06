/** Stable, redacted failures for the encrypted credential vault (T015). */
export const CREDENTIAL_VAULT_ERROR_CODE = {
  configurationInvalid: "credential_configuration_invalid",
  conflict: "credential_conflict",
  decryptionFailed: "credential_decryption_failed",
  expired: "credential_expired",
  notFound: "credential_not_found",
  persistenceFailed: "credential_persistence_failed",
  revoked: "credential_revoked",
  validationFailed: "credential_validation_failed",
} as const;

export type CredentialVaultErrorCode =
  (typeof CREDENTIAL_VAULT_ERROR_CODE)[keyof typeof CREDENTIAL_VAULT_ERROR_CODE];

const ERROR_MESSAGE: Readonly<Record<CredentialVaultErrorCode, string>> = {
  credential_configuration_invalid: "Credential vault configuration is invalid.",
  credential_conflict: "Credential changed during the operation.",
  credential_decryption_failed: "Credential decryption failed.",
  credential_expired: "Credential has expired.",
  credential_not_found: "Credential was not found.",
  credential_persistence_failed: "Credential persistence failed.",
  credential_revoked: "Credential has been revoked.",
  credential_validation_failed: "Credential vault input is invalid.",
};

export class CredentialVaultError extends Error {
  readonly code: CredentialVaultErrorCode;

  constructor(code: CredentialVaultErrorCode) {
    super(ERROR_MESSAGE[code]);
    this.name = "CredentialVaultError";
    this.code = code;
  }
}
