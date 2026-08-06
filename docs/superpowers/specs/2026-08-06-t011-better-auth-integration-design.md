# T011 Better Auth Integration Design

**Task:** T011 — Implement Better Auth integration  
**Branch:** `codex/T011-better-auth-integration`  
**Base:** `origin/develop` at `1a63f4a28b78c7c9c41f4876b08edabdd43ea67b`  
**Approved by owner:** 2026-08-06

## Goal

Provide a production-shaped, self-hosted Better Auth integration backed by the existing Drizzle/PostgreSQL boundary. The change supplies Better Auth's core persistence contract, safe configuration, an injectable email boundary, migration and rollback evidence, and automated contract tests without implementing organization membership, RBAC, MFA, security-event processing, UI, or SMTP delivery.

## Decision

Use Better Auth's official Drizzle adapter and map its four core models to documented FixMyFeed tables:

| Better Auth model | FixMyFeed table |
|---|---|
| `user` | `users` |
| `account` | `user_identities` |
| `session` | `sessions` |
| `verification` | `authentication_verifications` |

The missing verification table is added to the Physical Schema Registry and receives its own table specification. The existing three table specifications are narrowed from generic placeholder columns to the actual Better Auth storage contract. Auth tables are global identity records; tenant authorization remains expressed through T012 memberships rather than a nullable or inferred tenant on authentication rows.

## Alternatives Considered

### Official Drizzle adapter — selected

This keeps authentication behavior on the approved Better Auth implementation path and delegates typed PostgreSQL access to the repository's database boundary. It minimizes custom security-sensitive code and preserves the ability to follow upstream security fixes.

### Custom Better Auth database adapter

A custom adapter could force the generic placeholder schema and bespoke optimistic-concurrency semantics. It was rejected because it duplicates a security-sensitive upstream integration, increases test surface, and would encode schema compromises that do not match Better Auth's core models.

### Configuration-only integration

A factory without durable tables or migrations was rejected because it would not implement a usable production integration and would fail the persistence and recovery requirements.

## Package Boundaries

`@fixmyfeed/database` remains the only workspace that owns SQL schema and constructs the Better Auth Drizzle adapter. It exports the four auth table definitions, the aggregated schema, and an adapter factory that accepts the existing `DatabaseClient`.

`@fixmyfeed/auth` owns Better Auth configuration and policy. It accepts validated application configuration, a `DatabaseClient`, and optional injected ports. It never reads `process.env`, opens a database connection, or implements SMTP directly.

No application route is added in T011. The current web workspace is still a TypeScript boundary rather than a Next.js App Router application. The auth factory returns Better Auth's handler so the later web application task can mount it without duplicating configuration.

## Authentication Configuration

The factory sets these values explicitly:

- `secret` comes only from validated `config.auth.secret`.
- `baseURL` and the sole trusted origin come from normalized `config.app.baseUrl`.
- email/password authentication is enabled.
- email verification is required before password sign-in.
- sign-up is disabled when no email delivery port is supplied, providing truthful safe degradation.
- verification identifiers are stored hashed.
- IDs are application-generated UUIDv7 values through the database identifier helper.
- cookie caching is disabled so database revocation remains authoritative.
- cookies remain HTTP-only and SameSite=Lax; secure cookies are required when the configured origin is HTTPS.
- built-in rate limiting stays enabled and uses process memory in this bounded task so no undocumented rate-limit table is created. Distributed anti-abuse hardening belongs to the later security task.

No social provider, organization plugin, two-factor plugin, enterprise SSO extension, or secondary storage is enabled.

## Email Boundary and Safe Degradation

T011 defines an `AuthEmailDelivery` port for verification and password-reset messages. The port receives the recipient, purpose, URL, and correlation-safe context; it does not receive the auth secret, stored password hash, session token, or database credentials.

When the port is present, Better Auth invokes it without exposing delivery implementation details. When absent, new sign-up is disabled and password reset returns a stable unavailable outcome; existing verified accounts can still authenticate. T024 will implement the SMTP adapter and inject it through this port.

## Persistence Model

The migration creates exactly four registry-backed tables. Columns use snake_case PostgreSQL names while Drizzle properties retain Better Auth's canonical field names.

- `users`: identity, normalized unique email, verification state, optional image, timestamps.
- `user_identities`: provider/account identity, user foreign key, optional encrypted/provider token fields, optional password hash, timestamps.
- `sessions`: unique opaque token, user foreign key, expiry, optional IP address and user-agent metadata, timestamps.
- `authentication_verifications`: hashed identifier, opaque value, expiry, timestamps.

All primary keys are UUIDv7. Foreign keys from accounts and sessions to users are restrictive by default. Authentication verification rows are ephemeral and have an expiry index. Session tokens and provider/account identities have unique lookup indexes. Tokens, password hashes, and verification values are never logged.

Better Auth owns atomic mutations of these internal records; organization-scoped repository methods do not apply until a request resolves a membership in T012. T014 may extend session policy and security telemetry without replacing these core tables.

## Failure and Error Behavior

Construction validates the base URL, trusted origin, secret presence, and database adapter. Invalid configuration throws a stable `AuthConfigurationError` whose message contains no secret values.

Email-port failures are classified as delivery unavailable and are never reported as successful. Better Auth request errors remain expressed through its handler contract; application-level canonical error-envelope translation will occur where the handler is mounted.

Telemetry hooks are best-effort and secret-safe. A telemetry callback failure cannot change the authentication result.

## Migration and Rollback

The forward migration creates the four tables, constraints, and indexes in dependency order. The rollback section in the completion report records the reverse dependency order: verification records, sessions, identities, then users. Production rollback is destructive and therefore requires backup verification and explicit operator approval; no automated down command is exposed.

The migration is generated through the existing Drizzle Kit workflow, committed as reviewed SQL, and checked by `drizzle-kit check`.

## Verification Strategy

Tests cover:

- exact schema/table/column/index mapping;
- UUIDv7 ID generation and restrictive foreign keys;
- secure factory defaults, trusted-origin behavior, and secret redaction;
- email-present and email-unavailable modes;
- absence of MFA, social providers, secondary storage, and undocumented tables;
- Better Auth handler construction using the real Drizzle adapter boundary;
- migration journal and SQL contract;
- dependency-register and workstream traceability.

Repository gates remain formatting, linting, type checking, unit/contract tests, traceability, Drizzle schema checks, and dependency audit. Tests do not require paid services, production credentials, or external side effects.

## Ownership Boundaries

T011 owns only Better Auth core integration and its four persistence models. It explicitly leaves:

- organizations, workspaces, and memberships to T012;
- roles and permission evaluation to T013;
- enhanced session lifecycle, MFA, authentication/security event recording, and account-takeover controls to T014;
- SMTP delivery to T024;
- Next.js route mounting and authentication UI to the relevant web/application tasks.

