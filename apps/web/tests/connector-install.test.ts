/**
 * Connector install orchestration tests (Shopify).
 *
 * begin (config + shop validation), signed state cookie (tamper detection), and
 * completeShopifyInstall (verify → exchange → store → connect) via injected fakes.
 * No network or database.
 */
import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
import { APP_ERROR_CODE } from "../lib/server/errors";
import {
  beginShopifyInstall,
  completeShopifyInstall,
  signInstallState,
  verifyInstallState,
  shopifyRedirectUri,
  type InstallStateCookie,
  type ShopifyOAuthConfig,
} from "../lib/server/connector-install";

const config: ShopifyOAuthConfig = {
  enabled: true,
  clientId: "client-123",
  clientSecret: "secret-abc",
  appUrl: "https://app.fixmyfeed.test",
  vaultReady: true,
};

const SECRET = "test-auth-secret";

describe("beginShopifyInstall", () => {
  it("builds the authorize URL for a valid shop with a fresh state", () => {
    const start = beginShopifyInstall(config, "demo-store.myshopify.com", () => "state-xyz");
    expect(start.shop).toBe("demo-store.myshopify.com");
    expect(start.state).toBe("state-xyz");
    const url = new URL(start.url);
    expect(url.host).toBe("demo-store.myshopify.com");
    expect(url.pathname).toBe("/admin/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("state")).toBe("state-xyz");
    expect(url.searchParams.get("scope")).toContain("read_products");
    expect(url.searchParams.get("redirect_uri")).toBe(shopifyRedirectUri(config.appUrl));
  });

  it("rejects an invalid shop domain", () => {
    expect(() => beginShopifyInstall(config, "evil.example.com")).toThrowError(
      expect.objectContaining({ code: APP_ERROR_CODE.VALIDATION }),
    );
  });

  it("rejects when Shopify is not configured", () => {
    expect(() =>
      beginShopifyInstall({ ...config, enabled: false }, "demo-store.myshopify.com"),
    ).toThrowError(expect.objectContaining({ code: APP_ERROR_CODE.VALIDATION }));
  });

  it("rejects when the credential vault is not configured", () => {
    expect(() =>
      beginShopifyInstall({ ...config, vaultReady: false }, "demo-store.myshopify.com"),
    ).toThrowError(expect.objectContaining({ code: APP_ERROR_CODE.VALIDATION }));
  });
});

describe("install state cookie", () => {
  const payload: InstallStateCookie = {
    state: "s1",
    shop: "demo-store.myshopify.com",
    organizationId: "o1",
    workspaceId: "w1",
    userId: "u1",
  };

  it("round-trips a signed payload", () => {
    const signed = signInstallState(payload, SECRET);
    expect(verifyInstallState(signed, SECRET)).toEqual(payload);
  });

  it("rejects a tampered body", () => {
    const signed = signInstallState(payload, SECRET);
    const tampered = signed.replace(/^[^.]+/, Buffer.from('{"state":"x"}').toString("base64url"));
    expect(verifyInstallState(tampered, SECRET)).toBeNull();
  });

  it("rejects a wrong signing key and absent cookie", () => {
    const signed = signInstallState(payload, SECRET);
    expect(verifyInstallState(signed, "other-secret")).toBeNull();
    expect(verifyInstallState(undefined, SECRET)).toBeNull();
  });
});

describe("completeShopifyInstall", () => {
  const shop = "demo-store.myshopify.com";
  const cookie: InstallStateCookie = {
    state: "state-xyz",
    shop,
    organizationId: "o1",
    workspaceId: "w1",
    userId: "u1",
  };

  /** Builds callback params with a valid Shopify query-string HMAC. */
  function signedParams(over: Record<string, string> = {}) {
    const base: Record<string, string> = { shop, code: "auth-code", state: "state-xyz", ...over };
    const message = Object.keys(base)
      .sort()
      .map((k) => `${k}=${base[k]}`)
      .join("&");
    const hmac = createHmac("sha256", config.clientSecret!).update(message).digest("hex");
    return { ...base, hmac };
  }

  it("verifies, exchanges, stores the token, and upserts the connection", async () => {
    const exchange = {
      exchange: vi.fn(async () => ({
        access_token: "shpat_123",
        scope: "read_products,write_products",
      })),
    };
    const persistence = {
      storeToken: vi.fn(async () => ({ credentialId: "cred-1" })),
      upsertConnection: vi.fn(async () => {}),
    };
    const result = await completeShopifyInstall(
      {
        params: signedParams(),
        cookie,
        clientId: config.clientId!,
        clientSecret: config.clientSecret!,
      },
      exchange,
      persistence,
    );
    expect(result.shop).toBe(shop);
    expect(exchange.exchange).toHaveBeenCalledTimes(1);
    expect(persistence.storeToken).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "o1", userId: "u1", accessToken: "shpat_123" }),
    );
    expect(persistence.upsertConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "o1",
        shop,
        credentialId: "cred-1",
        scopes: ["read_products", "write_products"],
      }),
    );
  });

  it("rejects a state mismatch (CSRF) before exchanging", async () => {
    const exchange = { exchange: vi.fn() };
    const persistence = { storeToken: vi.fn(), upsertConnection: vi.fn() };
    await expect(
      completeShopifyInstall(
        {
          params: signedParams({ state: "state-xyz" }),
          cookie: { ...cookie, state: "different" },
          clientId: config.clientId!,
          clientSecret: config.clientSecret!,
        },
        exchange,
        persistence,
      ),
    ).rejects.toMatchObject({ code: APP_ERROR_CODE.FORBIDDEN });
    expect(exchange.exchange).not.toHaveBeenCalled();
  });

  it("rejects a shop that differs from the initiated install", async () => {
    const exchange = {
      exchange: vi.fn(async () => ({ access_token: "x", scope: "" })),
    };
    const persistence = { storeToken: vi.fn(), upsertConnection: vi.fn() };
    await expect(
      completeShopifyInstall(
        {
          params: signedParams(),
          cookie: { ...cookie, shop: "other-store.myshopify.com" },
          clientId: config.clientId!,
          clientSecret: config.clientSecret!,
        },
        exchange,
        persistence,
      ),
    ).rejects.toMatchObject({ code: APP_ERROR_CODE.VALIDATION });
  });
});
