---
document_id: FD-5B385D9D
title: "Endpoint Registry"
status: "Approved for Implementation"
version: "1.0.0"
owner: "Feed Doctor Engineering"
last_reviewed: "2026-08-06"
implementation_authority: true
---

# Endpoint Registry

## Purpose

Provides the authoritative inventory of all versioned HTTP endpoints and links them to resource specifications.

## Scope

This document is the implementation authority for Endpoint Registry. It defines behavior, boundaries, contracts, failure handling, verification, and ownership. Any implementation that conflicts with this document requires an approved ADR and documentation change before merge.

## Dependencies

- `/IMPLEMENTATION_BASELINE.md`
- `/AGENTS.md`

## Inputs

- Approved product and architecture specifications.
- Authenticated tenant context where applicable.
- Versioned configuration and connector capability metadata.

## Outputs

- A conforming implementation of Endpoint Registry.
- Traceable tests and operational evidence.
- Auditable state transitions and failure records.

## Functional Requirements

- Every implemented route MUST appear in this registry before merge.
- CI compares route manifests with this registry and rejects undocumented endpoints.
- Route-specific request and response schemas are generated from the versioned contract package.
- Internal health and callback routes use separate registries and are never implied by public resources.

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


## Endpoint Inventory

| Method | Path | Operation | Authorization | Idempotency / Concurrency |
|---|---|---|---|---|


| `GET` | `/api/v1/organizations` | list organizations | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/organizations` | create organizations | Authenticated + resource permission | Required |
| `GET` | `/api/v1/organizations/{id}` | get organizations | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/organizations/{id}` | update organizations | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/organizations/{id}` | delete organizations | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/workspaces` | list workspaces | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/workspaces` | create workspaces | Authenticated + resource permission | Required |
| `GET` | `/api/v1/workspaces/{id}` | get workspaces | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/workspaces/{id}` | update workspaces | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/workspaces/{id}` | delete workspaces | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/users` | list users | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/users` | create users | Authenticated + resource permission | Required |
| `GET` | `/api/v1/users/{id}` | get users | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/users/{id}` | update users | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/users/{id}` | delete users | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/memberships` | list memberships | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/memberships` | create memberships | Authenticated + resource permission | Required |
| `GET` | `/api/v1/memberships/{id}` | get memberships | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/memberships/{id}` | update memberships | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/memberships/{id}` | delete memberships | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/invitations` | list invitations | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/invitations` | create invitations | Authenticated + resource permission | Required |
| `GET` | `/api/v1/invitations/{id}` | get invitations | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/invitations/{id}` | update invitations | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/invitations/{id}` | delete invitations | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/roles` | list roles | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/roles` | create roles | Authenticated + resource permission | Required |
| `GET` | `/api/v1/roles/{id}` | get roles | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/roles/{id}` | update roles | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/roles/{id}` | delete roles | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/service-accounts` | list service-accounts | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/service-accounts` | create service-accounts | Authenticated + resource permission | Required |
| `GET` | `/api/v1/service-accounts/{id}` | get service-accounts | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/service-accounts/{id}` | update service-accounts | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/service-accounts/{id}` | delete service-accounts | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/api-keys` | list api-keys | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/api-keys` | create api-keys | Authenticated + resource permission | Required |
| `GET` | `/api/v1/api-keys/{id}` | get api-keys | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/api-keys/{id}` | update api-keys | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/api-keys/{id}` | delete api-keys | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/stores` | list stores | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/stores` | create stores | Authenticated + resource permission | Required |
| `GET` | `/api/v1/stores/{id}` | get stores | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/stores/{id}` | update stores | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/stores/{id}` | delete stores | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/platform-connections` | list platform-connections | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/platform-connections` | create platform-connections | Authenticated + resource permission | Required |
| `GET` | `/api/v1/platform-connections/{id}` | get platform-connections | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/platform-connections/{id}` | update platform-connections | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/platform-connections/{id}` | delete platform-connections | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/merchant-accounts` | list merchant-accounts | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/merchant-accounts` | create merchant-accounts | Authenticated + resource permission | Required |
| `GET` | `/api/v1/merchant-accounts/{id}` | get merchant-accounts | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/merchant-accounts/{id}` | update merchant-accounts | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/merchant-accounts/{id}` | delete merchant-accounts | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/data-sources` | list data-sources | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/data-sources` | create data-sources | Authenticated + resource permission | Required |
| `GET` | `/api/v1/data-sources/{id}` | get data-sources | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/data-sources/{id}` | update data-sources | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/data-sources/{id}` | delete data-sources | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/catalogs` | list catalogs | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/catalogs` | create catalogs | Authenticated + resource permission | Required |
| `GET` | `/api/v1/catalogs/{id}` | get catalogs | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/catalogs/{id}` | update catalogs | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/catalogs/{id}` | delete catalogs | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/products` | list products | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/products` | create products | Authenticated + resource permission | Required |
| `GET` | `/api/v1/products/{id}` | get products | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/products/{id}` | update products | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/products/{id}` | delete products | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/product-variants` | list product-variants | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/product-variants` | create product-variants | Authenticated + resource permission | Required |
| `GET` | `/api/v1/product-variants/{id}` | get product-variants | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/product-variants/{id}` | update product-variants | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/product-variants/{id}` | delete product-variants | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/feeds` | list feeds | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/feeds` | create feeds | Authenticated + resource permission | Required |
| `GET` | `/api/v1/feeds/{id}` | get feeds | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/feeds/{id}` | update feeds | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/feeds/{id}` | delete feeds | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/imports` | list imports | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/imports` | create imports | Authenticated + resource permission | Required |
| `GET` | `/api/v1/imports/{id}` | get imports | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/imports/{id}` | update imports | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/imports/{id}` | delete imports | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/sync-runs` | list sync-runs | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/sync-runs` | create sync-runs | Authenticated + resource permission | Required |
| `GET` | `/api/v1/sync-runs/{id}` | get sync-runs | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/sync-runs/{id}` | update sync-runs | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/sync-runs/{id}` | delete sync-runs | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/scans` | list scans | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/scans` | create scans | Authenticated + resource permission | Required |
| `GET` | `/api/v1/scans/{id}` | get scans | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/scans/{id}` | update scans | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/scans/{id}` | delete scans | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/issues` | list issues | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/issues` | create issues | Authenticated + resource permission | Required |
| `GET` | `/api/v1/issues/{id}` | get issues | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/issues/{id}` | update issues | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/issues/{id}` | delete issues | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/issue-evidence` | list issue-evidence | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/issue-evidence` | create issue-evidence | Authenticated + resource permission | Required |
| `GET` | `/api/v1/issue-evidence/{id}` | get issue-evidence | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/issue-evidence/{id}` | update issue-evidence | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/issue-evidence/{id}` | delete issue-evidence | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/issue-impact` | list issue-impact | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/issue-impact` | create issue-impact | Authenticated + resource permission | Required |
| `GET` | `/api/v1/issue-impact/{id}` | get issue-impact | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/issue-impact/{id}` | update issue-impact | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/issue-impact/{id}` | delete issue-impact | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/remediations` | list remediations | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/remediations` | create remediations | Authenticated + resource permission | Required |
| `GET` | `/api/v1/remediations/{id}` | get remediations | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/remediations/{id}` | update remediations | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/remediations/{id}` | delete remediations | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/change-sets` | list change-sets | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/change-sets` | create change-sets | Authenticated + resource permission | Required |
| `GET` | `/api/v1/change-sets/{id}` | get change-sets | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/change-sets/{id}` | update change-sets | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/change-sets/{id}` | delete change-sets | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/approvals` | list approvals | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/approvals` | create approvals | Authenticated + resource permission | Required |
| `GET` | `/api/v1/approvals/{id}` | get approvals | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/approvals/{id}` | update approvals | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/approvals/{id}` | delete approvals | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/writebacks` | list writebacks | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/writebacks` | create writebacks | Authenticated + resource permission | Required |
| `GET` | `/api/v1/writebacks/{id}` | get writebacks | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/writebacks/{id}` | update writebacks | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/writebacks/{id}` | delete writebacks | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/rollbacks` | list rollbacks | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/rollbacks` | create rollbacks | Authenticated + resource permission | Required |
| `GET` | `/api/v1/rollbacks/{id}` | get rollbacks | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/rollbacks/{id}` | update rollbacks | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/rollbacks/{id}` | delete rollbacks | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/rules` | list rules | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/rules` | create rules | Authenticated + resource permission | Required |
| `GET` | `/api/v1/rules/{id}` | get rules | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/rules/{id}` | update rules | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/rules/{id}` | delete rules | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/monitors` | list monitors | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/monitors` | create monitors | Authenticated + resource permission | Required |
| `GET` | `/api/v1/monitors/{id}` | get monitors | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/monitors/{id}` | update monitors | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/monitors/{id}` | delete monitors | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/alerts` | list alerts | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/alerts` | create alerts | Authenticated + resource permission | Required |
| `GET` | `/api/v1/alerts/{id}` | get alerts | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/alerts/{id}` | update alerts | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/alerts/{id}` | delete alerts | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/notifications` | list notifications | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/notifications` | create notifications | Authenticated + resource permission | Required |
| `GET` | `/api/v1/notifications/{id}` | get notifications | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/notifications/{id}` | update notifications | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/notifications/{id}` | delete notifications | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/reports` | list reports | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/reports` | create reports | Authenticated + resource permission | Required |
| `GET` | `/api/v1/reports/{id}` | get reports | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/reports/{id}` | update reports | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/reports/{id}` | delete reports | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/exports` | list exports | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/exports` | create exports | Authenticated + resource permission | Required |
| `GET` | `/api/v1/exports/{id}` | get exports | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/exports/{id}` | update exports | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/exports/{id}` | delete exports | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/audit-logs` | list audit-logs | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/audit-logs` | create audit-logs | Authenticated + resource permission | Required |
| `GET` | `/api/v1/audit-logs/{id}` | get audit-logs | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/audit-logs/{id}` | update audit-logs | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/audit-logs/{id}` | delete audit-logs | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/usage` | list usage | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/usage` | create usage | Authenticated + resource permission | Required |
| `GET` | `/api/v1/usage/{id}` | get usage | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/usage/{id}` | update usage | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/usage/{id}` | delete usage | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/subscriptions` | list subscriptions | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/subscriptions` | create subscriptions | Authenticated + resource permission | Required |
| `GET` | `/api/v1/subscriptions/{id}` | get subscriptions | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/subscriptions/{id}` | update subscriptions | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/subscriptions/{id}` | delete subscriptions | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/webhook-endpoints` | list webhook-endpoints | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/webhook-endpoints` | create webhook-endpoints | Authenticated + resource permission | Required |
| `GET` | `/api/v1/webhook-endpoints/{id}` | get webhook-endpoints | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/webhook-endpoints/{id}` | update webhook-endpoints | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/webhook-endpoints/{id}` | delete webhook-endpoints | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/operations` | list operations | Authenticated + resource permission | N/A |
| `POST` | `/api/v1/operations` | create operations | Authenticated + resource permission | Required |
| `GET` | `/api/v1/operations/{id}` | get operations | Authenticated + resource permission | N/A |
| `PATCH` | `/api/v1/operations/{id}` | update operations | Authenticated + resource permission | If-Match |
| `DELETE` | `/api/v1/operations/{id}` | delete operations | Authenticated + resource permission | If-Match |
| `GET` | `/api/v1/public-tools` | list public-tools | Public quota | N/A |
| `POST` | `/api/v1/public-tools` | create public-tools | Public quota | Required |
| `GET` | `/api/v1/public-tools/{id}` | get public-tools | Public quota | N/A |
| `PATCH` | `/api/v1/public-tools/{id}` | update public-tools | Public quota | If-Match |
| `DELETE` | `/api/v1/public-tools/{id}` | delete public-tools | Public quota | If-Match |

## Revision History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Initial implementation-authority specification. | Feed Doctor architecture baseline |
