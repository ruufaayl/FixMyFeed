/**
 * Integrations repository adapter (task T158) — server-only.
 *
 * Implements `IntegrationsRepository` over Drizzle, scoped by `organizationId`.
 * Each connected catalog surfaces as a source integration with its connect state
 * and last-updated time. No connector payload or Drizzle row crosses the boundary.
 * Verified E2E in T159.
 */
import { catalogs, type DatabaseClient } from "@fixmyfeed/database";
import { eq } from "drizzle-orm";
import type { IntegrationsRepository } from "../services";
import type { IntegrationDTO } from "../dto";
import type { TenantScope } from "../tenant-scope";

function connectState(status: string): IntegrationDTO["connectState"] {
  return status === "active" ? "connected" : "not-connected";
}

export function createIntegrationsRepository(client: DatabaseClient): IntegrationsRepository {
  const db = client.db;

  return {
    async listIntegrations(scope: TenantScope): Promise<readonly IntegrationDTO[]> {
      const rows = await db
        .select({
          id: catalogs.id,
          connectorId: catalogs.connectorId,
          displayName: catalogs.displayName,
          status: catalogs.status,
          updatedAt: catalogs.updatedAt,
        })
        .from(catalogs)
        .where(eq(catalogs.organizationId, scope.organizationId));

      return rows.map((c): IntegrationDTO => ({
        id: c.id,
        name: c.displayName ?? c.connectorId,
        kind: "source",
        connectState: connectState(c.status),
        detail: c.connectorId,
        lastSyncAt: c.updatedAt.toISOString(),
      }));
    },
  };
}
