# T153 — Completion Report

**Task:** T153 — Issues + evidence live data (Epic E11). **State:** In Review.

## What was built

Wired the **Issue center (`/issues`)** and its evidence panel to real data through the T151 boundary, preserving the E10 Signal Interface. **No production sample-data fallback** — sample moved to an explicit fixture.

**Pure mappers (`adapters/issue-mappers.ts`, unit-tested):** `severityFromRank`, `humanizeCode`, `toEvidenceEntries`, `explainCode` (code → plain-language explanation + why-it-matters, generic fallback).

**Adapter (`adapters/issues-adapter.ts`, server-only, org-scoped):** `IssuesRepository`:

- `listGroups` — groups open `diagnostic_issues` by root-cause code (bounded GROUP BY: distinct-affected count + worst-severity rank), tags `repairable` via the remediation registry, applies severity/view filters.
- `getEvidence` — assembles an `EvidenceDTO` from a few representative affected issues + code explanation + recommended repair (registry). Returns null when none.

**Screen:** `app/issues/{page.tsx (server, force-dynamic), issues-view.tsx (client), actions.ts (server action loadEvidence)}` → DTOs → existing E10 components (FilterBar + saved views + HealthSignal + Inspector + EvidencePanel). Small group set filtered client-side. Unauthenticated → sign-in state; errors → explicit `EmptyState`. Sample → `lib/fixtures/demo-issues.ts`. `services()` now includes `issues`.

## Tests

`apps/web/tests/issue-mappers.test.ts` (4, Vitest); 30 web total. Query behavior E2E-verified in T159. Full gate: 397 node tests, format, lint (0 errors), web `tsc --noEmit`, **`next build` green** (`/issues` now dynamic/live).

## Notes

Reads server-side. E10 design unchanged; no new patterns introduced (the four approved patterns arrive in T154/T156/T157).
