---
document_id: FD-GOV-022
title: "Requirements Identifier Convention"
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

# Requirements Identifier Convention

## Purpose

Define stable, unique identifiers for normative requirements and verification evidence.

## Scope

All SHALL, SHALL NOT, SHOULD, SHOULD NOT, and MAY statements that affect implementation or operation.

## Dependencies

- document-id-convention.md
- REQUIREMENTS_TRACEABILITY_MATRIX.md

## Inputs

- Document ID
- Requirement type
- Sequence number
- Lifecycle state

## Outputs

- Canonical requirement identifiers

## Functional Requirements

- `FD-GOV-022-FR-001` — Requirement IDs SHALL use `FD-{DOMAIN}-{DOCUMENT}-{TYPE}-{NNN}`.
- `FD-GOV-022-FR-002` — TYPE SHALL be one of FR, NFR, DATA, VAL, ERR, STATE, A11Y, PERF, SEC, PRIV, ANALYTICS, SEO, OBS, TEST, AC, or OPS.
- `FD-GOV-022-FR-003` — Identifiers SHALL never be reused after deletion.
- `FD-GOV-022-FR-004` — Moved requirements SHALL retain IDs and update source location.
- `FD-GOV-022-FR-005` — Split requirements SHALL retain the original for one successor and create new IDs for additional successors with trace links.
- `FD-GOV-022-FR-006` — Normative statements embedded in tables SHALL also have IDs.

## Non-functional Requirements

- `FD-GOV-022-NFR-001` — IDs must remain stable across file moves and formatting changes.

## Data Requirements

- `FD-GOV-022-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-022-VAL-001` — Duplicate or malformed IDs fail CI.
- `FD-GOV-022-VAL-002` — Every SHALL or SHALL NOT must have an ID.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-022-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-022-ERR-001` — Unidentified normative text is non-traceable and blocks approval.

## Success States

- `FD-GOV-022-STATE-002` — Any requirement can be uniquely referenced across code, tests, incidents, and releases.

## Edge Cases

- Generated issue specifications.
- One requirement applies to a family of pages.
- Requirement is jurisdiction-specific.

## Accessibility

- `FD-GOV-022-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-022-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-022-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-022-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-022-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-022-TEST-001` — Regex validation.
- `FD-GOV-022-TEST-002` — Uniqueness check.
- `FD-GOV-022-TEST-003` — Normative-language-to-ID lint.

## Acceptance Criteria

- `FD-GOV-022-AC-001` — Format is unambiguous.
- `FD-GOV-022-AC-002` — IDs are immutable.
- `FD-GOV-022-AC-003` — Traceability system accepts all IDs.

## Related Documents

- REQUIREMENTS_TRACEABILITY_MATRIX.md
- normative-language-standard.md

## Open External Dependencies

- `FD-GOV-022-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
