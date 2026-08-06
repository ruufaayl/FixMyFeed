---
document_id: FD-8EC9A00B
title: "Feed Doctor Production Implementation Specifications"
status: "Approved for Implementation"
version: "1.0.0"
owner: "Feed Doctor Engineering"
last_reviewed: "2026-08-06"
implementation_authority: true
---

# Feed Doctor Production Implementation Specifications

## Purpose

This repository is the implementation authority for building Feed Doctor end to end with Claude Code, Codex, or a human engineering team. It contains product, architecture, data, API, UI, integration, algorithm, security, testing, deployment, SEO, operations, and agent-execution specifications. It contains no production secrets and does not authorize autonomous production deployment.

## Scope

This document is the implementation authority for Feed Doctor Production Implementation Specifications. It defines behavior, boundaries, contracts, failure handling, verification, and ownership. Any implementation that conflicts with this document requires an approved ADR and documentation change before merge.

## Dependencies

- `/IMPLEMENTATION_BASELINE.md`
- `/AGENTS.md`

## Inputs

- Approved product and architecture specifications.
- Authenticated tenant context where applicable.
- Versioned configuration and connector capability metadata.

## Outputs

- A conforming implementation of Feed Doctor Production Implementation Specifications.
- Traceable tests and operational evidence.
- Auditable state transitions and failure records.

## Functional Requirements

- Agents begin with `AGENTS.md`, `IMPLEMENTATION_BASELINE.md`, and one task under `/implementation/tasks`.
- Core functionality must operate without paid AI or enrichment APIs.
- The owner supplies external credentials, domain/DNS access, production account approvals, and payment-provider credentials when ready.
- Build work proceeds in the sequence defined by `IMPLEMENTATION_SEQUENCE.md`.
- Every implementation change must maintain requirements-to-tests traceability.
- Production launch requires the owner-controlled gates in `/docs/23-delivery-planning/production-launch-criteria.md`.

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


## Repository Use

1. Commit this repository to GitHub.
2. Keep documentation and implementation in the same repository or preserve exact paths.
3. Configure branch protection and non-production agent credentials.
4. Assign one task at a time from `/implementation/tasks`.
5. Review each agent completion report and pull request.
6. Supply environment values only through deployment secret stores.
7. Do not enable billing or external writeback until their approval tasks pass.
8. Complete staging, security, backup, marketplace, SEO, and launch gates before production.

## Technology Baseline

TypeScript monorepo; Next.js 16 App Router; Node.js 24 LTS; PostgreSQL 17+; Drizzle; Better Auth; pg-boss; S3-compatible storage; SMTP; PostgreSQL full-text search; first-party analytics; optional Turnstile; optional disabled Stripe adapter; optional local-model adapter.

## Cost Position

No paid AI API is required. The architecture deliberately avoids mandatory paid queues, search, analytics, identity, CMS, workflow, and enrichment services. Real commercial production still incurs infrastructure costs for compute, database, storage, backups, bandwidth, and email; the system enforces hard ceilings and never purchases automatic overage.

## Specification Inventory

| Section | Markdown documents |
|---|---:|
| `AGENTS.md` | 1 |
| `CHANGELOG.md` | 1 |
| `CLAUDE.md` | 1 |
| `CODEX.md` | 1 |
| `COST_GUARDRAILS.md` | 1 |
| `DECISION_LOG.md` | 1 |
| `DEPENDENCY_GRAPH.md` | 1 |
| `DEPLOYMENT_PROFILES.md` | 1 |
| `DOCUMENTATION_MANIFEST.md` | 1 |
| `DOCUMENT_OWNERSHIP.md` | 1 |
| `ENVIRONMENT_VARIABLE_CATALOG.md` | 1 |
| `EXTERNAL_SOURCE_REGISTER.md` | 1 |
| `FILE_INVENTORY.md` | 1 |
| `GLOSSARY.md` | 1 |
| `IMPLEMENTATION_BASELINE.md` | 1 |
| `IMPLEMENTATION_SEQUENCE.md` | 1 |
| `IMPLEMENTATION_STATUS.md` | 1 |
| `OPEN_EXTERNAL_DEPENDENCIES.md` | 1 |
| `QUALITY_REPORT.md` | 1 |
| `README.md` | 1 |
| `REQUIREMENTS_TRACEABILITY_MATRIX.md` | 1 |
| `SPECIFICATION_COVERAGE_MATRIX.md` | 1 |
| `THIRD_PARTY_DEPENDENCY_REGISTER.md` | 1 |
| `docs/00-governance` | 44 |
| `docs/01-opportunity-and-strategy` | 39 |
| `docs/02-users-personas-and-jobs` | 27 |
| `docs/03-domain-model` | 42 |
| `docs/04-system-architecture` | 67 |
| `docs/05-integrations` | 106 |
| `docs/06-security-privacy-and-compliance` | 73 |
| `docs/07-data-architecture` | 194 |
| `docs/08-api-and-contracts` | 99 |
| `docs/09-product-information-architecture` | 23 |
| `docs/10-design-system-and-ux` | 134 |
| `docs/11-page-specifications` | 233 |
| `docs/12-feature-specifications` | 116 |
| `docs/13-rules-validators-and-algorithms` | 168 |
| `docs/14-ai-and-intelligence` | 39 |
| `docs/15-seo-and-public-content-platform` | 55 |
| `docs/16-analytics-experimentation-and-data-science` | 42 |
| `docs/17-billing-packaging-and-entitlements` | 41 |
| `docs/18-notifications-and-communications` | 21 |
| `docs/19-testing-and-quality-assurance` | 59 |
| `docs/20-devops-sre-and-platform-engineering` | 113 |
| `docs/21-customer-support-and-operations` | 20 |
| `docs/22-legal-and-public-policy-specifications` | 20 |
| `docs/23-delivery-planning` | 31 |
| `docs/24-future-expansion` | 34 |
| `docs/25-architecture-decisions` | 50 |
| `implementation` | 117 |

## Authority and Approval

Documents marked Approved for Implementation authorize code within their scope. They do not authorize production credentials, marketplace submission, legal publication, external writeback, payment collection, DNS changes, or production deployment without owner action.

## Revision History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Initial implementation-authority specification. | Feed Doctor architecture baseline |
