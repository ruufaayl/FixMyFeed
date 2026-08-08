/**
 * Connector install orchestration (Shopify OAuth) — server-only.
 *
 * Wires the pure Shopify OAuth flow (T040) to the app: builds the install
 * authorization URL, and on callback verifies the request, exchanges the code for
 * a token, stores it in the credential vault (never plaintext), and records the
 * `oauth_connection`. All I/O is injected (token exchange + persistence) so the
 * orchestration is unit-testable; the concrete adapters live in
 * `adapters/connector-install-adapter.ts`. The signed state cookie carries the
 * CSRF nonce plus the tenant/actor the callback must trust — HMAC-signed with the
 * auth secret so it cannot be forged.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { generateState, shopify, ConnectorError } from "@fixmyfeed/connectors";
import { appError, normalizeError, AppError, APP_ERROR_CODE } from "./errors";

/** Scopes requested for feed diagnostics (read) + controlled writeback (write). */
export const SHOPIFY_INSTALL_SCOPES = ["read_products", "write_products"] as const;

/** Name of the signed, httpOnly cookie that carries the in-flight install state. */
export const INSTALL_STATE_COOKIE = "fmf_shopify_oauth";

export interface ShopifyOAuthConfig {
  readonly enabled: boolean;
  readonly clientId: string | undefined;
  readonly clientSecret: string | undefined;
  readonly appUrl: string;
  /** Whether the credential vault is configured (data encryption key present). */
  readonly vaultReady: boolean;
}

/** The callback URL Shopify redirects to after the merchant approves. */
export function shopifyRedirectUri(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/api/connectors/shopify/callback`;
}

export interface ShopifyInstallStart {
  readonly url: string;
  readonly shop: string;
  readonly state: string;
}

/**
 * Validates configuration + shop domain and builds the Shopify install URL with a
 * fresh CSRF state. Throws a VALIDATION AppError when Shopify is not configured
 * or the shop domain is not a valid `*.myshopify.com` store.
 */
export function beginShopifyInstall(
  config: ShopifyOAuthConfig,
  shopDomain: string,
  generate: () => string = generateState,
): ShopifyInstallStart {
  if (!config.enabled || !config.clientId) {
    throw appError.validation("Shopify is not configured for this deployment");
  }
  if (!config.vaultReady) {
    throw appError.validation("Credential storage is not configured for this deployment");
  }
  let shop: string;
  try {
    shop = shopify.normalizeShopDomain(shopDomain);
  } catch {
    throw appError.validation("Enter a valid myshopify.com store domain");
  }
  const state = generate();
  try {
    const built = shopify.buildShopifyInstallUrl({
      shop,
      clientId: config.clientId,
      scopes: [...SHOPIFY_INSTALL_SCOPES],
      redirectUri: shopifyRedirectUri(config.appUrl),
      state,
    });
    return { url: built.url, shop: built.shop, state };
  } catch (error) {
    throw normalizeError(error);
  }
}

// ── Signed state cookie ──────────────────────────────────────────────────────

export interface InstallStateCookie {
  readonly state: string;
  readonly shop: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

/** HMAC-signs the state cookie payload (`base64url(json).base64url(mac)`). */
export function signInstallState(payload: InstallStateCookie, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

/** Verifies + decodes the state cookie; null when absent, malformed, or forged. */
export function verifyInstallState(
  value: string | undefined | null,
  secret: string,
): InstallStateCookie | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as InstallStateCookie;
  } catch {
    return null;
  }
}

// ── Callback orchestration ───────────────────────────────────────────────────

/** Performs the Shopify access-token exchange (real = HTTPS POST). */
export interface ShopifyTokenExchangePort {
  exchange(request: {
    readonly url: string;
    readonly method: "POST";
    readonly body: Readonly<Record<string, string>>;
  }): Promise<shopify.RawShopifyTokenResponse>;
}

/** Persists the token (vault) and records the connection. */
export interface InstallPersistencePort {
  storeToken(input: {
    readonly organizationId: string;
    readonly userId: string;
    readonly shop: string;
    readonly accessToken: string;
    readonly expiresAt: Date | null;
  }): Promise<{ readonly credentialId: string }>;
  upsertConnection(input: {
    readonly organizationId: string;
    readonly shop: string;
    readonly scopes: readonly string[];
    readonly credentialId: string;
    readonly expiresAt: Date | null;
  }): Promise<void>;
}

export interface CompleteShopifyInstallInput {
  readonly params: Readonly<Record<string, string | undefined>>;
  readonly cookie: InstallStateCookie;
  readonly clientId: string;
  readonly clientSecret: string;
}

/**
 * Completes a Shopify install: verifies the callback (HMAC + state + shop),
 * exchanges the code for a token, stores it in the vault, and upserts the
 * connection. Verifies the callback shop matches the one that started the flow.
 * Returns the connected shop; throws an AppError on any failure.
 */
export async function completeShopifyInstall(
  input: CompleteShopifyInstallInput,
  exchange: ShopifyTokenExchangePort,
  persistence: InstallPersistencePort,
): Promise<{ readonly shop: string }> {
  try {
    const { shop, code } = shopify.verifyShopifyInstallCallback({
      params: input.params,
      expectedState: input.cookie.state,
      clientSecret: input.clientSecret,
    });
    if (shop !== shopify.normalizeShopDomain(input.cookie.shop)) {
      throw appError.validation("Shop does not match the initiated install");
    }
    const request = shopify.buildShopifyTokenExchange({
      shop,
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      code,
    });
    const raw = await exchange.exchange(request);
    const token = shopify.parseShopifyTokenResponse(raw);
    const { credentialId } = await persistence.storeToken({
      organizationId: input.cookie.organizationId,
      userId: input.cookie.userId,
      shop,
      accessToken: token.accessToken,
      expiresAt: token.expiresAt ?? null,
    });
    await persistence.upsertConnection({
      organizationId: input.cookie.organizationId,
      shop,
      scopes: token.scopes,
      credentialId,
      expiresAt: token.expiresAt ?? null,
    });
    return { shop };
  } catch (error) {
    throw toInstallError(error);
  }
}

/** Maps a connector-domain failure to a meaningful (non-leaking) AppError. */
function toInstallError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ConnectorError) {
    if (error.category === "authentication" || error.category === "authorization") {
      return appError.forbidden("Shopify could not verify this install request");
    }
    if (error.category === "validation") {
      return appError.validation("Shopify sent an invalid install callback");
    }
    return new AppError(APP_ERROR_CODE.UPSTREAM, "Shopify install could not be completed");
  }
  return normalizeError(error);
}
