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
  type OverviewService,
  type CatalogService,
} from "./services";
import { createOverviewRepository } from "./adapters/overview-adapter";
import { createCatalogRepository } from "./adapters/catalog-adapter";

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
}
let servicesCache: AppServices | undefined;

/** The wired application services (repository adapters over the DB client). */
export function services(): AppServices {
  return (servicesCache ??= {
    overview: createOverviewService(createOverviewRepository(db())),
    catalog: createCatalogService(createCatalogRepository(db())),
  });
}
