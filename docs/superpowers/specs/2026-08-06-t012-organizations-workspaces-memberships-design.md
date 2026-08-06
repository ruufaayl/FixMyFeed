# T012 Organizations, Workspaces, and Memberships Design

## Objective

Implement the persistent tenant foundation for organizations, workspaces, and memberships without adding HTTP routes, UI, paid services, secrets, or a competing authorization model.

## Decisions

- Organization bootstrap atomically creates the organization and the authenticated creator's active `administrator` membership.
- The first workspace is created separately by an authenticated, tenant-scoped operation.
- Membership roles use the canonical `Role` identifiers exported by `@fixmyfeed/domain`: `viewer`, `operator`, `manager`, `approver`, `administrator`, `security_administrator`, `billing_administrator`, and `platform_operator`.
- T012 consumes the T013 role contract but does not modify `packages/domain/**` or evaluate permissions. Permission evaluation remains T013's responsibility.
- Organization-wide memberships have no workspace identifier. Workspace-specific memberships carry both `organization_id` and `workspace_id`.
- Immutable audit persistence is owned by T016. T012 returns and optionally reports sanitized mutation events containing actor, tenant, resource, outcome, version, and correlation identifiers so T016 can persist them later.

## Architecture

The implementation lives in `@fixmyfeed/database`, the only package permitted to issue SQL. A Drizzle schema module defines the three physical tables and their constraints. A tenant-aware repository provides the supported mutations and reads. All repository operations after organization bootstrap require an explicit tenant context; tenant ownership is never inferred from a resource identifier.

The bootstrap operation receives an authenticated actor identifier, normalized organization input, an idempotency key, and a correlation identifier. It writes the organization and initial membership in one database transaction. Failure of either insert rolls back both rows.

Workspace and membership operations require `organizationId` in their context and include it in every SQL predicate. Updates require the expected record version and increment it atomically. Missing tenant scope, cross-tenant identifiers, invalid lifecycle transitions, uniqueness conflicts, and stale versions produce stable, redacted error codes.

## Physical Model

### Organizations

Organizations are tenant roots and therefore do not repeat `organization_id`. Each row has an application-generated UUIDv7 identifier, normalized name and slug, lifecycle status, idempotency key, creator user identifier, UTC timestamps, optimistic version, and optional deletion timestamp. Slugs and bootstrap idempotency keys are unique.

### Workspaces

Workspaces carry `organization_id`, UUIDv7 identity, normalized name and tenant-local slug, lifecycle status, tenant-scoped idempotency key, creator user identifier, UTC timestamps, optimistic version, and optional deletion timestamp. Tenant-local slug and creator/idempotency uniqueness plus tenant-first keyset indexes are enforced. A composite `(organization_id, id)` key supports same-tenant foreign keys.

### Memberships

Memberships carry `organization_id`, user identifier, optional workspace identifier, canonical role, lifecycle status, tenant-scoped idempotency key, creator user identifier, UTC timestamps, optimistic version, and optional deletion timestamp. User and organization deletion are restrictive. Workspace-scoped rows use a composite foreign key to prevent cross-tenant workspace references. Partial uniqueness prevents duplicate organization-wide or workspace-specific memberships for the same user, while creator/idempotency uniqueness makes safe create retries return the original result.

The supported lifecycle values are:

- Organizations and workspaces: `active`, `archived`.
- Memberships: `active`, `suspended`, `revoked`.

## Repository Contract

The repository exposes:

- idempotent organization bootstrap;
- tenant-scoped organization lookup and optimistic update/archive;
- tenant-scoped workspace create, lookup/list, update, and archive;
- tenant-scoped membership create, lookup/list, role/status update, and revoke;
- active-role resolution for a user within an organization and optional workspace.

Lists use bounded keyset pagination ordered by creation time and identifier. Role resolution returns only active organization-wide roles plus active roles for the requested workspace. It never returns roles from another organization.

## Validation and Errors

Names are trimmed and limited to 1-200 characters. Slugs are lowercase canonical identifiers and reject malformed input rather than silently guessing ownership or destination. UUID, role, lifecycle, pagination, idempotency, correlation, and version inputs are validated before persistence.

Stable error categories distinguish invalid input, missing tenant scope, not found, conflict, optimistic concurrency failure, and persistence failure. Messages exclude database details, credentials, personal data, and unrestricted values.

## Observability and Audit Handoff

Every mutation produces a sanitized event after durable success. Failed operations produce a sanitized failure event. An optional observer cannot change transaction outcomes or leak its own failure. The event contract is intentionally storage-neutral; T016 will provide immutable persistence without requiring T012 to create an audit table early.

## Testing

Tests are written first and must demonstrate the expected failure before production code is added. Coverage includes:

- exact alignment with T013's canonical role identifiers;
- schema columns, constraints, restrictive foreign keys, tenant-first indexes, and generated migration metadata;
- atomic bootstrap success, rollback, and idempotent retry;
- organization/workspace/membership validation and lifecycle transitions;
- tenant-scoped reads and writes, cross-tenant denial, and workspace/organization mismatch rejection;
- optimistic concurrency conflicts;
- bounded keyset pagination and active-role resolution;
- observer failure isolation and redaction;
- additive migration and documented reverse-order rollback procedure.

The full repository formatting, linting, type checking, unit/integration tests, migration checks, and traceability checks run before completion.

## Rollback

Before application code depends on the new tables, rollback drops `memberships`, then `workspaces`, then `organizations`. After dependent code is deployed, rollback first restores the previous application version, verifies no writes require the new schema, preserves any required audit evidence, and only then performs the reverse-order table removal. No automatic destructive rollback is executed by this task.

## Scope Boundaries

T012 does not implement invitations, HTTP handlers, UI, permission evaluation, session hardening, credential storage, immutable audit storage, external providers, or deployment. It adds no environment variable and no paid or recurring dependency.
