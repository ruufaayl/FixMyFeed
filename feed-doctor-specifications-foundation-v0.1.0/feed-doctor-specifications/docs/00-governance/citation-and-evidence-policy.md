---
document_id: FD-GOV-026
title: "Citation and Evidence Policy"
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

# Citation and Evidence Policy

## Purpose

Ensure external facts, policies, standards, market assertions, and implementation constraints are supported by appropriate evidence.

## Scope

All externally verifiable claims and production evidence references.

## Dependencies

- EXTERNAL_SOURCE_REGISTER.md
- external-dependency-policy.md

## Inputs

- Claim
- Source
- Authority level
- Retrieval date
- Freshness risk

## Outputs

- Traceable citations and evidence classifications

## Functional Requirements

- `FD-GOV-026-FR-001` — API, policy, legal, security, and standards claims SHALL use primary authoritative sources where available.
- `FD-GOV-026-FR-002` — Third-party estimates SHALL be labeled estimates and SHALL NOT be represented as first-party fact.
- `FD-GOV-026-FR-003` — Mutable claims SHALL include retrieval date and refresh cadence.
- `FD-GOV-026-FR-004` — One citation SHALL support only claims actually contained in the source.
- `FD-GOV-026-FR-005` — Generated or AI-assisted prose SHALL not introduce uncited external claims.
- `FD-GOV-026-FR-006` — Production evidence SHALL include environment, time window, query or test identity, and retention location.

## Non-functional Requirements

- `FD-GOV-026-NFR-001` — Evidence records must be reviewable without dependence on a contributor's local environment.

## Data Requirements

- `FD-GOV-026-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-026-VAL-001` — Unsupported mutable claims block approval.
- `FD-GOV-026-VAL-002` — Stale critical sources mark dependent documents for review.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-026-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-026-ERR-001` — Conflicting sources require explicit analysis, not selective omission.

## Success States

- `FD-GOV-026-STATE-002` — Reviewers can verify why each externally constrained requirement exists.

## Edge Cases

- Official docs are wrong or incomplete.
- Vendor docs have no version history.
- Law differs by jurisdiction.
- Source access requires authentication.

## Accessibility

- `FD-GOV-026-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-026-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-026-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-026-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-026-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-026-TEST-001` — Source freshness audit.
- `FD-GOV-026-TEST-002` — Citation-to-claim sampling review.

## Acceptance Criteria

- `FD-GOV-026-AC-001` — Claims are source-backed.
- `FD-GOV-026-AC-002` — Authority level is explicit.
- `FD-GOV-026-AC-003` — Refresh ownership exists.

## Related Documents

- EXTERNAL_SOURCE_REGISTER.md
- OPEN_EXTERNAL_DEPENDENCIES.md

## Open External Dependencies

- `FD-GOV-026-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
