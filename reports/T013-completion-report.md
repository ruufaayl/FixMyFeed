# T013 — Completion Report

**Task:** T013 — Implement RBAC and permission evaluation (Epic E01)
**Branch:** `task/T013-implement-rbac-and-permission-evaluation` → PR into `develop`
**Depends on:** T011 (Verified/merged, identity). Coordinates with T012 (organizations/memberships, Codex — in progress).
**State transition:** `Not Started` → `In Review`

## Specifications read

- `/AGENTS.md`, `/CLAUDE.md`, `/IMPLEMENTATION_BASELINE.md` — contract, rules, frozen stack.
- `/implementation/epics/E01-identity-tenancy-and-security.md`, `/implementation/tasks/T013-*.md` — epic/task authority.
- **`/docs/06-security-privacy-and-compliance/authorization-matrix.md`** — the Minimum Permission Matrix and role principles (primary source; the model mirrors it exactly).
- `/docs/06-security-privacy-and-compliance/rbac-model.md`, `/docs/04-system-architecture/authorization-architecture.md` — deny-by-default authorization.
- Reviewed merged `packages/auth` (T011) and `packages/database` (T010) to place T013 correctly.

## Design decision: RBAC lives in `packages/domain` (pure), and takes roles as input

Permission evaluation is deterministic business logic with no framework, database, HTTP, or provider dependency, and multiple layers (API, web, worker, connectors) must perform authorization checks. Placing it in the **domain** layer keeps it dependency-free and universally importable, rather than forcing consumers to pull `auth`'s better-auth/database dependencies.

Critically, `evaluatePermission` **takes the principal's already-resolved roles as input** — it does **not** query membership tables. Membership/role _storage and resolution_ are owned by **T012 (organizations and memberships, in progress by Codex)**. This cleanly decouples the two tasks: T013 owns the permission _model and evaluation_; T012 owns _who has which role_. The only shared vocabulary is the `Role` enum, defined here from `authorization-matrix.md`. **Consequence:** T013 adds no runtime dependency, makes no `pnpm-lock.yaml` or root `package.json` change, and does not touch `packages/auth` or `packages/database` — so it has essentially no merge-conflict surface with Codex's T012.

## Files changed

- **Added:** `packages/domain/src/rbac/roles.ts` — closed catalog: 8 roles, 22 permission verbs, graded-rank hierarchy, and the `PERMISSION_MATRIX` (1:1 with the doc).
- **Added:** `packages/domain/src/rbac/evaluate.ts` — `evaluatePermission()` / `can()`, deny-by-default, with stable decision codes.
- **Modified:** `packages/domain/src/index.ts` — exports the RBAC API (kept `workspaceName`/`workspaceKind`).
- **Added:** `tests/rbac.test.mjs` — 11 tests.
- **Modified:** `.github/workflows/ci.yml` — appended `tests/rbac.test.mjs` to the CI test list (the established per-file pattern; T002 will later consolidate to `pnpm run test`).
- **Traceability:** `implementation/WORKSTREAM_REGISTRY.md` T013 → `In Review`.

## Domain / schema / API / event changes

- **No** database schema, migration, endpoint, event, or environment variable. No new table (role/membership tables are T012's).
- Public API (additive, versionable — NFR-004): `evaluatePermission`, `can`, `PERMISSION_DECISION_CODE`, `ROLES`, `PERMISSIONS`, `PERMISSION_MATRIX`, `ROLE_RANK`, `isRole`, `isPermission`, and their types.

## Model (mirrors authorization-matrix.md)

- **Roles:** graded track `viewer < operator < manager < approver < administrator` (ranks 1–5) plus specialized `security_administrator`, `billing_administrator`, and `platform_operator` (no rank — explicit grants only).
- **22 permission verbs** as `resource:action` (e.g. `store:manage`, `repair:approve-high-risk`, `platform-admin:operate`).
- **Deny by default**, tenant scope required on every check.
- **Conditions:** `writeback:execute` requires an approved plan; `rollback:execute` requires recent re-authentication; `repair:approve-high-risk` enforces proposer/approver separation _when policy requires it_.
- **Separation of duties**, faithfully encoded: security administrators inspect security/audit but not catalog/repairs; billing administrators manage billing but cannot read product content; organization administrators do **not** receive platform access; the platform operator is not an organization role.

## Tests and exact results

Command: `node --test tests/rbac.test.mjs`

```
# tests 11
# pass 11
# fail 0
```

Covers: closed catalog (22 permissions / 8 roles / full matrix coverage); deny-by-default (unknown permission, missing tenant scope, empty roles grant nothing); graded-hierarchy inheritance; the approved-plan, recent-auth, and proposer-separation conditions (including that separation is enforced only when policy requires it); all four separation-of-duties principles; and additive multi-role grants.

Also run: `tsc -b` (exit 0); scoped `eslint`/`prettier` on the new files (clean); the **boundary suite still passes including the domain-purity invariant** (RBAC added no dependency to `domain`); and `check:traceability` (100/100 rows, 43/43 vars — consistent). Combined `node --test` across boundaries + rbac + config + traceability: **42/42**.

## Security and privacy analysis

- Deny-by-default and explicit tenant-scope requirement on every evaluation; nothing is inferred (AGENTS.md; authorization-matrix).
- No secrets, credentials, or personal data. Decision reasons name roles/permissions only — no secret material.
- High-risk actions (high-risk repair approval, writeback, rollback) remain gated behind role + condition; they are not grantable by role alone.
- Pure, side-effect-free evaluation — no logging of sensitive data, no external calls.

## Accessibility analysis

Not applicable — no user interface.

## Performance and cost analysis

- **Cost:** $0. No dependency, service, or API added.
- **Performance:** each evaluation is O(roles) with a single matrix lookup; negligible. Suitable for per-request checks well within the p95 budget.

## Environment variables added

None.

## External credentials or approvals still required

None.

## Rollback procedure

Revert the PR merge commit on `develop`, or delete `packages/domain/src/rbac/`, remove the RBAC exports from `packages/domain/src/index.ts`, delete `tests/rbac.test.mjs`, drop it from `.github/workflows/ci.yml`, and revert the WORKSTREAM_REGISTRY T013 row to `Not Started`. No data, schema, or runtime wiring — non-destructive.

## Known limitations / coordination notes

1. **Role assignment/persistence is T012's (Codex).** T013 evaluates a given role set; wiring `evaluatePermission` to a real membership lookup happens where the two meet. The shared contract is the `Role` enum in `roles.ts` — **Codex's T012 membership schema should use these exact role identifiers** (`viewer`, `operator`, `manager`, `approver`, `administrator`, `security_administrator`, `billing_administrator`, `platform_operator`). Flagging so the two sides align; if T012 has already chosen different identifiers, we should reconcile before both merge.
2. **`ci.yml` test-list edit** is the one file that both my recent tasks and Codex's tasks touch; it is a single appended filename and trivially mergeable, but worth noting for merge ordering.
3. **Support-access time-boxed overlays (T017)** and any policy that _decides_ when `requireProposerSeparation` is true are separate tasks; T013 exposes the hook (`context.requireProposerSeparation`) but does not own the policy source.

## Traceability entries

- `implementation/WORKSTREAM_REGISTRY.md`: T013 → `In Review`.
- `packages/domain/src/rbac/roles.ts` traces 1:1 to `authorization-matrix.md`'s Minimum Permission Matrix.
- `tests/rbac.test.mjs` provides automated allow/deny evidence for every matrix class and role principle.
