# `@fixmyfeed/auth`

Task T011 provides the self-hosted Better Auth core integration selected by ADR-006.

Construct the integration with validated `AppConfig`, an existing `DatabaseClient`, and an optional `AuthEmailDelivery` implementation. The package never reads environment variables or opens infrastructure connections directly. Without email delivery, new sign-up is disabled while already verified accounts remain able to authenticate.

The returned `handler` is ready for a later web task to mount at `/api/auth`. This package does not create a placeholder Next.js route while `apps/web` remains an inert TypeScript workspace.

## Boundaries

- T011 owns the core `users`, `user_identities`, `sessions`, and `authentication_verifications` persistence models.
- T012 owns organizations, workspaces, and memberships.
- T013 owns RBAC and permission evaluation.
- T014 owns enhanced session policy, MFA, and authentication/security events.
- T024 owns the SMTP implementation injected through `AuthEmailDelivery`.

Upstream Better Auth telemetry is explicitly disabled. Local telemetry is best-effort and contains no email addresses, passwords, hashes, secrets, session tokens, verification tokens, or reset URLs.
