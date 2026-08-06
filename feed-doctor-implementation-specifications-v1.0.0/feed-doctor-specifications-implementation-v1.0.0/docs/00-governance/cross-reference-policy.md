---
document_id: FD-GOV-025
title: "Cross-Reference Policy"
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

# Cross-Reference Policy

## Purpose

Define how documents reference authoritative requirements, contracts, tables, pages, algorithms, tests, and external sources.

## Scope

All internal and external references in the repository.

## Dependencies

- DEPENDENCY_GRAPH.md
- document-id-convention.md

## Inputs

- Target document IDs
- Paths
- Requirement IDs
- Relationship type

## Outputs

- Stable, typed cross-references

## Functional Requirements

- `FD-GOV-025-FR-001` — Normative references SHALL use document IDs and paths.
- `FD-GOV-025-FR-002` — References to a specific rule SHALL include the requirement ID.
- `FD-GOV-025-FR-003` — Every Related Documents section SHALL distinguish dependency from informational context where ambiguity exists.
- `FD-GOV-025-FR-004` — Generated references SHALL use stable registry IDs.
- `FD-GOV-025-FR-005` — External links SHALL reference registered source IDs where the claim affects behavior.
- `FD-GOV-025-FR-006` — Broken links SHALL block approval.

## Non-functional Requirements

- `FD-GOV-025-NFR-001` — References must remain valid after path refactoring through automated update tooling.

## Data Requirements

- `FD-GOV-025-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-025-VAL-001` — Referenced IDs and paths must resolve.
- `FD-GOV-025-VAL-002` — Reference type must match target type where specified.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-025-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-025-ERR-001` — Circular blocking references and dangling normative references fail CI.

## Success States

- `FD-GOV-025-STATE-002` — Readers can navigate from requirement to all related contracts and tests.

## Edge Cases

- Restricted document.
- External source removed.
- Document split.

## Accessibility

- `FD-GOV-025-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-025-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-025-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-025-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-025-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-025-TEST-001` — Link checker.
- `FD-GOV-025-TEST-002` — ID resolution test.
- `FD-GOV-025-TEST-003` — Dependency graph consistency test.

## Acceptance Criteria

- `FD-GOV-025-AC-001` — All normative references resolve.
- `FD-GOV-025-AC-002` — Dependency types are visible.
- `FD-GOV-025-AC-003` — No plain-text unresolvable references remain.

## Related Documents

- DEPENDENCY_GRAPH.md
- citation-and-evidence-policy.md

## Open External Dependencies

- `FD-GOV-025-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
