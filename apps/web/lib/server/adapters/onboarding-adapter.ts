/**
 * Onboarding journey adapters (task T166) — server-only.
 *
 * Schedules the connect→import→scan run (a durable `operations` row + an outbox
 * job carrying only ids), tracks its progress/result, and provides the concrete
 * import + scan ports. Import fetches the connected store's catalog via the T160
 * Admin client and upserts it; the scan runs the E08 diagnostics over the
 * imported catalog, persists issues, and computes the first health score. No
 * credential or serialized data ever enters the queue job.
 */
import type { CatalogProduct, CatalogProductStatus } from "@fixmyfeed/domain";
import {
  catalogProducts,
  catalogs,
  createOutboxEvent,
  diagnosticIssues,
  operations,
  outboxEvents,
  type DatabaseClient,
} from "@fixmyfeed/database";
import { runDiagnosticScan, toDiagnosticIssueRow } from "@fixmyfeed/diagnostics";
import type { AppConfig } from "@fixmyfeed/config";
import { and, desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import {
  runOnboardingImportScan,
  type OnboardingPorts,
  type OnboardingStatusDTO,
  type OnboardingStore,
} from "../onboarding-run";
import { withShopifyAdminClient } from "./shopify-client-adapter";

const OPERATION_TYPE = "onboarding_import_scan";
const ONBOARDING_EVENT = "onboarding.run";
const IMPORT_PAGE_SIZE = 100;

/** Schedules the onboarding run: a queued operation + an outbox job (ids only). */
export async function scheduleOnboardingRun(
  client: DatabaseClient,
  organizationId: string,
  shop: string,
): Promise<string> {
  const [op] = await client.db
    .insert(operations)
    .values({ organizationId, operationType: OPERATION_TYPE, status: "queued", progress: 0 })
    .returning({ id: operations.id });
  const operationId = op!.id;
  await client.db.insert(outboxEvents).values(
    createOutboxEvent({
      organizationId,
      eventType: ONBOARDING_EVENT,
      aggregateType: "operation",
      aggregateId: operationId,
      payload: { operationId, shop },
    }),
  );
  return operationId;
}

/** The latest onboarding operation for the org, mapped to a status DTO. */
export async function getLatestOnboardingStatus(
  client: DatabaseClient,
  organizationId: string,
): Promise<OnboardingStatusDTO> {
  const [row] = await client.db
    .select({
      status: operations.status,
      progress: operations.progress,
      result: operations.result,
    })
    .from(operations)
    .where(
      and(
        eq(operations.organizationId, organizationId),
        eq(operations.operationType, OPERATION_TYPE),
      ),
    )
    .orderBy(desc(operations.createdAt))
    .limit(1);
  if (!row) {
    return { state: "none", progress: 0, productCount: null, healthScore: null, issuesFound: null };
  }
  const result = (row.result ?? {}) as {
    productCount?: number;
    healthScore?: number;
    issuesFound?: number;
  };
  const state =
    row.status === "completed"
      ? "completed"
      : row.status === "failed" || row.status === "cancelled"
        ? "failed"
        : row.status === "running" || row.status === "retrying"
          ? "running"
          : "queued";
  return {
    state,
    progress: row.progress ?? 0,
    productCount: result.productCount ?? null,
    healthScore: result.healthScore ?? null,
    issuesFound: result.issuesFound ?? null,
  };
}

/** Operation-store implementation over the `operations` table. */
export function createOnboardingStore(client: DatabaseClient): OnboardingStore {
  const db = client.db;
  return {
    async markRunning(operationId) {
      await db
        .update(operations)
        .set({ status: "running", progress: 10, startedAt: new Date() })
        .where(eq(operations.id, operationId));
    },
    async setProgress(operationId, progress) {
      await db.update(operations).set({ progress }).where(eq(operations.id, operationId));
    },
    async complete(operationId, result) {
      await db
        .update(operations)
        .set({ status: "completed", progress: 100, result, completedAt: new Date() })
        .where(eq(operations.id, operationId));
    },
    async fail(operationId, reason) {
      await db
        .update(operations)
        .set({ status: "failed", error: { reason }, completedAt: new Date() })
        .where(eq(operations.id, operationId));
    },
  };
}

/**
 * Drains pending `onboarding.run` outbox events, running the import→scan journey
 * for each. Marks the event published on success; a failure is already recorded
 * on the operation (never left hanging). Exercised on the live path / owner run.
 */
export async function drainOnboardingOnce(
  client: DatabaseClient,
  config: AppConfig,
  limit = 20,
): Promise<{ processed: number }> {
  const db = client.db;
  const events = await db
    .select({
      id: outboxEvents.id,
      organizationId: outboxEvents.organizationId,
      payload: outboxEvents.payload,
    })
    .from(outboxEvents)
    .where(and(eq(outboxEvents.status, "pending"), eq(outboxEvents.eventType, ONBOARDING_EVENT)))
    .limit(limit);
  let processed = 0;
  for (const event of events) {
    const payload = (event.payload ?? {}) as { operationId?: string; shop?: string };
    if (event.organizationId && payload.operationId) {
      await runOnboardingImportScan(
        payload.operationId,
        createOnboardingStore(client),
        createOnboardingPorts(client, config, event.organizationId),
      );
    }
    await db
      .update(outboxEvents)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(outboxEvents.id, event.id));
    processed += 1;
  }
  return { processed };
}

// ── Concrete import + scan ports ─────────────────────────────────────────────

const asStatus = (raw: unknown): CatalogProductStatus => {
  const v = typeof raw === "string" ? raw.toLowerCase() : "active";
  return (v === "archived" || v === "draft" ? v : "active") as CatalogProductStatus;
};

interface RawProductsPage {
  products: {
    nodes: ReadonlyArray<{
      id: string;
      handle: string | null;
      title: string;
      descriptionHtml: string | null;
      productType: string | null;
      vendor: string | null;
      status: string | null;
      tags: readonly string[] | null;
      onlineStoreUrl: string | null;
      images: { nodes: ReadonlyArray<{ id: string; url: string; altText: string | null }> };
      variants: {
        nodes: ReadonlyArray<{
          id: string;
          sku: string | null;
          barcode: string | null;
          title: string | null;
          price: string | null;
          compareAtPrice: string | null;
        }>;
      };
    }>;
  };
}

const PRODUCTS_QUERY = `query($first: Int!) {
  products(first: $first) {
    nodes {
      id handle title descriptionHtml productType vendor status tags onlineStoreUrl
      images(first: 10) { nodes { id url altText } }
      variants(first: 50) { nodes { id sku barcode title price compareAtPrice } }
    }
  }
}`;

function toCatalogProduct(node: RawProductsPage["products"]["nodes"][number]): CatalogProduct {
  return {
    externalId: node.id,
    handle: node.handle,
    title: node.title,
    description: node.descriptionHtml,
    productType: node.productType,
    vendor: node.vendor,
    status: asStatus(node.status),
    tags: node.tags ? [...node.tags] : [],
    onlineStoreUrl: node.onlineStoreUrl,
    images: node.images.nodes.map((i) => ({ externalId: i.id, url: i.url, altText: i.altText })),
    variants: node.variants.nodes.map((v) => ({
      externalId: v.id,
      sku: v.sku,
      gtin: v.barcode,
      title: v.title,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      availableForSale: true,
      inventoryQuantity: null,
    })),
  };
}

const fingerprint = (product: CatalogProduct): string =>
  createHash("sha256").update(JSON.stringify(product)).digest("hex");

/**
 * Concrete onboarding ports for the connected Shopify store. `importCatalog`
 * fetches the catalog via the Admin client and upserts it; `runScan` runs the
 * diagnostics over the imported catalog, persists issues, and returns the health
 * score. Executed on the live path (owner run); covered in CI by the
 * orchestration unit tests.
 */
export function createOnboardingPorts(
  client: DatabaseClient,
  config: AppConfig,
  organizationId: string,
): OnboardingPorts {
  const db = client.db;

  async function ensureCatalogId(shop: string): Promise<string> {
    const [existing] = await db
      .select({ id: catalogs.id })
      .from(catalogs)
      .where(
        and(
          eq(catalogs.organizationId, organizationId),
          eq(catalogs.connectorId, "shopify"),
          eq(catalogs.externalAccountId, shop),
        ),
      )
      .limit(1);
    if (existing) return existing.id;
    const [created] = await db
      .insert(catalogs)
      .values({
        organizationId,
        connectorId: "shopify",
        externalAccountId: shop,
        displayName: shop,
        status: "active",
      })
      .returning({ id: catalogs.id });
    return created!.id;
  }

  return {
    async importCatalog() {
      return withShopifyAdminClient(client, config, organizationId, async (admin, ctx) => {
        const data = await admin.graphql<RawProductsPage>(PRODUCTS_QUERY, {
          first: IMPORT_PAGE_SIZE,
        });
        const products = data.products.nodes.map(toCatalogProduct);
        const catalogId = await ensureCatalogId(ctx.shop);
        for (const product of products) {
          await db
            .insert(catalogProducts)
            .values({
              organizationId,
              catalogId,
              externalId: product.externalId,
              fingerprint: fingerprint(product),
              payload: product as unknown as typeof catalogProducts.$inferInsert.payload,
            })
            .onConflictDoUpdate({
              target: [catalogProducts.catalogId, catalogProducts.externalId],
              set: { fingerprint: fingerprint(product), payload: product as never },
            });
        }
        return { productCount: products.length };
      });
    },
    async runScan() {
      const rows = await db
        .select({ catalogId: catalogProducts.catalogId, payload: catalogProducts.payload })
        .from(catalogProducts)
        .where(eq(catalogProducts.organizationId, organizationId));
      const products = rows.map((r) => r.payload as CatalogProduct);
      const catalogId = rows[0]?.catalogId ?? "";
      const scan = await runDiagnosticScan({ products });
      const now = new Date();
      if (catalogId !== "" && scan.scored.length > 0) {
        await db
          .insert(diagnosticIssues)
          .values(
            scan.scored.map((issue) =>
              toDiagnosticIssueRow(organizationId, catalogId, issue, {
                firstSeenAt: now,
                lastSeenAt: now,
              }),
            ),
          )
          .onConflictDoNothing();
      }
      const affected = new Set(
        scan.scored.map((i) => i.productExternalId).filter((id): id is string => id !== null),
      ).size;
      const total = products.length;
      const healthScore = total === 0 ? 100 : Math.round(((total - affected) / total) * 100);
      return { healthScore, issuesFound: scan.summary.total };
    },
  };
}
