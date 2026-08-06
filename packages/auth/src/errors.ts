export const AUTH_ERROR_CODE = {
  CONFIGURATION_INVALID: "AUTH_CONFIGURATION_INVALID",
} as const;

export class AuthConfigurationError extends Error {
  readonly code = AUTH_ERROR_CODE.CONFIGURATION_INVALID;

  constructor() {
    super("Authentication configuration is invalid");
    this.name = "AuthConfigurationError";
  }
}
