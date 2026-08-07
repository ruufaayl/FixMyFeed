# T091 — Completion Report

**Task:** T091 — Implement repair option selection and plan generation (Epic E09)
**Branch:** `task/T090-T097-repair-engine`. **State:** Not Started → In Review

## What was built
`packages/repairs/src/plan.ts` — turns scored diagnostic issues into a concrete `RepairPlan`.
- `generateRepairPlan({issues, products, registry?, includeManual?})` — per issue, looks up the T090 remediation (**deny-by-default: no remediation → skipped**), computes the proposed field change via a per-code strategy: `automatic` http→https rewrites (real value), `assisted` title truncation / alt-text suggestion, and `manual` codes marked `requiresInput`.
- `RepairChange` (issueCode, product/variant, field, safetyClass, riskLevel, currentValue, proposedValue, requiresInput) + summary counts.
- `selectAutoApplicableChanges(plan)` — the `automatic` + non-high + computed subset eligible for writeback.

## Files changed
Added `repairs/plan.ts` + `tests/repairs-plan.test.mjs` + this report; wired `repairs/index.ts` + `ci.yml`. No schema/migration/boundary change.

## Tests
`tests/repairs-plan.test.mjs` (5): automatic https upgrades (link + image via evidence url), assisted truncation/alt, manual requiresInput + unknown-code skip, includeManual=false drop, auto-applicable selection.

## Security & privacy
Pure; no secrets. Proposals are deterministic rewrites of existing catalog values — no fabricated content for manual/high-risk fields (those require input).

## Rollback / limitations
Revert the E09 PR or remove `plan.ts`. Proposal strategies cover the deterministic/assisted codes; others are recorded as needing input. **Follow-up:** change-set preview + conflict detection (T092), approval (T093).

## Traceability
`WORKSTREAM_REGISTRY.md` T091 → In Review; `plan.ts` ↔ repair-option-selection / plan-generation specs.
