---
document_id: FD-A0AF0D8D
title: "Authorization Matrix"
status: "Approved for Implementation"
version: "1.0.0"
owner: "Feed Doctor Engineering"
last_reviewed: "2026-08-06"
implementation_authority: true
---

# Authorization Matrix

## Purpose

Defines role capabilities, separation of duties, resource ownership, service-account limits, and high-risk action controls.

## Scope

This document is the implementation authority for Authorization Matrix. It defines behavior, boundaries, contracts, failure handling, verification, and ownership. Any implementation that conflicts with this document requires an approved ADR and documentation change before merge.

## Dependencies

- `/IMPLEMENTATION_BASELINE.md`
- `/AGENTS.md`

## Inputs

- Approved product and architecture specifications.
- Authenticated tenant context where applicable.
- Versioned configuration and connector capability metadata.

## Outputs

- A conforming implementation of Authorization Matrix.
- Traceable tests and operational evidence.
- Auditable state transitions and failure records.

## Functional Requirements

- Permissions are explicit verbs on resource classes and deny by default.
- Organization administrators do not automatically receive internal platform access.
- Billing administrators cannot read product content unless separately granted.
- Security administrators can inspect security and audit state but cannot modify catalog or execute repairs unless separately granted.
- Service accounts use scopes, expiration, and optional IP restrictions; they cannot satisfy interactive recent-authentication or approval requirements.
- Support grants are time-boxed overlays, not permanent memberships.
- High-risk repair proposer and approver separation is configurable and mandatory for enterprise policy.

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

- `/REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `/SPECIFICATION_COVERAGE_MATRIX.md`

## Open External Dependencies

- Owner-supplied credentials are required only for explicitly enabled external connectors.
- External marketplace or API approval timelines are outside repository control.
- No external paid service may be enabled without owner approval and a recorded cost decision.


## Minimum Permission Matrix

| Resource | Action | Minimum Role / Condition | Boundary |
|---|---|---|---|
| organization | read | Administrator/Security Administrator | Deny by default; tenant scope required |
| workspace | manage | Administrator | Deny by default; tenant scope required |
| store | read | Viewer+ | Deny by default; tenant scope required |
| store | manage | Manager+ | Deny by default; tenant scope required |
| connection | manage | Administrator | Deny by default; tenant scope required |
| catalog | read | Viewer+ | Deny by default; tenant scope required |
| scan | execute | Operator+ | Deny by default; tenant scope required |
| issue | acknowledge | Operator+ | Deny by default; tenant scope required |
| issue | suppress | Manager+ | Deny by default; tenant scope required |
| repair | propose | Operator+ | Deny by default; tenant scope required |
| repair | approve-low-risk | Manager/Approver+ | Deny by default; tenant scope required |
| repair | approve-high-risk | Approver/Administrator; proposer separation when policy requires | Deny by default; tenant scope required |
| writeback | execute | Manager+ and approved plan | Deny by default; tenant scope required |
| rollback | execute | Manager+ and recent authentication | Deny by default; tenant scope required |
| rule | manage | Manager+ | Deny by default; tenant scope required |
| monitor | manage | Manager+ | Deny by default; tenant scope required |
| report | export | Operator+ | Deny by default; tenant scope required |
| audit | read | Administrator/Security Administrator | Deny by default; tenant scope required |
| billing | manage | Billing Administrator/Administrator | Deny by default; tenant scope required |
| team | manage | Administrator | Deny by default; tenant scope required |
| support-access | grant | Administrator | Deny by default; tenant scope required |
| platform-admin | operate | Internal platform operator only | Deny by default; tenant scope required |

## Revision History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Initial implementation-authority specification. | Feed Doctor architecture baseline |
