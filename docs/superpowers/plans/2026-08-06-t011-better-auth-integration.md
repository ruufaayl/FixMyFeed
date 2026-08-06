# T011 Better Auth Integration Implementation Plan

> **Required execution discipline:** Follow the tasks in order, use test-driven development for every behavior, and commit only after all task and repository gates pass.

**Goal:** Implement a self-hosted Better Auth factory backed by four documented Drizzle/PostgreSQL auth tables, with verified-email policy, injectable email delivery, reviewed migration SQL, traceability, and safe failure behavior.

**Architecture:** `@fixmyfeed/database` owns the Better Auth Drizzle adapter and auth schema. `@fixmyfeed/auth` owns Better Auth configuration and returns a handler-ready instance. The integration consumes validated `AppConfig`, never reads environment variables directly, and exposes email/telemetry ports without implementing SMTP or application routes.

**Technology:** TypeScript 5.9, Node.js 24, Better Auth 1.6.x, `@better-auth/drizzle-adapter` 1.6.x, Drizzle ORM 0.45.x, PostgreSQL 17+, Node test runner, pnpm 10.

**Design authority:** `docs/superpowers/specs/2026-08-06-t011-better-auth-integration-design.md`

---

## Task 1: Pin and register Better Auth dependencies

**Files:**

- Modify: `packages/auth/package.json`
- Modify: `packages/database/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/THIRD_PARTY_DEPENDENCY_REGISTER.md`

### Step 1: Confirm current official versions and advisories

Run:

```powershell
pnpm view better-auth version license
pnpm view @better-auth/drizzle-adapter version license
```

Expected: compatible 1.6.x versions and MIT-compatible licensing. If the version line has advanced beyond the reviewed design, stop and review its official release notes before changing the plan.

### Step 2: Add workspace-scoped dependencies

Add `better-auth` to `@fixmyfeed/auth`. Add `@better-auth/drizzle-adapter` to `@fixmyfeed/database`. Pin both to the same reviewed 1.6.x patch version rather than using `latest` or an unbounded range.

Run:

```powershell
pnpm install --lockfile-only
```

Expected: lockfile contains the two direct dependencies and no unexpected paid service SDK.

### Step 3: Document dependency ownership

Add both packages to the approved dependency inventory with version, license, advisory process, data exposure, zero recurring cost, and removal plan. State that the Drizzle adapter remains behind `@fixmyfeed/database`.

### Step 4: Verify the dependency graph

Run:

```powershell
pnpm install --offline
pnpm audit --prod
pnpm run test:boundaries
```

Expected: dependency installation succeeds from the lock/store, no critical production advisory is accepted, and workspace boundaries remain valid.

## Task 2: Write failing auth integration contract tests

**Files:**

- Create: `tests/auth.test.mjs`
- Modify: `package.json`

### Step 1: Add the root test entry

Add `test:auth` and include `tests/auth.test.mjs` in the explicit root `test` command. Do not remove or bypass existing test files.

### Step 2: Write schema contract tests

Import the not-yet-implemented auth schema from `packages/database/dist/index.js` and assert:

- exactly `users`, `userIdentities`, `sessions`, and `authenticationVerifications` are aggregated;
- physical table names match the approved mapping;
- required Better Auth columns are present with snake_case SQL names;
- session token, user email, provider/account identity, and verification expiry indexes exist;
- foreign keys from identities and sessions to users are restrictive;
- primary IDs have application defaults.

### Step 3: Write factory and failure tests

Import the not-yet-implemented auth API from `packages/auth/dist/index.js` and assert:

- invalid URL or missing/short secret throws `AuthConfigurationError` without echoing input secrets;
- the factory accepts validated config and a database adapter;
- email delivery absent produces `signUpEnabled: false` in the exported safe policy summary;
- email delivery present enables signup and wires verification/password-reset callbacks;
- trusted origins contain only the normalized application origin;
- secure cookies are required for HTTPS and not falsely marked secure for localhost HTTP;
- MFA, social providers, organization plugin, and secondary storage are absent;
- telemetry callback failure is swallowed.

Use injected adapter and Better Auth constructor factories where needed to inspect options without opening a database connection.

### Step 4: Run the red test

Run:

```powershell
pnpm run typecheck
pnpm run test:auth
```

Expected: fail because the T011 schema and auth exports do not exist. Confirm failure is about missing behavior, not test syntax.

## Task 3: Implement the four-table database boundary

**Files:**

- Create: `packages/database/src/auth-schema.ts`
- Create: `packages/database/src/auth-adapter.ts`
- Modify: `packages/database/src/schema.ts`
- Modify: `packages/database/src/index.ts`

### Step 1: Define the Drizzle auth schema

Create four `pgTable` definitions using Better Auth's canonical property names and approved snake_case database names.

Use `primaryId()` for every ID. Define:

- `users`: `id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`;
- `userIdentities`: Better Auth account fields including provider/account IDs, user ID, optional tokens, expiries, scope, password, and timestamps;
- `sessions`: ID, expiry, unique token, timestamps, optional IP/user agent, and user ID;
- `authenticationVerifications`: ID, identifier, value, expiry, and timestamps.

Use bounded text/varchar columns where the contract permits. Add unique and lookup indexes explicitly. Do not add organization, MFA, event, RBAC, or generic metadata fields.

### Step 2: Export the aggregated schema

Replace the empty aggregation object with only the four auth tables and export both named tables and the aggregate from the database package.

### Step 3: Construct the official adapter behind database

Implement `createAuthDatabaseAdapter(databaseClient)` using `drizzleAdapter` with `provider: "pg"`, the explicit schema map, and no experimental joins. Reject missing/malformed clients with a secret-safe stable configuration error or reuse the database configuration error where appropriate.

### Step 4: Run focused tests

Run:

```powershell
pnpm --filter @fixmyfeed/database build
pnpm run test:auth
```

Expected: schema assertions pass; auth factory assertions still fail.

## Task 4: Implement the Better Auth factory and ports

**Files:**

- Create: `packages/auth/src/errors.ts`
- Create: `packages/auth/src/ports.ts`
- Create: `packages/auth/src/factory.ts`
- Modify: `packages/auth/src/index.ts`
- Create: `packages/auth/README.md`

### Step 1: Implement stable secret-safe errors

Define `AUTH_ERROR_CODE` and `AuthConfigurationError`. Error messages must be fixed strings and must not retain configuration objects, URLs with credentials, secrets, tokens, or callback payloads.

### Step 2: Define integration ports

Define:

- `AuthEmailDelivery` with verification and reset delivery methods;
- `AuthTelemetry` with a small redacted lifecycle-event union;
- `CreateAuthOptions` accepting the validated config subset, `DatabaseClient`, optional ports, and optional injected constructor/adapter only for deterministic tests.

Ports must not expose passwords, hashes, session tokens, or auth secrets.

### Step 3: Build and validate Better Auth options

Implement a pure option builder that:

- normalizes `baseURL` to an origin and rejects credentials, query strings, and fragments;
- passes the validated auth secret directly to Better Auth but never returns it in the safe summary;
- maps model names to the four approved tables;
- enables email/password and requires verified email;
- disables signup without an email port;
- hashes verification identifiers;
- uses UUIDv7 generation;
- disables cookie cache;
- sets secure cookie behavior from the origin protocol;
- explicitly uses in-memory rate-limit storage;
- omits social providers, plugins, secondary storage, and dynamic proxy-header trust.

### Step 4: Wire email and telemetry callbacks

Wire verification and password-reset callbacks only when the email port exists. Invoke telemetry best-effort and suppress telemetry failures. Do not suppress email-delivery failures or report them as success.

### Step 5: Export a handler-ready integration

Implement `createAuth(options)` using the database adapter and Better Auth constructor. Return the Better Auth instance plus a frozen, non-secret `policy` summary suitable for startup evidence.

Document construction, safe degradation, email injection, route mounting responsibility, and the T012–T014/T024 boundaries in `packages/auth/README.md`.

### Step 6: Run focused tests

Run:

```powershell
pnpm --filter @fixmyfeed/auth build
pnpm run test:auth
```

Expected: factory, failure, email, policy, and secret-redaction tests pass.

## Task 5: Generate and verify the reviewed migration

**Files:**

- Create: `packages/database/drizzle/0000_t011_better_auth.sql`
- Create: `packages/database/drizzle/meta/0000_snapshot.json`
- Modify: `packages/database/drizzle/meta/_journal.json`
- Modify: `packages/database/README.md`

### Step 1: Generate through Drizzle Kit

Run:

```powershell
pnpm --filter @fixmyfeed/database exec drizzle-kit generate --config=drizzle.config.ts --name=t011_better_auth
```

Expected: one migration and one snapshot, with the expected deterministic `0000_t011_better_auth` name.

### Step 2: Review generated SQL

Verify that SQL creates exactly the four approved tables, indexes, and restrictive foreign keys. Confirm no destructive statement, extension, undocumented enum, organization table, MFA table, event table, or rate-limit table appears.

### Step 3: Extend migration contract tests

Add assertions to `tests/auth.test.mjs` for table names, constraint/index presence, migration journal entry, absence of destructive SQL, and absence of secrets.

### Step 4: Document migration operation

Update the database README with schema ownership, generate/check/migrate commands, required backup/approval for destructive rollback, and reverse dependency order.

### Step 5: Run migration checks

Run:

```powershell
pnpm --filter @fixmyfeed/database run db:check
pnpm run test:auth
```

Expected: migration metadata is valid and contract tests pass.

## Task 6: Align the authoritative auth table specifications

**Files:**

- Modify: `feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/docs/07-data-architecture/tables/identity-and-tenancy/users.md`
- Modify: `feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/docs/07-data-architecture/tables/identity-and-tenancy/user-identities.md`
- Modify: `feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/docs/07-data-architecture/tables/identity-and-tenancy/sessions.md`
- Create: `feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/docs/07-data-architecture/tables/identity-and-tenancy/authentication-verifications.md`
- Modify: `feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/docs/07-data-architecture/PHYSICAL_SCHEMA_REGISTRY.md`

### Step 1: Replace placeholder physical columns

For the three existing table specifications, replace the generic placeholder schema with the exact Better Auth-backed columns, constraints, lookup patterns, sensitive-value handling, lifecycle, and migration rules.

Clarify that auth identity records are global and tenant access is established later through membership records. Clarify that Better Auth owns atomic mutation semantics for its internal records.

### Step 2: Add the verification table authority

Create the full table specification for `authentication_verifications`, including hashed identifiers, opaque values, expiry, cleanup, redaction, no tenant ownership, and no audit-event substitution.

### Step 3: Update the registry

Set the documented column counts to match the implemented schema and add `authentication_verifications`. No other registry row changes.

### Step 4: Test documentation/schema consistency

Extend `tests/auth.test.mjs` to compare implemented table names and column counts with the registry and to verify the new specification exists.

Run:

```powershell
pnpm run test:auth
pnpm run check:traceability
```

Expected: implementation, migration, registry, and table documents agree.

## Task 7: Complete evidence and task status

**Files:**

- Create: `reports/T011-completion-report.md`
- Modify: `feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/implementation/WORKSTREAM_REGISTRY.md`

### Step 1: Write the completion report

Record changed files, requirements, architecture decisions, tests and exact results, acceptance evidence, security analysis, dependency versions/licenses/audit result, migration and rollback details, required environment variables (`DATABASE_URL`, `AUTH_SECRET`, and existing application base URL only), known limitations, and explicit handoffs to T012–T014/T024/web.

### Step 2: Update only T011 status

Change only the T011 row from `Not Started` to `In Review`. Do not mark the task verified or approved.

### Step 3: Run all gates from a clean build

Run:

```powershell
pnpm run clean
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run check:traceability
pnpm --filter @fixmyfeed/database run db:check
pnpm audit --prod
git diff --check
git status --short
```

Expected: all commands pass; status contains only the reviewed T011 files.

### Step 4: Commit, push, and open the PR

Commit all implementation changes with a T011 message, push `codex/T011-better-auth-integration`, and open a pull request against `develop` with T011 in the title. The PR body must include changed files, requirements, tests/results, limitations, migrations, environment variables, rollback, dependency evidence, and acceptance evidence. Do not merge the PR.

