# T150 — Completion Report

**Task:** T150 — Auth + tenant/workspace application context (Epic E11). **State:** In Review.

## What was built

The server-side application-context boundary — the first piece of the single typed boundary between the domain/infrastructure and the Signal Interface. **No Drizzle rows, connector payloads, or infrastructure types cross into React** — only DTOs.

**`apps/web/lib/server/context.ts` (pure, unit-tested):** `AppUserDTO` / `WorkspaceDTO` / `AppContextDTO`; `AppSession` / `MembershipRecord` (mapped inputs, not rows); `resolveAppContext` (session + memberships → context, active-workspace defaulting + membership guard); `SessionReader` / `MembershipLoader` ports; `getAppContext` (composition over ports); `hasActiveWorkspace`.

**`apps/web/lib/server/runtime.ts` (server-only):** lazy config/database/auth singletons (never constructed at module load, so `next build` never touches the DB) + `createBetterAuthSessionReader` (reads the session via the Better Auth handler's `get-session` with request cookies).

**`apps/web/app/api/auth/[...all]/route.ts`:** the Better Auth API route (Node runtime, dynamic).

**Explicit fixtures:** `apps/web/lib/fixtures/demo-context.ts` — the sample context kept as an EXPLICIT fixture (tests/demo only), never a silent production fallback.

## Build integration

- `apps/web` now depends on `@fixmyfeed/{auth,config,database}`; server packages are `serverExternalPackages` in `next.config.ts` (not bundled); web `build` runs the workspace build (`pnpm -w run build`) before `next build` so all `dist/` exist on Vercel.
- **Cross-cutting fix:** `packages/database/src/migrate.ts` computes `DEFAULT_MIGRATIONS_FOLDER` via `path.join` instead of `new URL("../drizzle", …)` so app bundlers don't statically resolve the migrations folder as a module (identical runtime path). Database tests still pass.
- Added a Vitest config + CI step for the web boundary (`pnpm --filter @fixmyfeed/web test`).

## Tests

`apps/web/tests/context.test.ts` (7, Vitest): resolveAppContext (unauth null, DTO mapping, requested-workspace membership guard, hasActiveWorkspace), getAppContext composition over fake ports, demo-fixture explicitness. Full gate: 397 node tests, format, lint (0 errors), root `tsc -b`, web `tsc --noEmit`, **`next build` succeeds** (all routes + dynamic `/api/auth`).

## Runtime verification

The pure context logic is unit-tested now; the live Better Auth session + tenancy membership reads are exercised end-to-end against real Postgres/test services in **T159**.

## Notes / next

`MembershipLoader`'s concrete Drizzle adapter + all read services land in **T151** (the typed DTO/service boundary). Reads stay server-side; long-running work will return durable execution IDs (T154–T156).
