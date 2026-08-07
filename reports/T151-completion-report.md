# T151 — Completion Report

**Task:** T151 — Typed Application DTO + Service Boundary (Epic E11). **State:** In Review — the canonical contract between backend/domain packages and the Signal Interface. **No E10 screens wired.**

## What was built (`apps/web/lib/server/`)

- **`errors.ts`** — `AppError` + `APP_ERROR_CODE` (VALIDATION/UNAUTHENTICATED/FORBIDDEN/NOT_FOUND/CONFLICT/RATE_LIMITED/UPSTREAM/UNAVAILABLE/INTERNAL), `normalizeError` (unknown → opaque INTERNAL, no secrets/stack), `appError.*`, `toErrorEnvelope`.
- **`query.ts`** — reusable `PageRequest`/`Page<T>`, `SortRequest`, `FilterRequest`, `DateRange`, and `validatePageRequest`/`validateSort`/`validateFilter`/`validateDateRange`; `Provenance` (`authoritative`|`derived`|`estimated`) + `TaggedValue<T>` helpers.
- **`tenant-scope.ts`** — `resolveScope(context, requestedWorkspaceId?)` → `TenantScope {organizationId, workspaceId, userId, role}`. Org id comes from the matched membership; a requested workspace the user doesn't belong to → FORBIDDEN (**cross-tenant rejection**); no active workspace → NOT_FOUND; no context → UNAUTHENTICATED.
- **`dto.ts`** — stable UI DTOs for **Overview, Catalog, Product Inspector, Issues, Evidence, Repairs, Repair Exceptions, Monitoring, Reports, Integrations** + `ExecutionRefDTO` (durable async work). Estimated/derived values carry `TaggedValue`. No Drizzle/connector/queue/JSONB types.
- **`services.ts`** — service ports + factories for all ten surfaces. Each method resolves scope from `AppContextDTO`, validates query input, calls an **injected repository port** with the scope, maps records → DTOs (tagging provenance), and normalizes failures via `guard`.
- **`context.ts`** (extended) — `WorkspaceDTO`/`MembershipRecord` now carry `organizationId` for server-side scoping.
- **`boundary.ts`** — single import surface for the whole contract.
- Demo fixtures remain explicit (`lib/fixtures/`); **no production fallback** to them.

## Tests (`apps/web/tests/boundary.test.ts`, Vitest — 14, total web 21)

Cross-tenant rejection, unauthenticated, missing workspace (NOT_FOUND), empty data, derived/estimated provenance tags, pagination + filter validation, error normalization (opaque INTERNAL, secrets not leaked), and NOT_FOUND mapping — all via injected fake repositories (no DB).

## Verification

397 node tests + 21 web Vitest + root `tsc -b` + web `tsc --noEmit` + **`next build` green**. Format + lint (0 errors).

## Notes

Concrete Drizzle repository adapters (implementing these ports, scoped by `organizationId`) + async execution refs land in T152–T158; live wiring is E2E-verified in T159. Reads are server-side; long-running work returns `ExecutionRefDTO` (durable ids), never held requests.
