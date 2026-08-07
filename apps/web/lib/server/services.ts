/**
 * Typed application services + repository ports (task T151).
 *
 * The service layer the Signal Interface calls (via server components / actions).
 * Every method resolves its tenant scope from the server `AppContextDTO`
 * (`resolveScope`), validates query input, calls an INJECTED repository port with
 * the resolved scope, maps records to DTOs (tagging provenance), and normalizes
 * any failure into an `AppError`. Repositories are ports — Drizzle adapters
 * implement them in later tasks; tests inject fakes. No infrastructure type
 * crosses this boundary.
 */
import type { AppContextDTO } from "./context.js";
import { appError, normalizeError } from "./errors.js";
import { resolveScope, type TenantScope } from "./tenant-scope.js";
import {
  authoritative,
  derived,
  estimated,
  validateDateRange,
  validateFilter,
  validatePageRequest,
  validateSort,
  type DateRange,
  type Page,
  type PageRequestInput,
} from "./query.js";
import type {
  ActivityDTO,
  CatalogProductDTO,
  EvidenceDTO,
  HealthSignalDTO,
  IntegrationDTO,
  IntegrationStatusDTO,
  IssueGroupDTO,
  MonitoringDTO,
  MonitoringMetricDTO,
  OverviewDTO,
  ProductInspectorDTO,
  RepairExceptionDTO,
  RepairPlanDTO,
  ReportSummaryDTO,
} from "./dto.js";

/** Runs `fn`, normalizing any thrown value into an AppError. */
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw normalizeError(error);
  }
}

// ── Overview ─────────────────────────────────────────────────────────────────

export interface OverviewRecord {
  readonly healthScore: number;
  readonly productsAffected: number;
  readonly criticalIssues: number;
  readonly repairable: number;
  readonly integrations: readonly IntegrationStatusDTO[];
  readonly topSignals: readonly HealthSignalRecord[];
  readonly recentActivity: readonly ActivityDTO[];
}
export interface HealthSignalRecord {
  readonly id: string;
  readonly title: string;
  readonly severity: HealthSignalDTO["severity"];
  readonly affectedCount: number;
  readonly exposure: number | null;
  readonly confidence: number | null;
  readonly sources: HealthSignalDTO["sources"];
  readonly detectedAt: string | null;
}
export interface OverviewRepository {
  loadOverview(scope: TenantScope): Promise<OverviewRecord>;
}
export interface OverviewService {
  getOverview(context: AppContextDTO | null, workspaceId?: string | null): Promise<OverviewDTO>;
}
export function createOverviewService(repo: OverviewRepository): OverviewService {
  return {
    getOverview: (context, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        const r = await repo.loadOverview(scope);
        return {
          healthScore: derived(r.healthScore),
          productsAffected: authoritative(r.productsAffected),
          criticalIssues: authoritative(r.criticalIssues),
          repairable: derived(r.repairable),
          integrations: r.integrations,
          topSignals: r.topSignals.map(toHealthSignalDTO),
          recentActivity: r.recentActivity,
        } satisfies OverviewDTO;
      }),
  };
}
function toHealthSignalDTO(r: HealthSignalRecord): HealthSignalDTO {
  return {
    id: r.id,
    title: r.title,
    severity: r.severity,
    affectedCount: authoritative(r.affectedCount),
    exposure: r.exposure === null ? null : estimated(r.exposure),
    confidence: r.confidence,
    sources: r.sources,
    detectedAt: r.detectedAt,
  };
}

// ── Catalog + inspector ──────────────────────────────────────────────────────

export const CATALOG_SORT_FIELDS = ["title", "price", "issues"] as const;
export type CatalogSortField = (typeof CATALOG_SORT_FIELDS)[number];
export const CATALOG_FILTER_KEYS = ["availability", "severity", "search"] as const;
export type CatalogFilterKey = (typeof CATALOG_FILTER_KEYS)[number];

export interface CatalogListQuery {
  readonly workspaceId?: string | null;
  readonly page?: PageRequestInput;
  readonly filter?: Record<string, unknown>;
  readonly sort?: { field?: string; direction?: string };
}
export interface CatalogRepository {
  listProducts(
    scope: TenantScope,
    query: {
      page: { cursor: string | null; limit: number };
      filter: Partial<Record<CatalogFilterKey, string>>;
      sort: { field: CatalogSortField; direction: "asc" | "desc" };
    },
  ): Promise<Page<CatalogProductDTO>>;
  getProductInspector(scope: TenantScope, productId: string): Promise<ProductInspectorDTO | null>;
}
export interface CatalogService {
  listProducts(
    context: AppContextDTO | null,
    query?: CatalogListQuery,
  ): Promise<Page<CatalogProductDTO>>;
  getProductInspector(
    context: AppContextDTO | null,
    productId: string,
    workspaceId?: string | null,
  ): Promise<ProductInspectorDTO>;
}
export function createCatalogService(repo: CatalogRepository): CatalogService {
  return {
    listProducts: (context, query = {}) =>
      guard(async () => {
        const scope = resolveScope(context, query.workspaceId);
        const page = validatePageRequest(query.page);
        const filter = validateFilter<CatalogFilterKey>(query.filter, CATALOG_FILTER_KEYS);
        const sort = validateSort<CatalogSortField>(query.sort, CATALOG_SORT_FIELDS, {
          field: "title",
          direction: "asc",
        });
        return repo.listProducts(scope, { page, filter, sort });
      }),
    getProductInspector: (context, productId, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        const inspector = await repo.getProductInspector(scope, productId);
        if (inspector === null) throw appError.notFound("Product not found");
        return inspector;
      }),
  };
}

// ── Issues + evidence ────────────────────────────────────────────────────────

export const ISSUE_FILTER_KEYS = ["severity", "view"] as const;
export type IssueFilterKey = (typeof ISSUE_FILTER_KEYS)[number];

export interface IssueGroupRecord {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly severity: IssueGroupDTO["severity"];
  readonly affectedCount: number;
  readonly exposure: number | null;
  readonly confidence: number | null;
  readonly repairable: boolean;
}
export interface IssuesRepository {
  listGroups(
    scope: TenantScope,
    filter: Partial<Record<IssueFilterKey, string>>,
  ): Promise<readonly IssueGroupRecord[]>;
  getEvidence(scope: TenantScope, issueGroupId: string): Promise<EvidenceDTO | null>;
}
export interface IssuesService {
  listGroups(
    context: AppContextDTO | null,
    filter?: Record<string, unknown>,
    workspaceId?: string | null,
  ): Promise<readonly IssueGroupDTO[]>;
  getEvidence(
    context: AppContextDTO | null,
    issueGroupId: string,
    workspaceId?: string | null,
  ): Promise<EvidenceDTO>;
}
export function createIssuesService(repo: IssuesRepository): IssuesService {
  return {
    listGroups: (context, filter, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        const validated = validateFilter<IssueFilterKey>(filter, ISSUE_FILTER_KEYS);
        const records = await repo.listGroups(scope, validated);
        return records.map((r): IssueGroupDTO => ({
          id: r.id,
          code: r.code,
          title: r.title,
          severity: r.severity,
          affectedCount: authoritative(r.affectedCount),
          exposure: r.exposure === null ? null : estimated(r.exposure),
          confidence: r.confidence,
          repairable: r.repairable,
        }));
      }),
    getEvidence: (context, issueGroupId, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        const evidence = await repo.getEvidence(scope, issueGroupId);
        if (evidence === null) {
          throw appError.notFound("Evidence not found");
        }
        return evidence;
      }),
  };
}

// ── Repairs + repair exceptions ──────────────────────────────────────────────

export interface RepairsRepository {
  getPlan(scope: TenantScope, planId: string): Promise<RepairPlanDTO | null>;
  listExceptions(scope: TenantScope, executionId: string): Promise<readonly RepairExceptionDTO[]>;
}
export interface RepairsService {
  getPlan(
    context: AppContextDTO | null,
    planId: string,
    workspaceId?: string | null,
  ): Promise<RepairPlanDTO>;
  listExceptions(
    context: AppContextDTO | null,
    executionId: string,
    workspaceId?: string | null,
  ): Promise<readonly RepairExceptionDTO[]>;
}
export function createRepairsService(repo: RepairsRepository): RepairsService {
  return {
    getPlan: (context, planId, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        const plan = await repo.getPlan(scope, planId);
        if (plan === null) {
          throw appError.notFound("Repair plan not found");
        }
        return plan;
      }),
    listExceptions: (context, executionId, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        return repo.listExceptions(scope, executionId);
      }),
  };
}

// ── Monitoring ───────────────────────────────────────────────────────────────

export interface MonitoringRecord {
  readonly metrics: readonly { id: string; label: string; value: string; caption: string | null }[];
  readonly events: MonitoringDTO["events"];
}
export interface MonitoringRepository {
  loadMonitoring(scope: TenantScope, range: DateRange): Promise<MonitoringRecord>;
}
export interface MonitoringService {
  getMonitoring(
    context: AppContextDTO | null,
    range: { from?: string; to?: string },
    workspaceId?: string | null,
  ): Promise<MonitoringDTO>;
}
export function createMonitoringService(repo: MonitoringRepository): MonitoringService {
  return {
    getMonitoring: (context, range, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        const validated = validateDateRange(range);
        const record = await repo.loadMonitoring(scope, validated);
        return {
          metrics: record.metrics.map((m): MonitoringMetricDTO => ({
            id: m.id,
            label: m.label,
            value: derived(m.value),
            caption: m.caption,
          })),
          events: record.events,
        };
      }),
  };
}

// ── Reports ──────────────────────────────────────────────────────────────────

export interface ReportRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly stat: string;
}
export interface ReportsRepository {
  listReports(scope: TenantScope): Promise<readonly ReportRecord[]>;
}
export interface ReportsService {
  listReports(
    context: AppContextDTO | null,
    workspaceId?: string | null,
  ): Promise<readonly ReportSummaryDTO[]>;
}
export function createReportsService(repo: ReportsRepository): ReportsService {
  return {
    listReports: (context, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        const records = await repo.listReports(scope);
        return records.map((r): ReportSummaryDTO => ({
          id: r.id,
          title: r.title,
          description: r.description,
          stat: derived(r.stat),
        }));
      }),
  };
}

// ── Integrations ─────────────────────────────────────────────────────────────

export interface IntegrationsRepository {
  listIntegrations(scope: TenantScope): Promise<readonly IntegrationDTO[]>;
}
export interface IntegrationsService {
  listIntegrations(
    context: AppContextDTO | null,
    workspaceId?: string | null,
  ): Promise<readonly IntegrationDTO[]>;
}
export function createIntegrationsService(repo: IntegrationsRepository): IntegrationsService {
  return {
    listIntegrations: (context, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        return repo.listIntegrations(scope);
      }),
  };
}
