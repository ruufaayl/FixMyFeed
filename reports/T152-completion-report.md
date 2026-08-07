# T152 — Completion Report

**Task:** T152 — Overview + Catalog live data (Epic E11). **State:** In Review.

## What was built

Wired the **Overview (`/`)** and **Catalog (`/catalog`)** screens to real data through the T151 boundary, preserving the E10 Signal Interface exactly. **No production sample-data fallback** — sample data is now an explicit fixture.

**Drizzle adapters (`apps/web/lib/server/adapters/`, server-only, org-scoped):**

- `mappers.ts` — pure, unit-tested: `toCatalogProductDTO`, `toProductInspectorDTO`, `worstOf`, `computeHealthScore` (JSONB payload never leaves this layer).
- `catalog-adapter.ts` — `CatalogRepository`: keyset-paginated product list (title search + sort), batched open-issue aggregates, bounded `count`; product inspector + issues.
- `overview-adapter.ts` — `OverviewRepository`: bounded COUNT/GROUP BY aggregates (total/affected/critical/repairable via the remediation registry), top issue groups, integrations from `catalogs`.

**Runtime (`runtime.ts`):** `createDrizzleMembershipLoader` (workspaces the user can act in) + `getServerContext()` (resolves context from request cookies) + `services()` (wired Overview/Catalog services).

**Screens:** `app/page.tsx` (server, `force-dynamic`) and `app/catalog/{page.tsx (server), catalog-view.tsx (client), actions.ts (server action for inspector)}`. Unauthenticated → explicit sign-in state; errors → explicit `EmptyState` (`AppError.message` only). DTOs → existing E10 components (HealthScore/Metric/HealthSignal/IntegrationStatus, DataTable/Inspector/SourceComparison). Sample data moved to `lib/fixtures/demo-catalog.ts` (demo/test only).

## Build integration

- Added `@fixmyfeed/{domain,repairs}` + `drizzle-orm` to `apps/web`.
- **Fix:** boundary/adapter relative imports are extensionless (Turbopack doesn't map `.js`→`.ts`; `tsc` bundler mode does — the mismatch broke `next build`).

## Tests

`apps/web/tests/mappers.test.ts` (5, Vitest) + existing boundary/context (26 web total). Query behavior is verified end-to-end against real Postgres in **T159**. Full gate: 397 node tests, format, lint (0 errors), web `tsc --noEmit`, **`next build` green** (`/` + `/catalog` now dynamic/live).

## Notes

Reads are server-side. Long-running work returns `ExecutionRefDTO` (durable ids) in later tasks. E10 design unchanged; no new patterns introduced (the four approved patterns arrive in T154/T156/T157).
