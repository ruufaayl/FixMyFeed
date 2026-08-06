---
document_id: FD-GOV-008
title: "API Contract Template"
status: "Draft Complete"
version: "1.0.0"
owner: "Documentation Architecture"
reviewers:
  - Product Architecture
  - Security Architecture
  - Quality Engineering
classification: "Internal"
last_reviewed: "2026-08-06"
next_review_due: "2026-11-06"
---

# API Contract Template

## Purpose

Define complete HTTP or RPC contracts including semantics, authorization, validation, concurrency, errors, observability, and lifecycle.

## Scope

Public, partner, internal, and administrative synchronous APIs.

## Dependencies

- docs/08-api-and-contracts/API-style-guide.md
- requirements-id-convention.md
- security-control-template.md

## Inputs

- Operation objective
- Actor
- Resource model
- Request schema
- Response schema

## Outputs

- Versioned API operation contract

## Functional Requirements

- `FD-GOV-008-FR-001` — Each operation SHALL define method, path or procedure, authentication, authorization, tenant scope, request schema, response schema, status codes, error codes, idempotency, rate limit, pagination, filtering, sorting, and field expansion.
- `FD-GOV-008-FR-002` — Validation SHALL distinguish syntax, semantic, authorization, conflict, quota, and upstream errors.
- `FD-GOV-008-FR-003` — Mutations SHALL define concurrency control and duplicate-request behavior.
- `FD-GOV-008-FR-004` — Asynchronous operations SHALL return durable operation identifiers and polling or callback semantics.
- `FD-GOV-008-FR-005` — Sensitive fields SHALL define redaction behavior.
- `FD-GOV-008-FR-006` — Deprecation and compatibility guarantees SHALL be explicit.

## Non-functional Requirements

- `FD-GOV-008-NFR-001` — Latency and availability SLOs must be measurable per operation class.

## Data Requirements

- `FD-GOV-008-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-008-VAL-001` — Schemas must be machine-validatable.
- `FD-GOV-008-VAL-002` — Undocumented response fields are prohibited for public contracts.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-008-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-008-ERR-001` — Ambiguous error semantics, missing authorization, and unsafe retries block approval.

## Success States

- `FD-GOV-008-STATE-002` — A client can implement against the contract without inspecting server code.

## Edge Cases

- Partial bulk success.
- Client retry after timeout.
- Resource deleted between read and update.
- Upstream throttling.

## Accessibility

- `FD-GOV-008-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-008-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-008-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-008-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-008-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-008-TEST-001` — Schema contract tests.
- `FD-GOV-008-TEST-002` — Authorization matrix tests.
- `FD-GOV-008-TEST-003` — Idempotency and concurrency tests.

## Acceptance Criteria

- `FD-GOV-008-AC-001` — All request and response states are documented.
- `FD-GOV-008-AC-002` — Every error code has remediation guidance.
- `FD-GOV-008-AC-003` — Compatibility policy is explicit.

## Related Documents

- event-contract-template.md
- webhook-contract-template.md
- docs/08-api-and-contracts/API-error-model.md

## Open External Dependencies

- `FD-GOV-008-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
