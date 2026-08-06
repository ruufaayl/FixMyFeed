# T012 Organizations, Workspaces, and Memberships Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the documented PostgreSQL schema and tenant-aware repository for organizations, workspaces, and memberships, including atomic organization bootstrap and canonical RBAC role storage.

**Architecture:** `@fixmyfeed/database` owns the Drizzle tables and all SQL. A single repository validates inputs, requires explicit tenant context, performs optimistic mutations, and emits sanitized mutation events; organization bootstrap is the only pre-tenant operation and writes the organization plus initial administrator membership transactionally. T013 remains the source of truth for role identifiers, and T016 remains responsible for immutable audit persistence.

**Tech Stack:** TypeScript 5.9, Node.js 24, pnpm 10.32.1, PostgreSQL 17-compatible SQL, Drizzle ORM 0.45, Drizzle Kit 0.31, Node test runner.

## Global Constraints

- Use `develop` as the integration branch and work only on `codex/T012-organizations-workspaces-memberships`.
- Import roles from `@fixmyfeed/domain`; do not modify `packages/domain/**` or duplicate T013 permission evaluation.
- Every tenant-owned query includes `organization_id`; never infer tenant ownership from a resource identifier.
- Use UUIDv7 identifiers, UTC `timestamptz`, restrictive foreign keys, tenant-first indexes, and integer optimistic versions starting at 1.
- Do not add HTTP routes, UI, invitations, immutable audit storage, environment variables, paid APIs, external side effects, or unrelated refactors.
- Write each behavioral test first, run it to observe the expected failure, then add the minimum implementation and rerun it.
- Update only the T012 registry row and T012 completion evidence.

---

### Task 1: Canonical tenancy schema

**Files:**

- Create: `packages/database/src/tenancy-schema.ts`
- Modify: `packages/database/src/schema.ts`
- Modify: `packages/database/src/index.ts`
- Modify: `packages/database/package.json`
- Modify: `pnpm-lock.yaml`
- Test: `tests/tenancy.test.mjs`

**Interfaces:**

- Consumes: `ROLES` and `Role` from `@fixmyfeed/domain`; reusable column helpers and `users` from `@fixmyfeed/database`.
- Produces: `organizations`, `workspaces`, `memberships`, `ORGANIZATION_STATUS`, `WORKSPACE_STATUS`, `MEMBERSHIP_STATUS`, and inferred row/insert types.

- [ ] **Step 1: Write failing schema contract tests**

Add tests that import the three tables from `packages/database/dist/index.js` and assert the table names, exact role values, required tenant columns, UUID defaults, lifecycle values, version defaults, restrictive foreign keys, composite tenant foreign key, partial membership uniqueness, and tenant-first list indexes. The role assertion must be:

```js
assert.deepEqual(MEMBERSHIP_ROLE, [
  "viewer",
  "operator",
  "manager",
  "approver",
  "administrator",
  "security_administrator",
  "billing_administrator",
  "platform_operator",
]);
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `node --test tests/tenancy.test.mjs`

Expected: FAIL because `MEMBERSHIP_ROLE` and the tenancy table exports do not exist.

- [ ] **Step 3: Add the minimal schema**

Define these lifecycle constants and table shapes:

```ts
export const ORGANIZATION_STATUS = ["active", "archived"] as const;
export const WORKSPACE_STATUS = ["active", "archived"] as const;
export const MEMBERSHIP_STATUS = ["active", "suspended", "revoked"] as const;
export const MEMBERSHIP_ROLE = ROLES;
```

`organizations` contains `id`, `name`, `slug`, `status`, `idempotencyKey`, `createdByUserId`, `createdAt`, `updatedAt`, `version`, and `deletedAt`. `workspaces` adds `organizationId`, `idempotencyKey`, and the same mutable identity/lifecycle fields. `memberships` contains `id`, `organizationId`, nullable `workspaceId`, `userId`, `role`, `status`, `idempotencyKey`, `createdByUserId`, timestamps, version, and `deletedAt`.

Add check constraints for trimmed name lengths, canonical slugs, lifecycle values, roles, and positive versions. Add restrictive foreign keys and tenant-safe uniqueness/indexes described in the design. Aggregate and export all three tables through the existing schema and package entry point. Declare `@fixmyfeed/domain: workspace:*` in the database package.

- [ ] **Step 4: Install the workspace link and verify GREEN**

Run: `pnpm install --lockfile-only`

Run: `pnpm run typecheck && node --test tests/tenancy.test.mjs`

Expected: Typecheck exits 0 and schema contract tests pass.

- [ ] **Step 5: Commit the schema slice**

```powershell
git add packages/database/src/tenancy-schema.ts packages/database/src/schema.ts packages/database/src/index.ts packages/database/package.json pnpm-lock.yaml tests/tenancy.test.mjs
git commit -m "feat(T012): add tenancy schema"
```

### Task 2: Validation, stable errors, and event contract

**Files:**

- Create: `packages/database/src/tenancy-errors.ts`
- Create: `packages/database/src/tenancy-repository.ts`
- Modify: `packages/database/src/index.ts`
- Test: `tests/tenancy.test.mjs`

**Interfaces:**

- Produces: `TENANCY_ERROR_CODE`, `TenancyError`, `TenantContext`, `TenancyEvent`, `TenancyRepositoryOptions`, input types, and `createTenancyRepository`.
- Consumes: schema row types, `DatabaseClient`, UUIDv7 validation, and canonical `Role`.

The public contract is fixed as follows so later tasks use the same names and types:

```ts
export interface TenantContext {
  readonly organizationId: string;
  readonly actorUserId: string;
  readonly correlationId: string;
}

export interface BootstrapOrganizationInput {
  readonly name: string;
  readonly slug: string;
  readonly actorUserId: string;
  readonly idempotencyKey: string;
  readonly correlationId: string;
}

export interface TenancyListInput {
  readonly limit: number;
  readonly cursor?: { readonly createdAt: Date; readonly id: string };
}

export type Organization = typeof organizations.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Membership = typeof memberships.$inferSelect;

export interface OrganizationBootstrapResult {
  readonly organization: Organization;
  readonly membership: Membership;
}

export interface CreateWorkspaceInput {
  readonly name: string;
  readonly slug: string;
  readonly idempotencyKey: string;
}

export interface UpdateWorkspaceInput {
  readonly workspaceId: string;
  readonly name?: string;
  readonly slug?: string;
  readonly expectedVersion: number;
}

export interface CreateMembershipInput {
  readonly userId: string;
  readonly workspaceId?: string;
  readonly role: Role;
  readonly idempotencyKey: string;
}

export interface UpdateMembershipInput {
  readonly membershipId: string;
  readonly role?: Role;
  readonly status?: "active" | "suspended";
  readonly expectedVersion: number;
}

export interface TenancyEvent {
  readonly type: string;
  readonly outcome: "succeeded" | "failed";
  readonly actorUserId: string;
  readonly organizationId?: string;
  readonly resourceType: "organization" | "workspace" | "membership";
  readonly resourceId?: string;
  readonly version?: number;
  readonly correlationId: string;
  readonly errorCode?: TenancyErrorCode;
}

export interface TenancyRepositoryOptions {
  readonly onEvent?: (event: TenancyEvent) => void;
}

export interface TenancyRepository {
  bootstrapOrganization(input: BootstrapOrganizationInput): Promise<OrganizationBootstrapResult>;
  getOrganization(context: TenantContext): Promise<Organization>;
  updateOrganization(
    context: TenantContext,
    input: { readonly name?: string; readonly slug?: string; readonly expectedVersion: number },
  ): Promise<Organization>;
  archiveOrganization(
    context: TenantContext,
    input: { readonly expectedVersion: number },
  ): Promise<Organization>;
  createWorkspace(context: TenantContext, input: CreateWorkspaceInput): Promise<Workspace>;
  getWorkspace(context: TenantContext, workspaceId: string): Promise<Workspace>;
  listWorkspaces(context: TenantContext, input: TenancyListInput): Promise<readonly Workspace[]>;
  updateWorkspace(context: TenantContext, input: UpdateWorkspaceInput): Promise<Workspace>;
  archiveWorkspace(
    context: TenantContext,
    input: { readonly workspaceId: string; readonly expectedVersion: number },
  ): Promise<Workspace>;
  createMembership(context: TenantContext, input: CreateMembershipInput): Promise<Membership>;
  getMembership(context: TenantContext, membershipId: string): Promise<Membership>;
  listMemberships(context: TenantContext, input: TenancyListInput): Promise<readonly Membership[]>;
  updateMembership(context: TenantContext, input: UpdateMembershipInput): Promise<Membership>;
  revokeMembership(
    context: TenantContext,
    input: { readonly membershipId: string; readonly expectedVersion: number },
  ): Promise<Membership>;
  resolveActiveRoles(
    context: TenantContext,
    input: { readonly userId: string; readonly workspaceId?: string },
  ): Promise<readonly Role[]>;
}

export function createTenancyRepository(
  client: Pick<DatabaseClient, "db">,
  options?: TenancyRepositoryOptions,
): TenancyRepository;
```

- [ ] **Step 1: Write failing validation and redaction tests**

Test the wished-for API with malformed UUIDs, blank names, noncanonical slugs, invalid versions, blank correlation/idempotency keys, and unknown roles. Assert errors expose only stable codes:

```js
assert.throws(
  () => validateTenantContext({ organizationId: "wrong", actorUserId: "wrong", correlationId: "" }),
  (error) => error instanceof TenancyError && error.code === TENANCY_ERROR_CODE.INVALID_INPUT,
);
```

Also assert JSON serialization of failures contains no supplied database error message, email, credential, or unrestricted input.

- [ ] **Step 2: Run validation tests and verify RED**

Run: `node --test tests/tenancy.test.mjs --test-name-pattern="validation|redact|event"`

Expected: FAIL because the error, validation, and repository exports do not exist.

- [ ] **Step 3: Implement minimal contracts and validation**

Define exact stable codes:

```ts
export const TENANCY_ERROR_CODE = {
  INVALID_INPUT: "TENANCY_INVALID_INPUT",
  TENANT_SCOPE_REQUIRED: "TENANCY_TENANT_SCOPE_REQUIRED",
  NOT_FOUND: "TENANCY_NOT_FOUND",
  CONFLICT: "TENANCY_CONFLICT",
  VERSION_CONFLICT: "TENANCY_VERSION_CONFLICT",
  PERSISTENCE_FAILED: "TENANCY_PERSISTENCE_FAILED",
} as const;
```

Normalize names by trimming; validate rather than invent slugs; accept only UUIDs, canonical roles/statuses, positive expected versions, nonempty bounded idempotency/correlation identifiers, and list limits from 1 through 100. Define a storage-neutral `TenancyEvent` containing only event type, outcome, actor/resource/tenant identifiers, version, correlation identifier, and stable error code.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `pnpm run typecheck && node --test tests/tenancy.test.mjs --test-name-pattern="validation|redact|event"`

Expected: All selected tests pass.

- [ ] **Step 5: Commit the contract slice**

```powershell
git add packages/database/src/tenancy-errors.ts packages/database/src/tenancy-repository.ts packages/database/src/index.ts tests/tenancy.test.mjs
git commit -m "feat(T012): define tenancy repository contracts"
```

### Task 3: Atomic organization bootstrap and idempotency

**Files:**

- Modify: `packages/database/src/tenancy-repository.ts`
- Test: `tests/tenancy.test.mjs`

**Interfaces:**

- Produces: `bootstrapOrganization(input: BootstrapOrganizationInput): Promise<OrganizationBootstrapResult>`.
- Consumes: a database transaction capable of inserting and selecting organizations and memberships.

- [ ] **Step 1: Write failing bootstrap tests**

Use a deterministic fake database transaction adapter to verify:

1. the organization and active `administrator` membership are committed together;
2. a membership insert failure leaves neither row committed;
3. retrying the same actor/idempotency key returns the original result without a duplicate insert;
4. the initial membership is organization-wide (`workspaceId === null`);
5. success and failure events are sanitized, and an observer exception cannot change the durable result.

- [ ] **Step 2: Run bootstrap tests and verify RED**

Run: `node --test tests/tenancy.test.mjs --test-name-pattern="bootstrap|idempotent|observer"`

Expected: FAIL because `bootstrapOrganization` is not implemented.

- [ ] **Step 3: Implement transactional bootstrap**

Implement the method so it validates before opening a transaction, checks the `(created_by_user_id, idempotency_key)` identity inside the transaction, inserts the organization and initial membership, and returns both durable rows. Translate unique violations to `TENANCY_CONFLICT`, all other unknown persistence errors to `TENANCY_PERSISTENCE_FAILED`, and never include driver details in the public error.

- [ ] **Step 4: Run focused and full tenancy tests**

Run: `pnpm run typecheck && node --test tests/tenancy.test.mjs`

Expected: All tenancy tests pass.

- [ ] **Step 5: Commit the bootstrap slice**

```powershell
git add packages/database/src/tenancy-repository.ts tests/tenancy.test.mjs
git commit -m "feat(T012): add atomic organization bootstrap"
```

### Task 4: Tenant-scoped workspace and membership operations

**Files:**

- Modify: `packages/database/src/tenancy-repository.ts`
- Test: `tests/tenancy.test.mjs`

**Interfaces:**

- Produces: organization lookup/update/archive; workspace create/get/list/update/archive; membership create/get/list/update/revoke; `resolveActiveRoles`.
- Consumes: validated `TenantContext`, expected versions, keyset cursors, and canonical role values.

- [ ] **Step 1: Write failing tenant-isolation tests**

For every repository method, assert the persistence call receives the context's `organizationId`. Add explicit cases proving a resource from organization A cannot be read, updated, archived, or used as a membership workspace from organization B. Verify missing scope fails before persistence is called.

- [ ] **Step 2: Run isolation tests and verify RED**

Run: `node --test tests/tenancy.test.mjs --test-name-pattern="tenant|cross-tenant|scope"`

Expected: FAIL because the scoped methods are missing.

- [ ] **Step 3: Implement minimal scoped reads and writes**

Every SQL predicate includes organization scope. Update/archive/revoke predicates include the expected version and increment it atomically. A zero-row mutation performs a scoped existence check to distinguish `TENANCY_NOT_FOUND` from `TENANCY_VERSION_CONFLICT`. Workspace membership creation verifies the `(organization_id, workspace_id)` pair before insert.

- [ ] **Step 4: Write failing pagination and role-resolution tests**

Assert list limits are bounded to 100; cursors order by `(created_at DESC, id DESC)`; organization-wide roles are combined with the requested workspace's roles; suspended/revoked/deleted memberships are excluded; and roles from other workspaces or organizations never appear.

- [ ] **Step 5: Run the new tests and verify RED**

Run: `node --test tests/tenancy.test.mjs --test-name-pattern="pagination|roles|version|lifecycle"`

Expected: FAIL until list, mutation, and role-resolution behavior is complete.

- [ ] **Step 6: Implement pagination, lifecycle, and role resolution**

Use a keyset cursor containing the ISO timestamp and UUID. Return only the canonical role type. Reject transitions out of archived/revoked terminal states and emit sanitized mutation events only after successful persistence.

- [ ] **Step 7: Run focused and full checks**

Run: `pnpm run typecheck && node --test tests/tenancy.test.mjs tests/rbac.test.mjs`

Expected: All tenancy and RBAC tests pass.

- [ ] **Step 8: Commit the repository slice**

```powershell
git add packages/database/src/tenancy-repository.ts tests/tenancy.test.mjs
git commit -m "feat(T012): enforce tenant-aware tenancy operations"
```

### Task 5: Migration and schema authority

**Files:**

- Create: `packages/database/drizzle/0001_t012_organizations_workspaces_memberships.sql`
- Create: `packages/database/drizzle/meta/0001_snapshot.json`
- Modify: `packages/database/drizzle/meta/_journal.json`
- Modify: `tests/database.test.mjs`
- Modify: `tests/tenancy.test.mjs`
- Modify: `packages/database/README.md`
- Modify: `feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/docs/07-data-architecture/PHYSICAL_SCHEMA_REGISTRY.md`
- Modify: `feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/docs/07-data-architecture/tables/identity-and-tenancy/organizations.md`
- Modify: `feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/docs/07-data-architecture/tables/identity-and-tenancy/workspaces.md`
- Modify: `feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/docs/07-data-architecture/tables/identity-and-tenancy/memberships.md`

**Interfaces:**

- Produces: reviewed additive migration `0001`, updated physical schema counts/specifications, and reverse-order rollback instructions.

- [ ] **Step 1: Write failing migration/documentation tests**

Assert the journal tags are exactly `0000_t011_better_auth` and `0001_t012_organizations_workspaces_memberships`; the SQL creates only the three approved tables; foreign keys are restrictive; no `DROP` appears in the forward migration; all tenant indexes begin with `organization_id`; role checks contain every canonical identifier; physical registry counts equal the concrete documented columns; and rollback documentation specifies memberships → workspaces → organizations.

- [ ] **Step 2: Run migration tests and verify RED**

Run: `node --test tests/database.test.mjs tests/tenancy.test.mjs --test-name-pattern="migration|registry|rollback"`

Expected: FAIL because migration `0001` and concrete schema documentation do not exist.

- [ ] **Step 3: Generate and inspect the migration**

Run: `pnpm --filter @fixmyfeed/database db:generate -- --name=t012_organizations_workspaces_memberships`

Inspect the generated SQL and snapshot against the schema tests. Do not hand-edit the snapshot. If Drizzle emits an unsafe or undocumented construct, correct the TypeScript schema and regenerate before proceeding.

- [ ] **Step 4: Make authority documents concrete**

Replace generic conditional columns in the three table specs with the exact implemented columns, constraints, indexes, retention, migration, and rollback behavior. Update only the corresponding column counts in `PHYSICAL_SCHEMA_REGISTRY.md`. Document the repository usage and tenant-context requirement in `packages/database/README.md`.

- [ ] **Step 5: Verify migration and docs GREEN**

Run: `pnpm --filter @fixmyfeed/database db:check`

Run: `node --test tests/database.test.mjs tests/tenancy.test.mjs`

Expected: Drizzle check and both test files pass.

- [ ] **Step 6: Commit migration and authority evidence**

```powershell
git add packages/database/drizzle packages/database/README.md tests/database.test.mjs tests/tenancy.test.mjs feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/docs/07-data-architecture
git commit -m "docs(T012): add tenancy migration authority"
```

### Task 6: CI, traceability, completion evidence, and full verification

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/implementation/WORKSTREAM_REGISTRY.md`
- Create: `reports/T012-completion-report.md`
- Test: all repository test files.

**Interfaces:**

- Produces: reproducible T012 quality gate and truthful completion report.

- [ ] **Step 1: Wire the tenancy test into local and CI gates**

Add `test:tenancy` to the root scripts, include `tests/tenancy.test.mjs` in the root `test` command, and append the same file to CI's explicit Node test command and reproducibility comment. Do not remove or weaken any existing test.

- [ ] **Step 2: Run formatting and repair only T012 files**

Run: `pnpm run format`

Review `git diff --name-only`; revert or exclude any formatter change outside the declared T012 file list without discarding user work.

- [ ] **Step 3: Run every required quality gate**

Run each command separately and retain exact results:

```powershell
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test
node --test tests/config.test.mjs tests/database.test.mjs tests/rbac.test.mjs tests/tenancy.test.mjs tests/traceability.test.mjs
pnpm --filter @fixmyfeed/database db:check
pnpm run check:traceability
git diff --check
```

Expected: every command exits 0 with zero failing tests.

- [ ] **Step 4: Write the completion report**

Record the task/commit, every specification read, changed files, exact schema/domain/API/event changes, exact commands and test counts, tenant-isolation analysis, privacy/accessibility/performance/cost evidence, no new environment variables or external approvals, rollback procedure, known limitations, and traceability evidence in `reports/T012-completion-report.md`.

- [ ] **Step 5: Update only the T012 registry row**

Change T012 from `Not Started` to `In Review`. Do not alter any other task row.

- [ ] **Step 6: Re-run final verification after documentation changes**

Run: `pnpm run check && node --test tests/config.test.mjs tests/database.test.mjs tests/rbac.test.mjs tests/tenancy.test.mjs tests/traceability.test.mjs && pnpm --filter @fixmyfeed/database db:check && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 7: Commit completion evidence**

```powershell
git add .github/workflows/ci.yml package.json reports/T012-completion-report.md feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/implementation/WORKSTREAM_REGISTRY.md
git commit -m "chore(T012): record tenancy completion evidence"
```

- [ ] **Step 8: Push and open the PR**

Push `codex/T012-organizations-workspaces-memberships`, open a ready PR against `develop` with the required evidence, wait for all checks, verify mergeability, and merge only because the owner explicitly authorized T012's merge. After merge, fetch `origin/develop`, verify the merge commit and post-merge CI, then begin T016 on a new `codex/T016-immutable-audit-logging` branch.
