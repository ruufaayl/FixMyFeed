/**
 * OAuth 2.0 authorization-code flow framework (task T031).
 *
 * Provider-neutral, pure helpers for the parts of the flow that must be correct
 * and secure everywhere: a CSRF `state`, PKCE (S256), authorization-URL
 * construction, callback verification (state match + error handling), and
 * normalized token-set parsing / expiry decisions (oauth-token-security.md,
 * connector-authentication-model.md).
 *
 * No network and no persistence: the caller performs the token-exchange HTTP
 * request and stores the state/verifier and the resulting tokens (the tokens go
 * into the T015 encrypted vault). Deterministic given injected generators/clock.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ConnectorError } from "./errors.js";

type RandomBytesFn = (size: number) => Buffer;

const base64url = (buffer: Buffer): string => buffer.toString("base64url");

/** Generates a high-entropy CSRF state value (base64url). */
export function generateState(byteLength = 32, random: RandomBytesFn = randomBytes): string {
  return base64url(random(byteLength));
}

export interface PkcePair {
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly codeChallengeMethod: "S256";
}

/** Generates a PKCE verifier/challenge pair using the S256 method. */
export function generatePkcePair(random: RandomBytesFn = randomBytes): PkcePair {
  const codeVerifier = base64url(random(32));
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge, codeChallengeMethod: "S256" };
}

export interface AuthorizationRequestInput {
  readonly authorizationEndpoint: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scopes: readonly string[];
  /** Use PKCE (recommended for all flows). Default true. */
  readonly usePkce?: boolean;
  /** Extra provider-specific query parameters. */
  readonly extraParams?: Readonly<Record<string, string>>;
}

export interface AuthorizationRequest {
  /** The full authorization URL to redirect the user to. */
  readonly url: string;
  /** CSRF state — persist server-side and pass to `verifyCallback`. */
  readonly state: string;
  /** PKCE verifier — persist server-side for the token exchange (present iff PKCE). */
  readonly codeVerifier?: string;
}

export interface AuthorizationGenerators {
  readonly state?: () => string;
  readonly pkce?: () => PkcePair;
}

function requireNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ConnectorError(`${field} is required`, "validation");
  }
  return value;
}

/**
 * Builds an authorization-code request: a fresh state, an optional PKCE pair,
 * and the authorization URL with the standard query parameters. Returns the
 * state and PKCE verifier so the caller can persist them for the callback.
 */
export function createAuthorizationRequest(
  input: AuthorizationRequestInput,
  generators: AuthorizationGenerators = {},
): AuthorizationRequest {
  const endpoint = requireNonEmpty(input.authorizationEndpoint, "authorizationEndpoint");
  requireNonEmpty(input.clientId, "clientId");
  requireNonEmpty(input.redirectUri, "redirectUri");
  if (!Array.isArray(input.scopes) || input.scopes.length === 0) {
    throw new ConnectorError("at least one scope is required", "validation");
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new ConnectorError("authorizationEndpoint must be a valid URL", "validation");
  }

  const state = (generators.state ?? generateState)();
  const usePkce = input.usePkce ?? true;
  const pkce = usePkce ? (generators.pkce ?? generatePkcePair)() : undefined;

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", input.scopes.join(" "));
  url.searchParams.set("state", state);
  if (pkce) {
    url.searchParams.set("code_challenge", pkce.codeChallenge);
    url.searchParams.set("code_challenge_method", pkce.codeChallengeMethod);
  }
  for (const [key, value] of Object.entries(input.extraParams ?? {})) {
    url.searchParams.set(key, value);
  }

  return { url: url.toString(), state, codeVerifier: pkce?.codeVerifier };
}

export interface OAuthCallbackParams {
  readonly code?: string;
  readonly state?: string;
  readonly error?: string;
  readonly error_description?: string;
}

/** Constant-time string comparison that never throws on length mismatch. */
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies an OAuth callback: surfaces a provider `error`, enforces the CSRF
 * state match (constant-time), and requires an authorization `code`. Returns the
 * code on success; throws a canonical `ConnectorError` otherwise.
 */
export function verifyCallback(
  params: OAuthCallbackParams,
  expectedState: string,
): { code: string } {
  if (typeof params.error === "string" && params.error.length > 0) {
    throw new ConnectorError(
      params.error_description ?? `authorization failed: ${params.error}`,
      "authorization",
      { providerCode: params.error },
    );
  }
  if (typeof expectedState !== "string" || expectedState.length === 0) {
    throw new ConnectorError("expected state is missing", "validation");
  }
  if (typeof params.state !== "string" || !safeEquals(params.state, expectedState)) {
    throw new ConnectorError("OAuth state mismatch (possible CSRF)", "authorization");
  }
  if (typeof params.code !== "string" || params.code.length === 0) {
    throw new ConnectorError("authorization code is missing", "validation");
  }
  return { code: params.code };
}

export interface TokenSet {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly tokenType: string;
  readonly scopes: readonly string[];
  readonly expiresAt?: Date;
}

/** Raw token-endpoint response fields (primitives only — no provider objects). */
export interface RawTokenResponse {
  readonly access_token?: string;
  readonly refresh_token?: string;
  readonly token_type?: string;
  readonly expires_in?: number;
  readonly scope?: string;
}

/** Normalizes a raw token response into a `TokenSet`. Throws if no access token. */
export function parseTokenResponse(
  raw: RawTokenResponse,
  now: () => Date = () => new Date(),
): TokenSet {
  if (typeof raw?.access_token !== "string" || raw.access_token.length === 0) {
    throw new ConnectorError("token response is missing access_token", "authentication");
  }
  const expiresAt =
    typeof raw.expires_in === "number" && Number.isFinite(raw.expires_in)
      ? new Date(now().getTime() + raw.expires_in * 1000)
      : undefined;
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    tokenType: raw.token_type ?? "Bearer",
    scopes: typeof raw.scope === "string" && raw.scope.length > 0 ? raw.scope.split(/\s+/) : [],
    expiresAt,
  };
}

/** Default clock skew treated as "already expired" when deciding to refresh. */
export const TOKEN_EXPIRY_SKEW_MS = 60_000;

/** True if the token is expired (or within the skew window). Tokens with no expiry never expire. */
export function isTokenExpired(
  tokenSet: Pick<TokenSet, "expiresAt">,
  now: () => Date = () => new Date(),
  skewMs: number = TOKEN_EXPIRY_SKEW_MS,
): boolean {
  if (!tokenSet.expiresAt) return false;
  return now().getTime() + skewMs >= tokenSet.expiresAt.getTime();
}

/** True if the token is expired and a refresh token is available to renew it. */
export function tokenNeedsRefresh(
  tokenSet: Pick<TokenSet, "expiresAt" | "refreshToken">,
  now: () => Date = () => new Date(),
  skewMs: number = TOKEN_EXPIRY_SKEW_MS,
): boolean {
  return Boolean(tokenSet.refreshToken) && isTokenExpired(tokenSet, now, skewMs);
}
