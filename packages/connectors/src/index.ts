/**
 * @fixmyfeed/connectors
 *
 * Versioned external-platform adapters (Shopify, WooCommerce, Google Merchant
 * Center, …). T030 establishes the shared connector contract: a machine-readable
 * capability descriptor, a normalized error taxonomy, and a canonical result
 * envelope, so every connector publishes its capabilities and returns normalized
 * results/canonical errors — provider SDK objects never escape the adapter
 * boundary (connector-contract.md).
 *
 * Boundary: may depend on domain/contracts/config/observability (see
 * /boundaries.json); must not depend on application UI.
 */
export const workspaceName = "@fixmyfeed/connectors" as const;
export const workspaceKind = "package" as const;

export {
  CONNECTOR_ERROR_CATEGORIES,
  RETRYABLE_CONNECTOR_CATEGORIES,
  ConnectorError,
  isRetryableCategory,
  connectorErrorCode,
  categoryFromHttpStatus,
  normalizeConnectorError,
} from "./errors.js";
export type {
  ConnectorErrorCategory,
  ConnectorErrorOptions,
  RawConnectorFailure,
} from "./errors.js";

export {
  CONNECTOR_AUTH_MODES,
  CONNECTOR_OBJECT_TYPES,
  CONNECTOR_SCOPES,
  CONNECTOR_CURSOR_MODELS,
  WEBHOOK_VERIFICATION_MODES,
  validateConnectorContract,
  supportsObject,
  supportsAuthMode,
} from "./capabilities.js";
export type {
  ConnectorAuthMode,
  ConnectorObjectType,
  ConnectorScope,
  ConnectorCursorModel,
  WebhookVerificationMode,
  ObjectCapability,
  RateLimitModel,
  WebhookCapability,
  ApiVersionSupport,
  ConnectorContract,
} from "./capabilities.js";

export { ok, fail, isOk, unwrap } from "./result.js";
export type { ConnectorResult } from "./result.js";

// T031 OAuth authorization-code flow framework.
export {
  TOKEN_EXPIRY_SKEW_MS,
  generateState,
  generatePkcePair,
  createAuthorizationRequest,
  verifyCallback,
  parseTokenResponse,
  isTokenExpired,
  tokenNeedsRefresh,
} from "./oauth.js";
export type {
  PkcePair,
  AuthorizationRequestInput,
  AuthorizationRequest,
  AuthorizationGenerators,
  OAuthCallbackParams,
  TokenSet,
  RawTokenResponse,
} from "./oauth.js";
