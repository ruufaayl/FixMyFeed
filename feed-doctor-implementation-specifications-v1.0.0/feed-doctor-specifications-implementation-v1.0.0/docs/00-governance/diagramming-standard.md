---
document_id: FD-GOV-028
title: "Diagramming Standard"
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

# Diagramming Standard

## Purpose

Standardize architecture, sequence, state, data-flow, entity, and trust-boundary diagrams.

## Scope

All diagrams embedded in or referenced by specifications.

## Dependencies

- cross-reference-policy.md
- source-of-truth-hierarchy.md

## Inputs

- Diagram objective
- Entities
- Relationships
- Boundaries
- Legend

## Outputs

- Version-controlled, accessible diagrams

## Functional Requirements

- `FD-GOV-028-FR-001` — Each diagram SHALL have a title, purpose, scope, legend, source definition, and last-reviewed version.
- `FD-GOV-028-FR-002` — Textual source SHALL be stored in the repository where possible.
- `FD-GOV-028-FR-003` — Diagrams SHALL identify tenant, trust, network, service, data, and external boundaries when relevant.
- `FD-GOV-028-FR-004` — Sequence diagrams SHALL show actor, request, response, asynchronous events, retries, and failure paths.
- `FD-GOV-028-FR-005` — State diagrams SHALL match a normative transition table.
- `FD-GOV-028-FR-006` — Color SHALL NOT be the sole carrier of meaning.

## Non-functional Requirements

- `FD-GOV-028-NFR-001` — Diagrams must remain legible in grayscale and at common documentation widths.

## Data Requirements

- `FD-GOV-028-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-028-VAL-001` — Diagram nodes and labels must use canonical glossary terms.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-028-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-028-ERR-001` — A diagram conflicting with prose is resolved according to source-of-truth hierarchy and must be corrected.

## Success States

- `FD-GOV-028-STATE-002` — Diagrams accelerate understanding without becoming an alternate undocumented specification.

## Edge Cases

- Very large system maps.
- Restricted trust-boundary details.
- Generated diagrams.

## Accessibility

- `FD-GOV-028-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-028-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-028-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-028-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-028-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-028-TEST-001` — Accessibility review.
- `FD-GOV-028-TEST-002` — Diagram-to-transition-table consistency review.

## Acceptance Criteria

- `FD-GOV-028-AC-001` — Every diagram is source-controlled.
- `FD-GOV-028-AC-002` — Legends and boundaries are explicit.
- `FD-GOV-028-AC-003` — Critical diagrams have textual equivalents.

## Related Documents

- source-of-truth-hierarchy.md
- docs/04-system-architecture/system-context.md

## Open External Dependencies

- `FD-GOV-028-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
