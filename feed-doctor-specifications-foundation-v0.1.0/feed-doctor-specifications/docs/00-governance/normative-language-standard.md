---
document_id: FD-GOV-027
title: "Normative Language Standard"
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

# Normative Language Standard

## Purpose

Define binding meanings for requirement keywords so specifications are testable and consistently interpreted.

## Scope

All normative repository content.

## Dependencies

- requirements-id-convention.md
- terminology-and-language-standard.md

## Inputs

- Requirement intent
- Risk level
- Optionality

## Outputs

- Standardized normative statements

## Functional Requirements

- `FD-GOV-027-FR-001` — `SHALL` means mandatory for compliance.
- `FD-GOV-027-FR-002` — `SHALL NOT` means prohibited.
- `FD-GOV-027-FR-003` — `SHOULD` means expected unless a documented, approved reason justifies deviation.
- `FD-GOV-027-FR-004` — `SHOULD NOT` means discouraged unless a documented, approved reason justifies use.
- `FD-GOV-027-FR-005` — `MAY` means optional and does not create interoperability expectations unless specified.
- `FD-GOV-027-FR-006` — `WILL` describes a planned fact and SHALL NOT substitute for a requirement.
- `FD-GOV-027-FR-007` — Every SHALL and SHALL NOT statement SHALL carry a requirement ID.
- `FD-GOV-027-FR-008` — Requirements SHALL contain one independently verifiable obligation whenever practical.

## Non-functional Requirements

- `FD-GOV-027-NFR-001` — Normative statements must be concise and unambiguous.

## Data Requirements

- `FD-GOV-027-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-027-VAL-001` — Lowercase casual uses of must, should, required, never, and always are linted when they appear to create obligations.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-027-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-027-ERR-001` — Ambiguous obligation strength blocks approval.

## Success States

- `FD-GOV-027-STATE-002` — Implementers and testers agree on which behavior is mandatory.

## Edge Cases

- Quoted vendor requirement.
- Legal text.
- Examples that are not normative.

## Accessibility

- `FD-GOV-027-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-027-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-027-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-027-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-027-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-027-TEST-001` — Normative keyword lint.
- `FD-GOV-027-TEST-002` — Requirement ID pairing test.

## Acceptance Criteria

- `FD-GOV-027-AC-001` — Keyword meanings are explicit.
- `FD-GOV-027-AC-002` — Normative statements are traceable.
- `FD-GOV-027-AC-003` — Examples are clearly non-normative.

## Related Documents

- requirements-id-convention.md
- specification-lint-rules.md

## Open External Dependencies

- `FD-GOV-027-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
