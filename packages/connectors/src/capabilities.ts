/**
 * Connector capability descriptor and contract validation (task T030).
 *
 * Every connector publishes a machine-readable contract: its authentication
 * modes, supported object types with read/write scopes, rate-limit model,
 * webhook support, cursor model, and API-version support (connector-contract.md,
 * connector-capability-model.md). Callers introspect this contract instead of
 * hard-coding provider assumptions.
 *
 * Pure and deterministic; validation rejects unknown enum values (deny by
 * default) so an unsupported capability can never be silently assumed.
 */
import { ConnectorError } from "./errors.js";

export const CONNECTOR_AUTH_MODES = ["oauth2", "api_key", "basic", "none"] as const;
export type ConnectorAuthMode = (typeof CONNECTOR_AUTH_MODES)[number];

/** Commerce object types a connector may expose. */
export const CONNECTOR_OBJECT_TYPES = [
  "product",
  "variant",
  "collection",
  "inventory",
  "price",
  "image",
  "order",
] as const;
export type ConnectorObjectType = (typeof CONNECTOR_OBJECT_TYPES)[number];

export const CONNECTOR_SCOPES = ["read", "write"] as const;
export type ConnectorScope = (typeof CONNECTOR_SCOPES)[number];

/** How a connector exposes incremental sync positions. */
export const CONNECTOR_CURSOR_MODELS = ["none", "timestamp", "opaque", "page"] as const;
export type ConnectorCursorModel = (typeof CONNECTOR_CURSOR_MODELS)[number];

/** How inbound webhooks are authenticated (if supported at all). */
export const WEBHOOK_VERIFICATION_MODES = ["none", "hmac", "signature", "token"] as const;
export type WebhookVerificationMode = (typeof WEBHOOK_VERIFICATION_MODES)[number];

export interface ObjectCapability {
  readonly type: ConnectorObjectType;
  /** Non-empty subset of read/write this connector supports for the object. */
  readonly scopes: readonly ConnectorScope[];
}

export interface RateLimitModel {
  /** Requests permitted per window. */
  readonly requestsPerWindow: number;
  /** Window length in seconds. */
  readonly windowSeconds: number;
  /** Whether the provider returns a Retry-After hint on throttling. */
  readonly retryAfterHonored: boolean;
}

export interface WebhookCapability {
  readonly supported: boolean;
  readonly verification: WebhookVerificationMode;
}

export interface ApiVersionSupport {
  readonly supported: readonly string[];
  readonly default: string;
}

/** The full published contract for a connector. */
export interface ConnectorContract {
  /** Stable slug, e.g. "shopify". */
  readonly connectorId: string;
  readonly displayName: string;
  readonly authModes: readonly ConnectorAuthMode[];
  readonly objects: readonly ObjectCapability[];
  readonly rateLimit: RateLimitModel;
  readonly webhooks: WebhookCapability;
  readonly cursor: ConnectorCursorModel;
  readonly apiVersions: ApiVersionSupport;
}

const CONNECTOR_ID_PATTERN = /^[a-z][a-z0-9-]{1,63}$/;

function invalid(message: string): never {
  throw new ConnectorError(message, "validation");
}

/**
 * Validates a connector contract, throwing a `ConnectorError` (category
 * `validation`) on the first violation. Returns the contract unchanged when it
 * is well-formed.
 */
export function validateConnectorContract(contract: ConnectorContract): ConnectorContract {
  if (contract === null || typeof contract !== "object") {
    invalid("contract must be an object");
  }
  if (
    typeof contract.connectorId !== "string" ||
    !CONNECTOR_ID_PATTERN.test(contract.connectorId)
  ) {
    invalid("connectorId must be a lowercase slug");
  }
  if (typeof contract.displayName !== "string" || contract.displayName.length === 0) {
    invalid("displayName is required");
  }
  if (!Array.isArray(contract.authModes) || contract.authModes.length === 0) {
    invalid("at least one authMode is required");
  }
  for (const mode of contract.authModes) {
    if (!CONNECTOR_AUTH_MODES.includes(mode)) invalid(`unknown authMode: ${mode}`);
  }
  if (!Array.isArray(contract.objects) || contract.objects.length === 0) {
    invalid("at least one object capability is required");
  }
  const seenTypes = new Set<string>();
  for (const object of contract.objects) {
    if (!CONNECTOR_OBJECT_TYPES.includes(object?.type)) {
      invalid(`unknown object type: ${object?.type}`);
    }
    if (seenTypes.has(object.type)) invalid(`duplicate object type: ${object.type}`);
    seenTypes.add(object.type);
    if (!Array.isArray(object.scopes) || object.scopes.length === 0) {
      invalid(`object ${object.type} must declare at least one scope`);
    }
    for (const scope of object.scopes) {
      if (!CONNECTOR_SCOPES.includes(scope)) invalid(`unknown scope: ${scope}`);
    }
  }
  const rl = contract.rateLimit;
  if (
    rl === null ||
    typeof rl !== "object" ||
    !Number.isInteger(rl.requestsPerWindow) ||
    rl.requestsPerWindow <= 0 ||
    !Number.isInteger(rl.windowSeconds) ||
    rl.windowSeconds <= 0
  ) {
    invalid("rateLimit requires positive requestsPerWindow and windowSeconds");
  }
  if (!contract.webhooks || typeof contract.webhooks.supported !== "boolean") {
    invalid("webhooks.supported must be a boolean");
  }
  if (!WEBHOOK_VERIFICATION_MODES.includes(contract.webhooks.verification)) {
    invalid(`unknown webhook verification mode: ${contract.webhooks.verification}`);
  }
  if (contract.webhooks.supported && contract.webhooks.verification === "none") {
    invalid("a connector that supports webhooks must declare a verification mode");
  }
  if (!CONNECTOR_CURSOR_MODELS.includes(contract.cursor)) {
    invalid(`unknown cursor model: ${contract.cursor}`);
  }
  const versions = contract.apiVersions;
  if (!versions || !Array.isArray(versions.supported) || versions.supported.length === 0) {
    invalid("apiVersions.supported must be a non-empty array");
  }
  if (typeof versions.default !== "string" || !versions.supported.includes(versions.default)) {
    invalid("apiVersions.default must be one of apiVersions.supported");
  }
  return contract;
}

/** True if the contract supports `scope` on `type`. */
export function supportsObject(
  contract: ConnectorContract,
  type: ConnectorObjectType,
  scope: ConnectorScope,
): boolean {
  return contract.objects.some((o) => o.type === type && o.scopes.includes(scope));
}

/** True if the contract offers the given authentication mode. */
export function supportsAuthMode(contract: ConnectorContract, mode: ConnectorAuthMode): boolean {
  return contract.authModes.includes(mode);
}
