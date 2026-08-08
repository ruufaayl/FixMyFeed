# T154 — Completion Report

**Task:** T154 — Repair planning, assisted inputs, and conflict resolution (Epic E11). **State:** In Review.

## What was built

Wired **`/repairs`** to real repair plans through the boundary AND added the first **two of the four approved new E10 patterns**, preserving the Signal Interface.

**New design-system patterns (`packages/ui`, Vitest-tested):**

- **`AssistedChange`** — collects/edits a human value for a change the engine can't compute (assisted/manual); never auto-applies (value proposed only on submit).
- **`ConflictResolution`** — surfaces a change conflicting with the live catalog (concurrent_edit / product_changed / missing_product) with explicit "apply proposed / keep live / skip" choices; disabled for missing products.

**Boundary + adapter:**

- `RepairsRepository`/`RepairsService` extended with `getLatestPlan` + `resolveChange` (assisted value / conflict resolution mutation).
- `adapters/repairs-mappers.ts` (pure/tested: `toRepairChangeDTO`, `toPreviewEntryDTO`, `requiredApprovalsFor`, `isDisplayableStatus`) + `adapters/repairs-adapter.ts` (loads plan, **recomputes the change-set preview against the live catalog via the domain `buildChangeSetPreview` — so `needs_input`/`conflict` are real**, maps approvals + latest execution, `resolveChange` updates `change_set` with optimistic version).

**Screen:** `app/repairs/{page.tsx (server, force-dynamic), repairs-view.tsx (client), actions.ts (resolveRepairChange server action + revalidate)}` → ready changes as `RepairDiff`, `needs_input` as `AssistedChange`, `conflict` as `ConflictResolution`, plus a read-only `ApprovalPanel` (approval lands in T155). Empty/unauth/error render explicit states; no sample fallback.

## Tests

`packages/ui/tests/repair-planning.test.tsx` (6) + `apps/web/tests/repairs-mappers.test.ts` (4). Totals: 45 ui Vitest, 34 web Vitest, 397 node. Full gate: format, lint (0 errors), web `tsc --noEmit`, **`next build` green** (`/repairs` dynamic). Live queries/mutations E2E-verified in T159.

## Notes

Reads server-side; the resolution mutation persists via optimistic-concurrency update. E10 design otherwise unchanged. Approval + writeback execution = T155; verification/partial-success exceptions/rollback = T156; rule builder = T157.
