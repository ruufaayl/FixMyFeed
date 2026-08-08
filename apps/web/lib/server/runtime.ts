/**
 * Server runtime wiring (task T150) — server-only.
 *
 * Lazily constructs the config, database client, and Better Auth integration from
 * environment configuration (never at module load, so `next build` never touches
 * the database). Exposes a Better Auth `SessionReader`. These are the concrete
 * adapters behind the typed context boundary; they are exercised end-to-end
 * against real Postgres/test services in T159. Never import this from client
 * components.
 */
import { headers } from "next/headers";
import { loadConfig } from "@fixmyfeed/config";
import {
  createDatabaseClientFromConfig,
  memberships,
  workspaces,
  type DatabaseClient,
} from "@fixmyfeed/database";
import { createAuth, type AuthIntegration } from "@fixmyfeed/auth";
import { and, eq } from "drizzle-orm";
import {
  getAppContext,
  type AppContextDTO,
  type AppSession,
  type MembershipLoader,
  type MembershipRecord,
  type SessionReader,
} from "./context";
import {
  createOverviewService,
  createCatalogService,
  createIssuesService,
  createRepairsService,
  createRepairRulesService,
  createMonitoringService,
  createReportsService,
  createIntegrationsService,
  type OverviewService,
  type CatalogService,
  type IssuesService,
  type RepairsService,
  type RepairRulesService,
  type MonitoringService,
  type ReportsService,
  type IntegrationsService,
} from "./services";
import { createOverviewRepository } from "./adapters/overview-adapter";
import { createCatalogRepository } from "./adapters/catalog-adapter";
import { createIssuesRepository } from "./adapters/issues-adapter";
import { createRepairsRepository } from "./adapters/repairs-adapter";
import { createRepairRulesRepository } from "./adapters/rules-adapter";
import { createMonitoringRepository } from "./adapters/monitoring-adapter";
import { createReportsRepository } from "./adapters/reports-adapter";
import { createIntegrationsRepository } from "./adapters/integrations-adapter";
import {
  createShopifyTokenExchange,
  createInstallPersistence,
  hasActiveShopifyConnection,
} from "./adapters/connector-install-adapter";
import { scheduleOnboardingRun, getLatestOnboardingStatus } from "./adapters/onboarding-adapter";
import type { OnboardingStatusDTO } from "./onboarding-run";
import type {
  ShopifyOAuthConfig,
  ShopifyTokenExchangePort,
  InstallPersistencePort,
} from "./connector-install";
import {
  createRepairGovernanceService,
  createRepairExecutionService,
  type RepairGovernanceService,
  type RepairExecutionService,
} from "./repair-ops";
import {
  createGovernanceRepository,
  createExecutionStore,
  createRepairQueue,
  createAuditSink,
} from "./adapters/repair-ops-adapters";

/** Minimal header accessor (accepts Next's ReadonlyHeaders and Headers). */
interface HeaderReader {
  get(name: string): string | null;
}

type LoadedConfig = ReturnType<typeof loadConfig>["config"];

let configCache: LoadedConfig | undefined;
let dbCache: DatabaseClient | undefined;
let authCache: AuthIntegration | undefined;

function appConfig(): LoadedConfig {
  return (configCache ??= loadConfig(process.env, { role: "web" }).config);
}

/** Lazily-created database client (one per server process). */
export function db(): DatabaseClient {
  return (dbCache ??= createDatabaseClientFromConfig(appConfig(), "web"));
}

/** Lazily-created Better Auth integration. */
export function auth(): AuthIntegration {
  return (authCache ??= createAuth({ config: appConfig(), database: db() }));
}

/** The auth secret used to sign the connector-install state cookie. */
export function authSecret(): string {
  return appConfig().auth.secret;
}

/** Shopify OAuth configuration derived from the loaded config + feature flags. */
export function shopifyInstallConfig(): ShopifyOAuthConfig {
  const config = appConfig();
  return {
    // Mirrors the config `shopify` feature flag (client id + secret present).
    enabled: config.shopify.clientId !== undefined && config.shopify.clientSecret !== undefined,
    clientId: config.shopify.clientId,
    clientSecret: config.shopify.clientSecret,
    appUrl: config.shopify.appUrl,
    vaultReady: config.encryption.dataKey !== undefined,
  };
}

/** Concrete Shopify install ports (real token exchange + vault-backed storage). */
export function shopifyInstallPorts(): {
  exchange: ShopifyTokenExchangePort;
  persistence: InstallPersistencePort;
} {
  return {
    exchange: createShopifyTokenExchange(),
    persistence: createInstallPersistence(db(), appConfig()),
  };
}

/** Whether the org already has an active Shopify connection. */
export function shopifyConnectionActive(organizationId: string): Promise<boolean> {
  return hasActiveShopifyConnection(db(), organizationId);
}

/** Schedules the connect→import→scan onboarding run (durable ids only). */
export function scheduleOnboarding(organizationId: string, shop: string): Promise<string> {
  return scheduleOnboardingRun(db(), organizationId, shop);
}

/** The latest onboarding journey status for the org. */
export function onboardingStatus(organizationId: string): Promise<OnboardingStatusDTO> {
  return getLatestOnboardingStatus(db(), organizationId);
}

interface SessionResponse {
  readonly user?: { readonly id?: string; readonly name?: string; readonly email?: string };
}

/**
 * A `SessionReader` backed by Better Auth. Reads the current session by calling
 * the auth handler's `get-session` endpoint with the request's cookies.
 */
export function createBetterAuthSessionReader(requestHeaders: HeaderReader): SessionReader {
  return {
    async getSession(): Promise<AppSession | null> {
      const integration = auth();
      const request = new Request(`${integration.policy.baseUrl}/api/auth/get-session`, {
        headers: { cookie: requestHeaders.get("cookie") ?? "" },
      });
      const response = await integration.handler(request);
      if (!response.ok) return null;
      const data = (await response.json().catch(() => null)) as SessionResponse | null;
      const user = data?.user;
      if (!user || typeof user.id !== "string") return null;
      return { userId: user.id, name: user.name ?? "", email: user.email ?? "" };
    },
  };
}

/** A `MembershipLoader` backed by Drizzle: the workspaces a user can act in. */
export function createDrizzleMembershipLoader(client: DatabaseClient): MembershipLoader {
  const dbi = client.db;
  return {
    async load(userId: string): Promise<readonly MembershipRecord[]> {
      const rows = await dbi
        .select({
          workspaceId: workspaces.id,
          organizationId: workspaces.organizationId,
          workspaceName: workspaces.name,
          role: memberships.role,
        })
        .from(memberships)
        .innerJoin(
          workspaces,
          and(
            eq(workspaces.organizationId, memberships.organizationId),
            eq(workspaces.id, memberships.workspaceId),
          ),
        )
        .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")));
      return rows.map((r) => ({
        workspaceId: r.workspaceId,
        organizationId: r.organizationId,
        workspaceName: r.workspaceName,
        role: r.role,
      }));
    },
  };
}

interface SessionFreshnessResponse {
  readonly session?: { readonly createdAt?: string; readonly updatedAt?: string };
}

/**
 * Whether the current session was (re)authenticated within `maxAgeMs`. Backs the
 * `rollback:execute` `recent_authentication` condition — rollback is destructive
 * and requires a recent sign-in / step-up. Best-effort: unknown freshness → false.
 */
export async function isRecentlyAuthenticated(maxAgeMs = 15 * 60_000): Promise<boolean> {
  const requestHeaders = await headers();
  const integration = auth();
  const request = new Request(`${integration.policy.baseUrl}/api/auth/get-session`, {
    headers: { cookie: requestHeaders.get("cookie") ?? "" },
  });
  const response = await integration.handler(request);
  if (!response.ok) return false;
  const data = (await response.json().catch(() => null)) as SessionFreshnessResponse | null;
  const stamp = data?.session?.updatedAt ?? data?.session?.createdAt;
  if (typeof stamp !== "string") return false;
  const at = Date.parse(stamp);
  return Number.isFinite(at) && Date.now() - at <= maxAgeMs;
}

/**
 * Resolves the application context for the current server request from cookies.
 * Server components / actions call this — never the client.
 */
export async function getServerContext(
  requestedWorkspaceId?: string | null,
): Promise<AppContextDTO | null> {
  const requestHeaders = await headers();
  const sessionReader = createBetterAuthSessionReader(requestHeaders);
  const membershipLoader = createDrizzleMembershipLoader(db());
  return getAppContext(sessionReader, membershipLoader, requestedWorkspaceId);
}

interface AppServices {
  readonly overview: OverviewService;
  readonly catalog: CatalogService;
  readonly issues: IssuesService;
  readonly repairs: RepairsService;
  readonly repairRules: RepairRulesService;
  readonly repairGovernance: RepairGovernanceService;
  readonly repairExecution: RepairExecutionService;
  readonly monitoring: MonitoringService;
  readonly reports: ReportsService;
  readonly integrations: IntegrationsService;
}
let servicesCache: AppServices | undefined;

/** The wired application services (repository adapters over the DB client). */
export function services(): AppServices {
  if (servicesCache) return servicesCache;
  const client = db();
  const audit = createAuditSink(client);
  servicesCache = {
    overview: createOverviewService(createOverviewRepository(client)),
    catalog: createCatalogService(createCatalogRepository(client)),
    issues: createIssuesService(createIssuesRepository(client)),
    repairs: createRepairsService(createRepairsRepository(client)),
    repairRules: createRepairRulesService(createRepairRulesRepository(client)),
    repairGovernance: createRepairGovernanceService(createGovernanceRepository(client), audit),
    repairExecution: createRepairExecutionService(
      createExecutionStore(client),
      createRepairQueue(client),
      audit,
    ),
    monitoring: createMonitoringService(createMonitoringRepository(client)),
    reports: createReportsService(createReportsRepository(client)),
    integrations: createIntegrationsService(createIntegrationsRepository(client)),
  };
  return servicesCache;
}
