/**
 * Google OAuth and Merchant Center account discovery (task T060).
 *
 * Google is a standard OAuth 2.0 provider, so the authorization-code flow is
 * built on the T031 framework with Google's endpoints, the Content API scope,
 * and `access_type=offline` + `prompt=consent` to obtain a refresh token
 * (oauth-authorization.md, account-discovery.md). After authorization the app
 * lists the merchant's Merchant Center accounts to discover which to link.
 *
 * Pure and deterministic; the app performs the HTTP calls and stores the token
 * in the T015 vault via an `oauth_connections` row (connector_id="google").
 */
import { createAuthorizationRequest, type AuthorizationGenerators } from "../oauth.js";
import { ConnectorError } from "../errors.js";

export const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
/** Content API for Shopping / Merchant API scope. */
export const GOOGLE_CONTENT_SCOPE = "https://www.googleapis.com/auth/content";
/** Base for the Merchant API (accounts sub-API). */
export const GOOGLE_MERCHANT_API_BASE = "https://merchantapi.googleapis.com";

export interface GoogleAuthInput {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly state: string;
  /** Extra scopes to request alongside the Content API scope. */
  readonly scopes?: readonly string[];
}

/**
 * Builds the Google authorization request (offline access + consent so a refresh
 * token is issued). Returns the URL, the CSRF state, and the PKCE verifier.
 */
export function buildGoogleAuthorizationRequest(
  input: GoogleAuthInput,
  generators: AuthorizationGenerators = {},
): { readonly url: string; readonly state: string; readonly codeVerifier?: string } {
  const scopes = [GOOGLE_CONTENT_SCOPE, ...(input.scopes ?? [])];
  return createAuthorizationRequest(
    {
      authorizationEndpoint: GOOGLE_AUTH_ENDPOINT,
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      scopes,
      usePkce: true,
      extraParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
    },
    { ...generators, state: () => input.state },
  );
}

export interface GoogleTokenExchangeInput {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly code: string;
  readonly redirectUri: string;
  readonly codeVerifier?: string;
}

/** Builds the Google token-exchange POST request for the caller (no network). */
export function buildGoogleTokenExchange(input: GoogleTokenExchangeInput): {
  readonly url: string;
  readonly method: "POST";
  readonly body: Readonly<Record<string, string>>;
} {
  if (!input.clientId || !input.clientSecret || !input.code || !input.redirectUri) {
    throw new ConnectorError(
      "clientId, clientSecret, code and redirectUri are required",
      "validation",
    );
  }
  const body: Record<string, string> = {
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  };
  if (input.codeVerifier) body.code_verifier = input.codeVerifier;
  return { url: GOOGLE_TOKEN_ENDPOINT, method: "POST", body };
}

/** Builds the refresh-token request to renew an access token. */
export function buildGoogleRefreshRequest(input: {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
}): {
  readonly url: string;
  readonly method: "POST";
  readonly body: Readonly<Record<string, string>>;
} {
  if (!input.clientId || !input.clientSecret || !input.refreshToken) {
    throw new ConnectorError("clientId, clientSecret and refreshToken are required", "validation");
  }
  return {
    url: GOOGLE_TOKEN_ENDPOINT,
    method: "POST",
    body: {
      client_id: input.clientId,
      client_secret: input.clientSecret,
      refresh_token: input.refreshToken,
      grant_type: "refresh_token",
    },
  };
}

// ---------------------------------------------------------------------------
// Account discovery
// ---------------------------------------------------------------------------

/** Builds the Merchant API request to list the authorized user's accounts. */
export function buildAccountsListRequest(
  accessToken: string,
  pageToken?: string,
): {
  readonly url: string;
  readonly method: "GET";
  readonly headers: Readonly<Record<string, string>>;
} {
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new ConnectorError("accessToken is required", "validation");
  }
  const url = new URL(`${GOOGLE_MERCHANT_API_BASE}/accounts/v1beta/accounts`);
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  return {
    url: url.toString(),
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  };
}

export interface GoogleAccount {
  readonly accountId: string;
  readonly name: string;
  readonly accountName: string | null;
  readonly adultContent: boolean;
}

interface RawGoogleAccount {
  readonly name?: string;
  readonly accountId?: string | number;
  readonly accountName?: string;
  readonly adultContent?: boolean;
}

/** Extracts the numeric account id from a resource name like `accounts/12345`. */
function accountIdFromName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const match = name.match(/accounts\/([^/]+)/);
  return match ? match[1]! : null;
}

/** Parses a Merchant API accounts list response into normalized accounts. */
export function parseGoogleAccounts(raw: {
  readonly accounts?: readonly RawGoogleAccount[];
}): GoogleAccount[] {
  const accounts = Array.isArray(raw?.accounts) ? raw.accounts : [];
  return accounts.map((a) => {
    const accountId = a.accountId !== undefined ? String(a.accountId) : accountIdFromName(a.name);
    if (accountId === null) {
      throw new ConnectorError("Google account is missing an id", "validation");
    }
    return {
      accountId,
      name: typeof a.name === "string" ? a.name : `accounts/${accountId}`,
      accountName: typeof a.accountName === "string" ? a.accountName : null,
      adultContent: a.adultContent === true,
    };
  });
}
