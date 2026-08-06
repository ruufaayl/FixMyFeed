---
document_id: FD-ROOT-007
title: "Decision Log"
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

# Decision Log

## Purpose

Index all material product, architecture, security, data, UX, operational, and documentation decisions.

## Scope

Decisions that constrain future implementation or reverse a prior assumption.

## Dependencies

- docs/25-architecture-decisions/README.md
- docs/00-governance/adr-template.md
- docs/00-governance/rfc-template.md

## Inputs

- Approved ADRs
- Approved RFCs
- Product council decisions
- Security exceptions

## Outputs

- Chronological decision index with status and supersession history

## Functional Requirements

- `FD-ROOT-007-FR-001` — Each material decision must have an immutable ID, date, owner, status, rationale, alternatives, and affected documents.
- `FD-ROOT-007-FR-002` — Reversed decisions must remain visible and reference superseding decisions.
- `FD-ROOT-007-FR-003` — Temporary decisions must include expiry and reevaluation trigger.
- `FD-ROOT-007-FR-004` — Decision records must distinguish irreversible, expensive-to-reverse, and reversible choices.

## Non-functional Requirements

- `FD-ROOT-007-NFR-001` — The log must be append-oriented and audit-friendly.

## Data Requirements

- `FD-ROOT-007-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-ROOT-007-VAL-001` — Every decision ID must be unique.
- `FD-ROOT-007-VAL-002` — Superseded decisions must name a successor.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-ROOT-007-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-ROOT-007-ERR-001` — Unrecorded contradictory decisions are specification defects.

## Success States

- `FD-ROOT-007-STATE-002` — Teams can understand why a constraint exists and whether it remains active.

## Edge Cases

- Emergency decisions made during incidents.
- One decision supersedes several prior records.
- An external platform forces a temporary workaround.

## Accessibility

- `FD-ROOT-007-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-ROOT-007-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-ROOT-007-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-ROOT-007-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-ROOT-007-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-ROOT-007-TEST-001` — CI verifies referenced ADR/RFC paths.
- `FD-ROOT-007-TEST-002` — Quarterly stale temporary-decision review.

## Acceptance Criteria

- `FD-ROOT-007-AC-001` — Every approved ADR and RFC is indexed.
- `FD-ROOT-007-AC-002` — Superseded decisions remain traceable.
- `FD-ROOT-007-AC-003` — Temporary decisions are not left without review dates.

## Related Documents

- CHANGELOG.md
- docs/00-governance/change-control-process.md

## Open External Dependencies

- `FD-ROOT-007-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
