---
document_id: FD-42A84798
title: "Security Events"
status: "Approved for Implementation"
version: "1.0.0"
owner: "Feed Doctor Engineering"
last_reviewed: "2026-08-06"
implementation_authority: true
---

# Security Events

## Purpose

Defines all immutable domain events emitted for security lifecycle changes.

## Scope

This document is the implementation authority for Security Events. It defines behavior, boundaries, contracts, failure handling, verification, and ownership. Any implementation that conflicts with this document requires an approved ADR and documentation change before merge.

## Dependencies

- `/IMPLEMENTATION_BASELINE.md`
- `/AGENTS.md`

## Inputs

- Approved product and architecture specifications.
- Authenticated tenant context where applicable.
- Versioned configuration and connector capability metadata.

## Outputs

- A conforming implementation of Security Events.
- Traceable tests and operational evidence.
- Auditable state transitions and failure records.

## Functional Requirements

- Define created, changed, completed, failed, cancelled, and deleted events only where meaningful to the security lifecycle.
- Every event conforms to the canonical event envelope.
- Events are facts in past tense and never commands.
- Consumers must tolerate additional fields and unknown future event types.
- Sensitive payloads are represented by identifiers and classifications, not raw data.

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

- Validate all input at the trust boundary and again before persistence or external side effects.
- Reject unknown enum values unless the contract explicitly supports forward-compatible passthrough.
- Normalize whitespace, identifiers, URLs, locale, currency, and timestamps according to repository standards.
- Never infer missing authorization, ownership, destination, market, or repair consent.

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

- Interactive reads SHOULD meet p95 server latency of 500 ms excluding third-party latency.
- Interactive writes SHOULD acknowledge within 1 second and move long work to durable jobs.
- List endpoints MUST paginate and MUST NOT perform unbounded scans.
- Large-catalog processing MUST stream or batch with bounded memory and resumable checkpoints.

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

- `/docs/08-api-and-contracts/event-contracts/event-envelope.md`

## Open External Dependencies

- Owner-supplied credentials are required only for explicitly enabled external connectors.
- External marketplace or API approval timelines are outside repository control.
- No external paid service may be enabled without owner approval and a recorded cost decision.


## Event Catalog

| Event | Trigger | Minimum Payload |
|---|---|---|
| `security.created.v1` | Durable creation committed | resource ID, initial status |
| `security.updated.v1` | Material authorized change | resource ID, changed field names, version |
| `security.completed.v1` | Terminal successful workflow | resource ID, outcome summary |
| `security.failed.v1` | Terminal or operator-actionable failure | resource ID, canonical error code |
| `security.deleted.v1` | Lifecycle deletion committed | resource ID, deletion mode |

## Revision History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Initial implementation-authority specification. | Feed Doctor architecture baseline |
