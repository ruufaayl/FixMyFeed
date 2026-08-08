/**
 * Connector install adapters (Shopify) — server-only.
 *
 * Concrete ports for the install orchestration: the real HTTPS token exchange,
 * and persistence that stores the access token in the credential vault (T015,
 * encrypted at rest) and upserts the `oauth_connections` row (T031). No token is
 * ever written in plaintext, and the raw token never crosses back to the caller.
 */
import { randomUUID } from "node:crypto";
import {
  createCredentialVaultFromConfig,
  createDrizzleCredentialVaultPersistence,
  oauthConnections,
  type CredentialVaultApplicationConfig,
  type DatabaseClient,
} from "@fixmyfeed/database";
import { and, eq } from "drizzle-orm";
import { AppError, APP_ERROR_CODE } from "../errors";
import type { InstallPersistencePort, ShopifyTokenExchangePort } from "../connector-install";

const SHOPIFY_CONNECTOR_ID = "shopify";
const CREDENTIAL_TYPE = "oauth_access_token";

/** Real Shopify token exchange over HTTPS. */
export function createShopifyTokenExchange(): ShopifyTokenExchangePort {
  return {
    async exchange(request) {
      let response: Response;
      try {
        response = await fetch(request.url, {
          method: request.method,
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(request.body),
        });
      } catch {
        throw new AppError(
          APP_ERROR_CODE.UPSTREAM,
          "Could not reach Shopify to exchange the token",
        );
      }
      if (!response.ok) {
        throw new AppError(APP_ERROR_CODE.UPSTREAM, "Shopify rejected the token exchange");
      }
      return (await response.json()) as Awaited<ReturnType<ShopifyTokenExchangePort["exchange"]>>;
    },
  };
}

/** Vault-backed credential storage + `oauth_connections` upsert. */
export function createInstallPersistence(
  client: DatabaseClient,
  config: CredentialVaultApplicationConfig,
): InstallPersistencePort {
  const db = client.db;
  const vault = createCredentialVaultFromConfig(
    config,
    createDrizzleCredentialVaultPersistence(client),
  );
  return {
    async storeToken(input) {
      const metadata = await vault.store({
        organizationId: input.organizationId,
        provider: SHOPIFY_CONNECTOR_ID,
        credentialType: CREDENTIAL_TYPE,
        createdByUserId: input.userId,
        idempotencyKey: randomUUID(),
        plaintext: new TextEncoder().encode(input.accessToken),
        expiresAt: input.expiresAt,
      });
      return { credentialId: metadata.id };
    },
    async upsertConnection(input) {
      const now = new Date();
      await db
        .insert(oauthConnections)
        .values({
          organizationId: input.organizationId,
          connectorId: SHOPIFY_CONNECTOR_ID,
          externalAccountId: input.shop,
          status: "active",
          scopes: [...input.scopes],
          credentialId: input.credentialId,
          expiresAt: input.expiresAt,
          lastRefreshedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            oauthConnections.organizationId,
            oauthConnections.connectorId,
            oauthConnections.externalAccountId,
          ],
          set: {
            status: "active",
            scopes: [...input.scopes],
            credentialId: input.credentialId,
            expiresAt: input.expiresAt,
            lastRefreshedAt: now,
            revokedAt: null,
          },
        });
    },
  };
}

/** Whether an active Shopify connection already exists for the org. */
export async function hasActiveShopifyConnection(
  client: DatabaseClient,
  organizationId: string,
): Promise<boolean> {
  const [row] = await client.db
    .select({ id: oauthConnections.id })
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.organizationId, organizationId),
        eq(oauthConnections.connectorId, SHOPIFY_CONNECTOR_ID),
        eq(oauthConnections.status, "active"),
      ),
    )
    .limit(1);
  return row !== undefined;
}
