# T093 — Completion Report

**Task:** T093 — Implement approval and four-eyes policy (Epic E09)
**Branch:** `task/T093-approval-four-eyes`. **State:** Not Started → In Review

## What was built

Governance for repair plans: a persisted plan/approval model, an explicit lifecycle, and deterministic four-eyes.

**Schema (`packages/database` — `repair-schema.ts`, migration 0014):**

- `repair_plans` — durable proposal: `status` (draft→pending_approval→approved/rejected→executing→completed/partially_completed/failed→rolled_back), `change_set` jsonb (T091 changes), `proposer_id`, `risk_level`, `baseline_fingerprints` jsonb, audit + version.
- `repair_approvals` — one decision per approver per plan (unique(plan, approver)), `decision` approved/rejected, `note`, append-only.

**Logic (`packages/repairs` — `approval.ts`, pure):**

- `REPAIR_PLAN_TRANSITIONS` + `canTransitionPlan` / `isTerminalPlanStatus`.
- `planRiskLevel` (max over changes).
- `evaluateApproval` — four-eyes (proposer never self-approves; high-risk needs two distinct approvers; any rejection blocks) → `ApprovalEvaluation`; `resolvePlanApprovalStatus`.
- Row builders `toRepairPlanRow` / `toRepairApprovalRow`.

## Files changed

Added `database/repair-schema.ts`, `database/drizzle/0014_*.sql` (+ meta/journal), `repairs/approval.ts`, `tests/repairs-approval.test.mjs`, this report. Edited `database/{schema,index}.ts`, `repairs/index.ts`, `tools/db-smoke.mjs` (0000–0014 + 2 tables), `tests/{auth,tenancy}.test.mjs`, `ci.yml`. No boundary change.

## Tests

`tests/repairs-approval.test.mjs` (5): lifecycle transitions/terminals, plan risk, four-eyes matrix (self-approval ignored / one approver / high-risk two / rejection blocks) + status resolution, row builders, schema + migration 0014. `auth`/`tenancy` schema-key updated; migration-apply covers the tables via db-smoke.

## Security & privacy

Deny-by-default: the plan cannot reach `approved` without enough independent approvals; the proposer is structurally excluded (four-eyes) — consent is never inferred. No secrets.

## Rollback / limitations

Revert the E09 PR; migration 0014 only adds tables. Policy is pure — the API/worker persists plans/approvals and enforces transitions. **Follow-up:** writeback executor (T094) runs an approved plan.

## Traceability

`WORKSTREAM_REGISTRY.md` T093 → In Review; `approval.ts` + `repair_plans`/`repair_approvals` ↔ approval / four-eyes specs.
