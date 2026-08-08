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
import { can, isRole, type Role } from "@fixmyfeed/domain";
import type { AppContextDTO } from "./context";
import { appError, normalizeError } from "./errors";
import { resolveScope, type TenantScope } from "./tenant-scope";
import { draftToDefinition } from "./adapters/rules-mappers";
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
} from "./query";
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
  RepairRuleDTO,
  ReportSummaryDTO,
  RuleDraftDTO,
  RuleSimulationDTO,
} from "./dto";

/** Runs `fn`, normalizing any thrown value into an AppError. */
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw normalizeError(error);
  }
}

function actorRoles(scope: TenantScope): Role[] {
  return isRole(scope.role) ? [scope.role] : [];
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

/** Identifies a single change within a plan. */
export interface RepairChangeRef {
  readonly productExternalId: string;
  readonly field: string;
}

export interface RepairsRepository {
  getPlan(scope: TenantScope, planId: string): Promise<RepairPlanDTO | null>;
  getLatestPlan(scope: TenantScope): Promise<RepairPlanDTO | null>;
  listExceptions(scope: TenantScope, executionId: string): Promise<readonly RepairExceptionDTO[]>;
  /** Sets a change's proposed value and clears its needs-input flag. */
  resolveChange(
    scope: TenantScope,
    planId: string,
    ref: RepairChangeRef,
    value: string,
  ): Promise<void>;
}
export interface RepairsService {
  getPlan(
    context: AppContextDTO | null,
    planId: string,
    workspaceId?: string | null,
  ): Promise<RepairPlanDTO>;
  /** The most recent plan for the workspace, or null when none exists. */
  getLatestPlan(
    context: AppContextDTO | null,
    workspaceId?: string | null,
  ): Promise<RepairPlanDTO | null>;
  listExceptions(
    context: AppContextDTO | null,
    executionId: string,
    workspaceId?: string | null,
  ): Promise<readonly RepairExceptionDTO[]>;
  /** Applies an assisted value or a conflict resolution to a plan change. */
  resolveChange(
    context: AppContextDTO | null,
    planId: string,
    ref: RepairChangeRef,
    value: string,
    workspaceId?: string | null,
  ): Promise<void>;
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
    getLatestPlan: (context, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        return repo.getLatestPlan(scope);
      }),
    listExceptions: (context, executionId, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        return repo.listExceptions(scope, executionId);
      }),
    resolveChange: (context, planId, ref, value, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        if (value.trim() === "") throw appError.validation("value is required");
        await repo.resolveChange(scope, planId, ref, value);
      }),
  };
}

// ── Repair rules (Rule Builder) ──────────────────────────────────────────────

export interface RepairRulesRepository {
  list(scope: TenantScope): Promise<readonly RepairRuleDTO[]>;
  create(scope: TenantScope, draft: RuleDraftDTO): Promise<RepairRuleDTO>;
  update(scope: TenantScope, ruleId: string, draft: RuleDraftDTO): Promise<RepairRuleDTO | null>;
  setEnabled(scope: TenantScope, ruleId: string, enabled: boolean): Promise<boolean>;
  remove(scope: TenantScope, ruleId: string): Promise<boolean>;
  /** Dry-run: current enabled rules against the workspace's open issues. */
  simulate(scope: TenantScope): Promise<RuleSimulationDTO>;
}

export interface RepairRulesService {
  list(
    context: AppContextDTO | null,
    workspaceId?: string | null,
  ): Promise<readonly RepairRuleDTO[]>;
  create(
    context: AppContextDTO | null,
    draft: RuleDraftDTO,
    workspaceId?: string | null,
  ): Promise<RepairRuleDTO>;
  update(
    context: AppContextDTO | null,
    ruleId: string,
    draft: RuleDraftDTO,
    workspaceId?: string | null,
  ): Promise<RepairRuleDTO>;
  setEnabled(
    context: AppContextDTO | null,
    ruleId: string,
    enabled: boolean,
    workspaceId?: string | null,
  ): Promise<void>;
  remove(context: AppContextDTO | null, ruleId: string, workspaceId?: string | null): Promise<void>;
  simulate(context: AppContextDTO | null, workspaceId?: string | null): Promise<RuleSimulationDTO>;
}

/** Validates a draft's name + declarative definition, mapping to AppError. */
function validateDraft(draft: RuleDraftDTO): void {
  if (draft.name.trim() === "") throw appError.validation("Rule name is required");
  if (draft.definition.conditions.length === 0) {
    throw appError.validation("A rule needs at least one condition");
  }
  try {
    draftToDefinition(draft); // deny-by-default validation of fields/operators/action
  } catch (error) {
    throw appError.validation("Invalid rule definition", {
      reason: error instanceof Error ? error.message : "invalid",
    });
  }
}

export function createRepairRulesService(repo: RepairRulesRepository): RepairRulesService {
  function requireManage(scope: TenantScope): void {
    if (!can(actorRoles(scope), "rule:manage", { tenantScoped: true })) {
      throw appError.forbidden("Not permitted to manage repair rules");
    }
  }
  return {
    list: (context, workspaceId) =>
      guard(async () => repo.list(resolveScope(context, workspaceId))),
    simulate: (context, workspaceId) =>
      guard(async () => repo.simulate(resolveScope(context, workspaceId))),
    create: (context, draft, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        requireManage(scope);
        validateDraft(draft);
        return repo.create(scope, draft);
      }),
    update: (context, ruleId, draft, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        requireManage(scope);
        validateDraft(draft);
        const updated = await repo.update(scope, ruleId, draft);
        if (updated === null) throw appError.notFound("Rule not found");
        return updated;
      }),
    setEnabled: (context, ruleId, enabled, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        requireManage(scope);
        const ok = await repo.setEnabled(scope, ruleId, enabled);
        if (!ok) throw appError.notFound("Rule not found");
      }),
    remove: (context, ruleId, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        requireManage(scope);
        const ok = await repo.remove(scope, ruleId);
        if (!ok) throw appError.notFound("Rule not found");
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
/** Defaults an open monitoring range to the last 30 days. */
function resolveMonitoringRange(range: { from?: string; to?: string }): DateRange {
  if (range.from && range.to) return validateDateRange(range);
  const to = range.to ? new Date(range.to) : new Date();
  const from = range.from
    ? new Date(range.from)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return validateDateRange({ from: from.toISOString(), to: to.toISOString() });
}

export function createMonitoringService(repo: MonitoringRepository): MonitoringService {
  return {
    getMonitoring: (context, range, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        const validated = resolveMonitoringRange(range);
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
  /** Exports the report summaries as CSV text. Requires `report:export`. */
  exportCsv(context: AppContextDTO | null, workspaceId?: string | null): Promise<string>;
}

/** RFC-4180 CSV field: quote when it contains a comma, quote, or newline. */
function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
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
    exportCsv: (context, workspaceId) =>
      guard(async () => {
        const scope = resolveScope(context, workspaceId);
        if (!can(actorRoles(scope), "report:export", { tenantScoped: true })) {
          throw appError.forbidden("Not permitted to export reports");
        }
        const records = await repo.listReports(scope);
        const rows = [
          ["Report", "Description", "Value"],
          ...records.map((r) => [r.title, r.description ?? "", r.stat]),
        ];
        return rows.map((cols) => cols.map(csvField).join(",")).join("\n");
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
