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
import { loadConfig } from "@fixmyfeed/config";
import { createDatabaseClientFromConfig, type DatabaseClient } from "@fixmyfeed/database";
import { createAuth, type AuthIntegration } from "@fixmyfeed/auth";
import type { AppSession, SessionReader } from "./context";

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
export function createBetterAuthSessionReader(requestHeaders: Headers): SessionReader {
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
