---
document_id: FD-7BD626B8
title: "Table Specification — User Identities"
status: "Approved for Implementation"
version: "1.0.0"
owner: "Feed Doctor Engineering"
last_reviewed: "2026-08-06"
implementation_authority: true
---

# Table Specification — User Identities

## Purpose

Defines the physical PostgreSQL contract for `user_identities`, including columns, constraints, indexes, lifecycle, retention, and migration behavior.

## Scope

This document is the implementation authority for Table Specification — User Identities. It defines behavior, boundaries, contracts, failure handling, verification, and ownership. Any implementation that conflicts with this document requires an approved ADR and documentation change before merge.

## Dependencies

- `/IMPLEMENTATION_BASELINE.md`
- `/AGENTS.md`

## Inputs

- Approved product and architecture specifications.
- Authenticated tenant context where applicable.
- Versioned configuration and connector capability metadata.

## Outputs

- A conforming implementation of Table Specification — User Identities.
- Traceable tests and operational evidence.
- Auditable state transitions and failure records.

## Functional Requirements

- The table MUST implement Better Auth's account model and link a provider account to one global `users` row.
- The `(provider_id, account_id)` pair MUST remain unique.
- The `user_id` foreign key MUST use restrictive deletion until an explicit account-erasure workflow is implemented.
- Password credentials MAY be stored only as Better Auth password hashes; plaintext credentials are prohibited.
- Social providers remain disabled in T011. Token columns MUST remain null until a provider adapter with approved encrypted token storage is introduced.

## Non-functional Requirements

- NFR-001: The implementation MUST remain provider-portable and MUST NOT require a paid AI API.
- NFR-002: Runtime dependencies MUST be open source or available within the approved bootstrap cost envelope.
- NFR-003: All behavior MUST be deterministic unless a separately approved optional intelligence feature is explicitly enabled.
- NFR-004: Public interfaces MUST be versioned and backwards-compatible within the stated support window.
- NFR-005: The system MUST degrade safely when third-party services are unavailable.

## Data Requirements

- All records MUST carry tenant ownership, creation time, update time, and stable identifiers where applicable.
- Source data, normalized data, derived findings, and writeback results MUST remain distinguishable.
- Mutable business records MUST retain an audit trail sufficient to reconstruct user-visible changes.
- Sensitive values MUST never be written to logs, analytics payloads, URLs, or client-readable configuration.

## Validation Rules

- Reject missing provider, account, or user identifiers.
- Reject identities whose `user_id` does not reference an existing user.
- Reject duplicate `(provider_id, account_id)` pairs.
- Reject plaintext token or password logging at every adapter boundary.

## Loading States

- Interactive operations MUST show an immediate acknowledged state.
- Long-running work MUST expose queued, running, retrying, blocked, completed, partially completed, cancelled, and failed states.
- Loading indicators MUST not imply completion and MUST include resumable status retrieval.

## Empty States

- Empty states MUST distinguish no data, not yet synchronized, filtered-to-zero, insufficient permission, and unavailable integration.
- Every actionable empty state MUST provide the single safest next step.

## Error States

- Errors MUST use the canonical error envelope and a stable machine-readable code.
- User messages MUST explain impact and recovery without exposing secrets or internal stack traces.
- Retryable, non-retryable, authorization, validation, quota, conflict, and upstream errors MUST remain distinguishable.
- Partial failures MUST preserve successful work and identify every failed item.

## Success States

- Success MUST be recorded only after durable persistence and required external acknowledgements.
- Success responses MUST include resulting identifiers, effective version, and next relevant action.
- Mutations MUST produce an audit event and, where applicable, a change-set result.

## Edge Cases

- Duplicate requests, retries after timeouts, out-of-order events, stale browser state, and concurrent edits.
- Revoked credentials, deleted upstream resources, changed permissions, rate limits, and upstream schema changes.
- Catalogs with zero products, millions of products, malformed attributes, duplicate identifiers, and mixed locales.
- Clock skew, daylight-saving changes, unsupported currencies, Unicode edge cases, and extremely long values.
- Tenant deletion, subscription restriction, legal hold, and emergency feature disablement during active work.

## Accessibility

- All user interfaces MUST conform to WCAG 2.2 AA.
- Every operation MUST be keyboard operable with visible focus and logical focus restoration.
- Status, severity, and validation MUST not rely on color alone.
- Dynamic updates MUST use appropriate live-region behavior without excessive announcement.

## Performance Requirements

- Every production query pattern MUST have an index or documented bounded cardinality.
- List queries use keyset pagination; offset pagination is prohibited for unbounded tenant data.
- High-volume append tables must support monthly partitioning without API changes.
- No query may fetch unrestricted blob or JSON payloads for list views.

## Security Requirements

- Apply least privilege, deny by default, tenant-scoped queries, CSRF protection, secure cookies, and origin validation.
- Encrypt transport using TLS and encrypt provider credentials using an application-managed envelope.
- Require explicit reauthorization for high-risk writeback and administrative actions.
- Record immutable audit events for authentication, authorization changes, exports, repairs, rollbacks, and support access.

## Privacy Requirements

- Collect only data necessary for feed diagnosis, repair, account operation, security, and billing.
- Respect retention, export, deletion, legal-hold, and regional-processing policies.
- Do not send customer catalog data to model providers by default.
- Public tools MUST avoid persistent storage unless the user explicitly saves a result.

## Analytics Events

- Emit only approved first-party events using the canonical analytics envelope.
- Events MUST include anonymous or authenticated actor context, tenant context, feature, outcome, latency class, and error code when applicable.
- Analytics MUST exclude secrets, raw feed content, personal data, full URLs with query strings, and merchant access tokens.

## SEO Requirements

- Authenticated application routes MUST be excluded from indexing.
- Public routes MUST provide server-rendered canonical metadata, semantic headings, crawlable links, and valid status codes.
- Programmatic pages MUST pass uniqueness, evidence, usefulness, and thin-content gates before indexability.
- SEO requirements are not applicable to non-public operational interfaces beyond index prevention.

## Observability Requirements

- Emit structured logs, metrics, traces, and audit events with correlation identifiers.
- Expose queue age, throughput, error rate, retry count, upstream latency, quota consumption, and tenant fairness metrics.
- Alerts MUST map to documented SLOs and runbooks.
- Sensitive data MUST be redacted before telemetry emission.

## Test Requirements

- Unit tests for validation and state transitions.
- Integration tests for persistence, authorization, retries, and external adapters.
- Contract tests for API, event, webhook, and connector boundaries.
- End-to-end tests for primary, empty, error, partial-success, accessibility, and recovery paths.
- Load and abuse tests for public or high-volume surfaces.

## Acceptance Criteria

- AC-001: Every functional requirement has at least one traceable automated test.
- AC-002: No undocumented external service, paid API, environment variable, table, endpoint, event, or permission is introduced.
- AC-003: Security, accessibility, observability, and rollback requirements pass their release gates.
- AC-004: Failure injection demonstrates deterministic recovery or safe terminal failure.
- AC-005: Documentation, generated contracts, migrations, tests, and implementation remain mutually consistent.

## Related Documents

- `/docs/07-data-architecture/logical-data-model.md`
- `/docs/08-api-and-contracts/API-style-guide.md`
- `/docs/06-security-privacy-and-compliance/security-architecture.md`

## Open External Dependencies

- Owner-supplied credentials are required only for explicitly enabled external connectors.
- External marketplace or API approval timelines are outside repository control.
- No external paid service may be enabled without owner approval and a recorded cost decision.


## Physical Schema

| Column | Type | Null | Rules |
|---|---|---:|---|
| `id` | UUIDv7 | No | Primary key; application generated. |
| `account_id` | text | No | Provider-owned account identifier. |
| `provider_id` | text | No | Better Auth provider identifier. |
| `user_id` | UUIDv7 | No | References `users.id`; restrictive delete. |
| `access_token` | text | Yes | Disabled for T011 password auth; encrypted storage required before use. |
| `refresh_token` | text | Yes | Disabled for T011 password auth; encrypted storage required before use. |
| `id_token` | text | Yes | Disabled for T011 password auth; encrypted storage required before use. |
| `access_token_expires_at` | timestamptz | Yes | Provider access-token expiration. |
| `refresh_token_expires_at` | timestamptz | Yes | Provider refresh-token expiration. |
| `scope` | text | Yes | Provider scope string. |
| `password` | text | Yes | Better Auth password hash; never plaintext. |
| `created_at` | timestamptz | No | Database UTC timestamp. |
| `updated_at` | timestamptz | No | Changes on every mutation. |

## Constraints and Indexes

- Primary key: `user_identities_pkey (id)`.
- Unique lookup: `user_identities_provider_account_unique (provider_id, account_id)`.
- User lookup: `user_identities_user_id_idx (user_id)`.
- Foreign key: `user_identities.user_id -> users.id ON DELETE RESTRICT`.

## Retention and Deletion

The owning domain defines retention. Deletion MUST preserve required audit references, anonymize user-linked fields where mandated, and remove object-storage artifacts through an idempotent deletion job. `user-identities` data under legal hold cannot be purged.

## Migration Rules

Schema changes are forward-compatible expand/migrate/contract operations. New non-null columns require defaults or backfill stages. Destructive changes require backup verification, rollback strategy, and compatibility across one deployment window.

## Revision History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Initial implementation-authority specification. | Feed Doctor architecture baseline |
