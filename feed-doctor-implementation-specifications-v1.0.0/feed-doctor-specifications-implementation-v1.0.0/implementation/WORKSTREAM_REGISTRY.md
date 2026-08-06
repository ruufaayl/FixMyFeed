---
document_id: FD-D53ABE4A
title: "Workstream Registry"
status: "Approved for Implementation"
version: "1.0.0"
owner: "Feed Doctor Engineering"
last_reviewed: "2026-08-06"
implementation_authority: true
---

# Workstream Registry

## Purpose

Provides the authoritative ordered inventory and state of implementation epics and tasks.

## Scope

This document is the implementation authority for Workstream Registry. It defines behavior, boundaries, contracts, failure handling, verification, and ownership. Any implementation that conflicts with this document requires an approved ADR and documentation change before merge.

## Dependencies

- `/IMPLEMENTATION_BASELINE.md`
- `/AGENTS.md`

## Inputs

- Approved product and architecture specifications.
- Authenticated tenant context where applicable.
- Versioned configuration and connector capability metadata.

## Outputs

- A conforming implementation of Workstream Registry.
- Traceable tests and operational evidence.
- Auditable state transitions and failure records.

## Functional Requirements

- Agents update only their assigned task row after evidence exists.
- Task state transitions must follow the implementation status ledger.
- Dependencies and blocked reasons are never omitted.

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


## Task Inventory

| Task | Name | Epic | Status |
|---|---|---|---|
| T000 | Initialize monorepo and package boundaries | E00 | Verified |
| T001 | Configure formatting linting type checks and commit hooks | E00 | Verified |
| T002 | Create unit integration contract and end-to-end test harnesses | E00 | Not Started |
| T003 | Create configuration schema and startup validation | E00 | Verified |
| T004 | Create CI pipeline and generated traceability checks | E00 | Verified |
| T005 | Create Docker-local dependency environment | E00 | In Review |
| T010 | Implement database schema and migration framework | E01 | Not Started |
| T011 | Implement Better Auth integration | E01 | Not Started |
| T012 | Implement organizations workspaces and memberships | E01 | Not Started |
| T013 | Implement RBAC and permission evaluation | E01 | Not Started |
| T014 | Implement sessions MFA and security events | E01 | Not Started |
| T015 | Implement encrypted credential vault | E01 | Not Started |
| T016 | Implement immutable audit logging | E01 | Not Started |
| T017 | Implement support access grants | E01 | Not Started |
| T020 | Implement tenant-aware repositories | E02 | Not Started |
| T021 | Implement pg-boss queues and worker runtime | E02 | Not Started |
| T022 | Implement transactional outbox and event consumers | E02 | Not Started |
| T023 | Implement object storage abstraction | E02 | Not Started |
| T024 | Implement SMTP notification adapter | E02 | Not Started |
| T025 | Implement idempotency and operation resources | E02 | Not Started |
| T026 | Implement observability and correlation | E02 | Not Started |
| T027 | Implement backup restore automation documentation hooks | E02 | Not Started |
| T030 | Implement connector capability and error contracts | E03 | Not Started |
| T031 | Implement OAuth state callback and credential lifecycle framework | E03 | Not Started |
| T032 | Implement webhook receipt verification and deduplication framework | E03 | Not Started |
| T033 | Implement connector health quota and circuit breaker framework | E03 | Not Started |
| T034 | Implement sync cursor and reconciliation framework | E03 | Not Started |
| T040 | Implement Shopify installation and OAuth | E04 | Not Started |
| T041 | Implement Shopify bulk catalog import | E04 | Not Started |
| T042 | Implement Shopify webhook ingestion | E04 | Not Started |
| T043 | Implement Shopify incremental reconciliation | E04 | Not Started |
| T044 | Implement Shopify controlled writeback | E04 | Not Started |
| T045 | Implement Shopify privacy and uninstall callbacks | E04 | Not Started |
| T050 | Implement WooCommerce credential connection | E05 | Not Started |
| T051 | Implement WooCommerce catalog synchronization | E05 | Not Started |
| T052 | Implement WooCommerce webhook ingestion | E05 | Not Started |
| T053 | Implement WooCommerce reconciliation and hosting fault handling | E05 | Not Started |
| T054 | Implement WooCommerce controlled writeback | E05 | Not Started |
| T060 | Implement Google OAuth and account discovery | E06 | Not Started |
| T061 | Implement Merchant API account and product issue ingestion | E06 | Not Started |
| T062 | Implement aggregate status and product data ingestion | E06 | Not Started |
| T063 | Implement data source and destination ingestion | E06 | Not Started |
| T064 | Implement Merchant API quota scheduling and retries | E06 | Not Started |
| T065 | Implement issue resolution capability routing | E06 | Not Started |
| T070 | Implement file upload and remote feed acquisition | E07 | Not Started |
| T071 | Implement streaming CSV TSV XML and JSON parsers | E07 | Not Started |
| T072 | Implement schema mapping and import preview | E07 | Not Started |
| T073 | Implement normalized catalog and immutable snapshots | E07 | Not Started |
| T074 | Implement product identity and variant matching | E07 | Not Started |
| T075 | Implement incremental synchronization checkpoints | E07 | Not Started |
| T076 | Implement full reconciliation and discrepancy records | E07 | Not Started |
| T080 | Implement validator registry and execution framework | E08 | Not Started |
| T081 | Implement structural and required attribute validators | E08 | Not Started |
| T082 | Implement product identity and variant validators | E08 | Not Started |
| T083 | Implement image and URL acquisition validators | E08 | Not Started |
| T084 | Implement landing page and consistency validators | E08 | Not Started |
| T085 | Implement issue normalization deduplication and lifecycle | E08 | Not Started |
| T086 | Implement evidence confidence impact and prioritization | E08 | Not Started |
| T087 | Implement diagnostic scan orchestration | E08 | Not Started |
| T090 | Implement remediation registry and safety classes | E09 | Not Started |
| T091 | Implement repair option selection and plan generation | E09 | Not Started |
| T092 | Implement change set preview and conflict detection | E09 | Not Started |
| T093 | Implement approval and four-eyes policy | E09 | Not Started |
| T094 | Implement connector writeback executor | E09 | Not Started |
| T095 | Implement verification and partial success handling | E09 | Not Started |
| T096 | Implement rollback planning and execution | E09 | Not Started |
| T097 | Implement rule builder expression and simulation | E09 | Not Started |
| T100 | Implement design system components | E10 | Not Started |
| T101 | Implement authenticated shell navigation and context | E10 | Not Started |
| T102 | Implement onboarding workflows | E10 | Not Started |
| T103 | Implement dashboards and portfolio views | E10 | Not Started |
| T104 | Implement catalog and product views | E10 | Not Started |
| T105 | Implement issue center and diagnostic views | E10 | Not Started |
| T106 | Implement repair approval and history views | E10 | Not Started |
| T107 | Implement rules monitoring reports and exports | E10 | Not Started |
| T110 | Implement monitor alert and escalation engine | E11 | Not Started |
| T111 | Implement in-app notifications | E11 | Not Started |
| T112 | Implement SMTP email and digests | E11 | Not Started |
| T113 | Implement outbound webhooks | E11 | Not Started |
| T114 | Implement support diagnostics and access workflows | E11 | Not Started |
| T120 | Implement public site rendering and content model | E12 | Not Started |
| T121 | Implement public feed and attribute validators | E12 | Not Started |
| T122 | Implement SSRF hardened public URL tools | E12 | Not Started |
| T123 | Implement issue attribute guide and integration page frameworks | E12 | Not Started |
| T124 | Implement canonical redirects structured data and internal links | E12 | Not Started |
| T125 | Implement sitemap and robots generation | E12 | Not Started |
| T126 | Implement first-party analytics and SEO measurement | E12 | Not Started |
| T130 | Implement local plans and entitlement enforcement | E13 | Not Started |
| T131 | Implement disabled-by-default Stripe adapter | E13 | Not Started |
| T132 | Implement usage metering quotas and cost ceilings | E13 | Not Started |
| T133 | Implement internal administration surfaces | E13 | Not Started |
| T140 | Complete threat model and security verification | E14 | Not Started |
| T141 | Complete accessibility conformance verification | E14 | Not Started |
| T142 | Complete performance load and soak verification | E14 | Not Started |
| T143 | Complete backup restore and disaster recovery exercise | E14 | Not Started |
| T144 | Complete connector sandbox certification | E14 | Not Started |
| T145 | Complete SEO production readiness audit | E14 | Not Started |
| T146 | Complete marketplace compliance packages | E14 | Not Started |
| T147 | Complete staging acceptance and owner handoff | E14 | Not Started |
| T148 | Complete controlled production launch | E14 | Not Started |

## Revision History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Initial implementation-authority specification. | Feed Doctor architecture baseline |
