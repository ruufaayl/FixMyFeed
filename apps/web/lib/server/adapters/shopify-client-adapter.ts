/**
 * Shopify Admin client accessor (task T160) — server-only.
 *
 * Resolves the org's active Shopify OAuth connection, decrypts the access token
 * inside the credential vault callback, and yields an authenticated Admin client
 * for the duration of `fn`. The token never leaves the callback: it is not
 * returned, logged, stored on the client after use, or placed in a DTO/queue.
 * The concrete `fetch` transport lives here so the connectors package stays
 * network-free.
 */
import {
  createCredentialVaultFromConfig,
  createDrizzleCredentialVaultPersistence,
  oauthConnections,
  type CredentialVaultApplicationConfig,
  type DatabaseClient,
} from "@fixmyfeed/database";
import { shopify } from "@fixmyfeed/connectors";
import { and, eq } from "drizzle-orm";

type ShopifyAdminClient = shopify.ShopifyAdminClient;
type ShopifyHttpResponse = shopify.ShopifyHttpResponse;
type ShopifyHttpTransport = shopify.ShopifyHttpTransport;
import { appError } from "../errors";

const SHOPIFY_CONNECTOR_ID = "shopify";

/** A `fetch`-backed transport for the Shopify Admin client. */
export function createFetchTransport(): ShopifyHttpTransport {
  return {
    async send(request): Promise<ShopifyHttpResponse> {
      const response = await fetch(request.url, {
        method: request.method,
        headers: { ...request.headers },
        body: request.body,
      });
      return {
        status: response.status,
        ok: response.ok,
        header: (name) => response.headers.get(name),
        json: () => response.json(),
      };
    },
  };
}

/** The org's active Shopify connection (shop + scopes + credential reference). */
export interface ShopifyConnection {
  readonly shop: string;
  readonly scopes: readonly string[];
  readonly credentialId: string;
}

/** Reads the active Shopify connection, or null when none exists. */
export async function getActiveShopifyConnection(
  client: DatabaseClient,
  organizationId: string,
): Promise<ShopifyConnection | null> {
  const [row] = await client.db
    .select({
      externalAccountId: oauthConnections.externalAccountId,
      scopes: oauthConnections.scopes,
      credentialId: oauthConnections.credentialId,
    })
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.organizationId, organizationId),
        eq(oauthConnections.connectorId, SHOPIFY_CONNECTOR_ID),
        eq(oauthConnections.status, "active"),
      ),
    )
    .limit(1);
  if (!row || row.credentialId === null) return null;
  return { shop: row.externalAccountId, scopes: row.scopes ?? [], credentialId: row.credentialId };
}

export interface ShopifyClientContext {
  readonly shop: string;
  readonly scopes: readonly string[];
}

/**
 * Runs `fn` with an authenticated Shopify Admin client for the org's active
 * connection. Throws NOT_FOUND when no active connection exists. The decrypted
 * token lives only for the duration of the vault callback.
 */
export async function withShopifyAdminClient<T>(
  client: DatabaseClient,
  config: CredentialVaultApplicationConfig,
  organizationId: string,
  fn: (admin: ShopifyAdminClient, context: ShopifyClientContext) => Promise<T>,
  transport: ShopifyHttpTransport = createFetchTransport(),
): Promise<T> {
  const connection = await getActiveShopifyConnection(client, organizationId);
  if (connection === null) {
    throw appError.notFound("No active Shopify connection for this workspace");
  }
  const vault = createCredentialVaultFromConfig(
    config,
    createDrizzleCredentialVaultPersistence(client),
  );
  return vault.withCredential(
    { organizationId, credentialId: connection.credentialId },
    (plaintext) => {
      const admin = shopify.createShopifyAdminClient({
        shop: connection.shop,
        accessToken: plaintext.toString("utf8"),
        transport,
      });
      return fn(admin, { shop: connection.shop, scopes: connection.scopes });
    },
  );
}
