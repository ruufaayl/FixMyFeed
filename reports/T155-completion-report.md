# T155 — Completion Report

**Task:** T155 — Approval + asynchronous writeback execution (Epic E11). **State:** In Review.

## What was built

Wired T093 (approval/four-eyes) and T094 (writeback executor) through the T151 boundary. Approval and execution are **separate explicit actions — approval never triggers writeback**. E10/T154 Signal Interface preserved.

**Application contract (`apps/web/lib/server/repair-ops.ts`, injected ports, unit-tested):**

- `RepairGovernanceService.approve/reject` — RBAC via domain `can()` (`repair:approve-low/high-risk`), **four-eyes** (proposer excluded; high-risk needs 2 distinct approvers via T093 `evaluateApproval`), records decision, transitions status, audits.
- `assertExecutable` (pure) — blocks unless `approved`, no `needs_input`, no `conflict`, connector capable.
- `RepairExecutionService.requestExecution` — resolves actor/tenant/permission (`writeback:execute` + approved_plan), validates readiness, **idempotently** creates a queued `repair_execution`, locks the plan (→executing), enqueues a job carrying **only the execution id**, returns `ExecutionRefDTO` immediately; audits. `getExecution` for status.
- `runRepairExecution` (worker orchestration) — re-reads authoritative state, runs T094 `executeWriteback` through a concrete `WritebackPort`, persists item results + counters/status; audits start/complete/fail.

**Concrete adapters (`adapters/repair-ops-adapters.ts`, org-scoped):** Drizzle governance + execution store (readiness via domain `buildChangeSetPreview`; connector capability from catalog status) + worker repository; **durable enqueue via the transactional outbox** (T022 — no in-request pg-boss; job = execution id only); immutable hash-chained **audit** (`repair` category). `WritebackPort` default **refuses to write** (`writeback_transport_not_configured`) — never a silent success; the real connector transport is injected in prod/T159.

**Schema:** migration **0017** adds `repair_executions.idempotency_key` + unique `(organization_id, idempotency_key)` → duplicate requests dedupe. Plan **locked from edits** once past planning (`resolveChange` rejects unless draft/pending_approval).

**UI (`/repairs`):** actionable `ApprovalPanel` (Approve/Reject when open; Execute when approved + no unresolved input/conflict), live `Progress` with **"changes applied"** wording (never "verified" — that's T156), real approvals `n/required`, per-page idempotency key so double-submit never double-writes.

**RBAC:** uses existing domain verbs `repair:approve-low-risk` / `repair:approve-high-risk` (proposer-separation) / `writeback:execute` (approved_plan) via `can()`.

## Tests

`apps/web/tests/repair-ops.test.ts` (13, Vitest): approval policy, four-eyes/self-approval, rejection, authorization, unauthenticated, unresolved-input/conflict/connector-capability blocking, idempotency (single enqueue/lock), worker success + partial + port-failure. Totals: 47 web Vitest, 45 ui Vitest, 397 node. Full gate: format, lint (0 errors), web `tsc --noEmit`, **`next build` green** (`/repairs` dynamic), migration-apply 0000–0017.

## Runtime notes (verified E2E in T159)

The outbox consumer that runs `runRepairExecution` and the real connector `WritebackPort` transport are wired + exercised against real Postgres/test services in T159. Until then execution rows queue durably and the default port reports a non-write (no false "applied").

## Execution / queue contract (for T156)

- Request → `repair_executions` row (`status=queued`, `idempotency_key`) + outbox event `repair.execute` `{executionId}` + plan locked (`executing`).
- Worker: `queued → running → completed | partially_completed | failed`; item rows in `repair_execution_items` (`succeeded`/`failed`); counters on the execution; plan status mirrors terminal outcome.
- Idempotency: `(organization_id, idempotency_key)` unique; duplicates return the same `ExecutionRefDTO`, no re-enqueue.
- "applied" ≠ "verified": T155 reports applied; verification/exceptions/rollback are T156/T095.
