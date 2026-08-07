/**
 * Catalog repository adapter (task T152) — server-only.
 *
 * Implements `CatalogRepository` over Drizzle, scoped by `organizationId`. Reads
 * the normalized catalog + open diagnostic issues and maps them to DTOs via the
 * pure mappers — the JSONB payload never leaves this layer. Query behavior is
 * verified end-to-end against real Postgres in T159.
 */
import type { CatalogProduct } from "@fixmyfeed/domain";
import { catalogProducts, diagnosticIssues, type DatabaseClient } from "@fixmyfeed/database";
import { and, asc, desc, eq, gt, ilike, inArray, sql } from "drizzle-orm";
import type { CatalogProductDTO, IssueDTO, IssueSeverityDTO } from "../dto";
import type { Page } from "../query";
import type { CatalogRepository } from "../services";
import type { TenantScope } from "../tenant-scope";
import {
  toCatalogProductDTO,
  toProductInspectorDTO,
  worstOf,
  type ProductIssueAggregate,
} from "./mappers";

function issueAggregates(
  rows: readonly { productExternalId: string | null; severity: string }[],
): Map<string, ProductIssueAggregate> {
  const bySeverity = new Map<string, IssueSeverityDTO[]>();
  for (const row of rows) {
    if (row.productExternalId === null) continue;
    const list = bySeverity.get(row.productExternalId) ?? [];
    list.push(row.severity as IssueSeverityDTO);
    bySeverity.set(row.productExternalId, list);
  }
  const result = new Map<string, ProductIssueAggregate>();
  for (const [id, severities] of bySeverity) {
    result.set(id, { count: severities.length, worstSeverity: worstOf(severities) });
  }
  return result;
}

export function createCatalogRepository(client: DatabaseClient): CatalogRepository {
  const db = client.db;

  return {
    async listProducts(scope: TenantScope, query): Promise<Page<CatalogProductDTO>> {
      const search = query.filter.search;
      const titleExpr = sql<string>`(${catalogProducts.payload} ->> 'title')`;
      const conditions = [eq(catalogProducts.organizationId, scope.organizationId)];
      if (query.page.cursor) conditions.push(gt(catalogProducts.externalId, query.page.cursor));
      if (search) conditions.push(ilike(titleExpr, `%${search}%`));

      const orderExpr = query.sort.field === "title" ? titleExpr : catalogProducts.externalId;
      const rows = await db
        .select({ externalId: catalogProducts.externalId, payload: catalogProducts.payload })
        .from(catalogProducts)
        .where(and(...conditions))
        .orderBy(query.sort.direction === "desc" ? desc(orderExpr) : asc(orderExpr))
        .limit(query.page.limit);

      const ids = rows.map((r) => r.externalId);
      const issueRows =
        ids.length === 0
          ? []
          : await db
              .select({
                productExternalId: diagnosticIssues.productExternalId,
                severity: diagnosticIssues.severity,
              })
              .from(diagnosticIssues)
              .where(
                and(
                  eq(diagnosticIssues.organizationId, scope.organizationId),
                  eq(diagnosticIssues.status, "open"),
                  inArray(diagnosticIssues.productExternalId, ids),
                ),
              );
      const aggregates = issueAggregates(issueRows);

      const items = rows.map((row) =>
        toCatalogProductDTO(
          row.payload as CatalogProduct,
          aggregates.get(row.externalId) ?? {
            count: 0,
            worstSeverity: null,
          },
        ),
      );

      const [{ value: total } = { value: 0 }] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(catalogProducts)
        .where(eq(catalogProducts.organizationId, scope.organizationId));

      const nextCursor =
        rows.length === query.page.limit ? (rows[rows.length - 1]?.externalId ?? null) : null;
      return { items, nextCursor, total };
    },

    async getProductInspector(scope: TenantScope, productId: string) {
      const [row] = await db
        .select({ payload: catalogProducts.payload })
        .from(catalogProducts)
        .where(
          and(
            eq(catalogProducts.organizationId, scope.organizationId),
            eq(catalogProducts.externalId, productId),
          ),
        )
        .limit(1);
      if (!row) return null;

      const issueRows = await db
        .select({
          id: diagnosticIssues.id,
          code: diagnosticIssues.code,
          severity: diagnosticIssues.severity,
          productExternalId: diagnosticIssues.productExternalId,
          field: diagnosticIssues.field,
          message: diagnosticIssues.message,
          status: diagnosticIssues.status,
          firstSeenAt: diagnosticIssues.firstSeenAt,
          lastSeenAt: diagnosticIssues.lastSeenAt,
        })
        .from(diagnosticIssues)
        .where(
          and(
            eq(diagnosticIssues.organizationId, scope.organizationId),
            eq(diagnosticIssues.productExternalId, productId),
          ),
        );

      const issues: IssueDTO[] = issueRows.map((i) => ({
        id: i.id,
        code: i.code,
        severity: i.severity as IssueSeverityDTO,
        productExternalId: i.productExternalId,
        field: i.field,
        message: i.message,
        status: i.status as IssueDTO["status"],
        firstSeenAt: i.firstSeenAt.toISOString(),
        lastSeenAt: i.lastSeenAt.toISOString(),
      }));

      return toProductInspectorDTO(row.payload as CatalogProduct, issues);
    },
  };
}
