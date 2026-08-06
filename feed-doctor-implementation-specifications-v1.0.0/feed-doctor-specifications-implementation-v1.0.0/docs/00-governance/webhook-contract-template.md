---
document_id: FD-GOV-010
title: "Webhook Contract Template"
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

# Webhook Contract Template

## Purpose

Specify outbound and inbound webhooks with security, retries, ordering, signatures, and operational visibility.

## Scope

Customer webhooks and platform integration webhooks.

## Dependencies

- event-contract-template.md
- docs/08-api-and-contracts/webhook-contracts/webhook-signing.md

## Inputs

- Webhook event
- Endpoint ownership
- Payload
- Signing requirements

## Outputs

- Versioned webhook delivery contract

## Functional Requirements

- `FD-GOV-010-FR-001` — Webhooks SHALL define event type, payload version, signature algorithm, timestamp tolerance, delivery identifier, retry schedule, timeout, redirect behavior, ordering guarantee, duplicate behavior, and disablement policy.
- `FD-GOV-010-FR-002` — Receivers SHALL be able to verify authenticity without shared application state beyond the secret.
- `FD-GOV-010-FR-003` — Sensitive payload fields SHALL be minimized.
- `FD-GOV-010-FR-004` — Delivery attempts and terminal failures SHALL be observable.
- `FD-GOV-010-FR-005` — Endpoint rotation and secret rotation SHALL not require downtime.

## Non-functional Requirements

- `FD-GOV-010-NFR-001` — Webhook delivery SLO and maximum payload size must be specified.

## Data Requirements

- `FD-GOV-010-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-010-VAL-001` — Invalid signatures and stale timestamps must be rejected.
- `FD-GOV-010-VAL-002` — Endpoint URLs must pass SSRF protections.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-010-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-010-ERR-001` — Timeout, non-2xx response, TLS failure, DNS failure, and signature configuration failure require distinct statuses.

## Success States

- `FD-GOV-010-STATE-002` — Integrators can build reliable receivers and diagnose delivery failures.

## Edge Cases

- Receiver returns 202.
- Endpoint redirects.
- Secret rotates during retries.
- Receiver processes but response is lost.

## Accessibility

- `FD-GOV-010-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-010-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-010-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-010-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-010-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-010-TEST-001` — Signature vectors.
- `FD-GOV-010-TEST-002` — Retry schedule test.
- `FD-GOV-010-TEST-003` — Duplicate delivery test.
- `FD-GOV-010-TEST-004` — SSRF validation test.

## Acceptance Criteria

- `FD-GOV-010-AC-001` — Security and retry behavior are exhaustive.
- `FD-GOV-010-AC-002` — Dashboard observability requirements are referenced.
- `FD-GOV-010-AC-003` — Payload schema is versioned.

## Related Documents

- security-control-template.md
- docs/06-security-privacy-and-compliance/webhook-security.md

## Open External Dependencies

- `FD-GOV-010-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
