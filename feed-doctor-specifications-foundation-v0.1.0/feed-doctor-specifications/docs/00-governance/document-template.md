---
document_id: FD-GOV-003
title: "General Document Template"
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

# General Document Template

## Purpose

Define the minimum structure for internal specifications that do not have a more specific template.

## Scope

All repository documents except index-only generated registries with separately approved schemas.

## Dependencies

- documentation-charter.md
- document-id-convention.md
- normative-language-standard.md

## Inputs

- Document purpose
- Scope boundaries
- Dependencies
- Requirements
- Acceptance criteria

## Outputs

- A complete, reviewable Markdown specification

## Functional Requirements

- `FD-GOV-003-FR-001` — Front matter SHALL include document ID, title, status, semantic version, owner role, reviewers, classification, last review date, and next review date.
- `FD-GOV-003-FR-002` — The body SHALL contain every repository-mandated section.
- `FD-GOV-003-FR-003` — Non-applicable sections SHALL state why they are not applicable.
- `FD-GOV-003-FR-004` — Every normative statement SHALL use approved normative language.
- `FD-GOV-003-FR-005` — Every cross-reference SHALL identify an authoritative document path or ID.
- `FD-GOV-003-FR-006` — Every acceptance criterion SHALL be objectively verifiable.

## Non-functional Requirements

- `FD-GOV-003-NFR-001` — Documents must remain readable as raw Markdown and rendered HTML.

## Data Requirements

- `FD-GOV-003-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-003-VAL-001` — Missing front matter or mandatory sections fail lint.
- `FD-GOV-003-VAL-002` — Placeholder text is forbidden in Approved Baseline documents.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-003-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-003-ERR-001` — Broken references, duplicate IDs, and ambiguous acceptance criteria prevent approval.

## Success States

- `FD-GOV-003-STATE-002` — The document can be reviewed without hidden context.

## Edge Cases

- Index documents.
- Generated documents.
- Restricted security appendices.
- Documents with no runtime behavior.

## Accessibility

- `FD-GOV-003-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-003-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-003-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-003-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-003-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-003-TEST-001` — Template conformance lint.
- `FD-GOV-003-TEST-002` — Manual review against completeness checklist.

## Acceptance Criteria

- `FD-GOV-003-AC-001` — Template includes all mandatory sections.
- `FD-GOV-003-AC-002` — Approved documents contain no unresolved placeholders.
- `FD-GOV-003-AC-003` — Metadata matches manifest.

## Related Documents

- specification-completeness-checklist.md
- cross-reference-policy.md

## Open External Dependencies

- `FD-GOV-003-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
