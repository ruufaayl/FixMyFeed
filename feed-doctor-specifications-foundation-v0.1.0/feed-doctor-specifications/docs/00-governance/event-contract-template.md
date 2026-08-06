---
document_id: FD-GOV-009
title: "Event Contract Template"
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

# Event Contract Template

## Purpose

Define immutable asynchronous domain and integration events.

## Scope

Internal event bus messages, integration notifications, audit-derived events, and analytics-adjacent operational events.

## Dependencies

- docs/08-api-and-contracts/event-contracts/event-envelope.md
- api-contract-template.md

## Inputs

- Event trigger
- Producer
- Consumer set
- Payload schema
- Delivery semantics

## Outputs

- Versioned event contract

## Functional Requirements

- `FD-GOV-009-FR-001` — Events SHALL define name, version, producer, trigger, tenant scope, aggregate identity, timestamp, correlation, causation, idempotency key, schema, ordering expectations, retention, and sensitive-data classification.
- `FD-GOV-009-FR-002` — Consumers SHALL tolerate duplicate delivery unless exactly-once processing is proven by design.
- `FD-GOV-009-FR-003` — Breaking schema changes SHALL create a new major event version.
- `FD-GOV-009-FR-004` — Events SHALL describe whether they represent facts, commands, or integration observations.
- `FD-GOV-009-FR-005` — Replay behavior and side-effect protections SHALL be explicit.

## Non-functional Requirements

- `FD-GOV-009-NFR-001` — Event size, throughput, lag, and retention targets must be defined.

## Data Requirements

- `FD-GOV-009-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-009-VAL-001` — Payloads must validate against the registered schema.
- `FD-GOV-009-VAL-002` — Producers may not emit undocumented enum values in a stable version.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-009-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-009-ERR-001` — Poison messages, schema mismatch, consumer lag, and replay failure require documented handling.

## Success States

- `FD-GOV-009-STATE-002` — Independent services can consume events safely without producer implementation knowledge.

## Edge Cases

- Late events.
- Out-of-order events.
- Tenant deletion before replay.
- Sensitive data retention expiry.

## Accessibility

- `FD-GOV-009-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-009-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-009-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-009-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-009-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-009-TEST-001` — Producer schema test.
- `FD-GOV-009-TEST-002` — Consumer compatibility test.
- `FD-GOV-009-TEST-003` — Duplicate and out-of-order delivery test.

## Acceptance Criteria

- `FD-GOV-009-AC-001` — Envelope and payload are complete.
- `FD-GOV-009-AC-002` — Delivery semantics are explicit.
- `FD-GOV-009-AC-003` — Replay safety is verified.

## Related Documents

- webhook-contract-template.md
- docs/04-system-architecture/event-delivery-semantics.md

## Open External Dependencies

- `FD-GOV-009-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
