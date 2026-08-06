---
document_id: FD-GOV-023
title: "Document Identifier Convention"
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

# Document Identifier Convention

## Purpose

Define stable identifiers for every specification artifact independent of path or title.

## Scope

All root documents, specifications, templates, generated families, ADRs, RFCs, and runbooks.

## Dependencies

- DOCUMENTATION_MANIFEST.md

## Inputs

- Document family
- Domain
- Sequence
- Generated-instance key

## Outputs

- Canonical document IDs

## Functional Requirements

- `FD-GOV-023-FR-001` — Document IDs SHALL use `FD-{FAMILY}-{NNN}` for manually maintained documents.
- `FD-GOV-023-FR-002` — Generated instance documents SHALL use a stable registry-derived suffix.
- `FD-GOV-023-FR-003` — ADRs SHALL use `FD-ADR-NNN`; RFCs SHALL use `FD-RFC-NNN`.
- `FD-GOV-023-FR-004` — Document IDs SHALL not encode mutable file paths, owners, or statuses.
- `FD-GOV-023-FR-005` — IDs SHALL never be reused.
- `FD-GOV-023-FR-006` — Renaming or moving a file SHALL not change its document ID.

## Non-functional Requirements

- `FD-GOV-023-NFR-001` — Identifiers must remain human-readable and automation-safe.

## Data Requirements

- `FD-GOV-023-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-023-VAL-001` — Every Markdown specification must contain exactly one unique document ID.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-023-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-023-ERR-001` — Missing, duplicate, or mutable IDs fail CI.

## Success States

- `FD-GOV-023-STATE-002` — References survive repository restructuring.

## Edge Cases

- Split document.
- Merged documents.
- Generated issue renamed upstream.

## Accessibility

- `FD-GOV-023-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-023-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-023-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-023-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-023-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-023-TEST-001` — Repository-wide ID uniqueness test.
- `FD-GOV-023-TEST-002` — Manifest consistency test.

## Acceptance Criteria

- `FD-GOV-023-AC-001` — All files have stable IDs.
- `FD-GOV-023-AC-002` — No path-derived identity is required.
- `FD-GOV-023-AC-003` — Superseded IDs remain reserved.

## Related Documents

- requirements-id-convention.md
- DOCUMENTATION_MANIFEST.md

## Open External Dependencies

- `FD-GOV-023-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
