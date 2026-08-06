---
document_id: FD-GOV-000
title: "Documentation Governance"
status: "Draft Complete"
version: "1.0.0"
owner: "Architecture Council"
reviewers:
  - Product Architecture
  - Security Architecture
  - Quality Engineering
classification: "Internal"
last_reviewed: "2026-08-06"
next_review_due: "2026-11-06"
---

# Documentation Governance

## Purpose

This directory defines how Feed Doctor specifications are authored, reviewed, approved, versioned, cross-referenced, tested, deprecated, and converted into implementation authority.

## Governance Principle

Documentation is part of the production system. A defect in a normative specification is treated as an engineering defect because it can cause inconsistent implementations, unsafe repair behavior, security gaps, test ambiguity, or operational failure.

## Required Governance Flow

1. Identify or create the authoritative document.
2. Assign stable document and requirement identifiers.
3. Write all mandatory sections.
4. Register dependencies and ownership.
5. Resolve contradictions and external uncertainties.
6. Complete domain reviews.
7. Run documentation lint and traceability checks.
8. Approve a versioned baseline.
9. Implement against that baseline.
10. Record divergences, evidence, and subsequent changes.

## Directory Index

This directory contains templates for each specification type, rules for normative language and citations, review and change processes, completeness checklists, definitions of done, and the documentation RACI.

## Mandatory Rule

No local team convention may override this directory without an approved RFC and an explicit update to the affected governance document.

## Purpose

Index and govern the standards used to author and approve Feed Doctor specifications.

## Scope

The documentation governance directory.

## Dependencies

- documentation-charter.md
- source-of-truth-hierarchy.md

## Inputs

- Governance documents
- Repository quality objectives

## Outputs

- Governance index
- Mandatory authoring flow

## Functional Requirements

- `FD-GOV-000-FR-001` — This document SHALL remain consistent with its declared purpose and scope.
- `FD-GOV-000-FR-002` — References SHALL use canonical repository paths and document identifiers.

## Non-functional Requirements

- `FD-GOV-000-NFR-001` — The document SHALL remain readable in raw Markdown and rendered form.

## Data Requirements

- `FD-GOV-000-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-000-VAL-001` — All listed paths and identifiers SHALL be validated during repository lint.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-000-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-000-ERR-001` — Broken references or contradictory statements SHALL block approval.

## Success States

- `FD-GOV-000-STATE-001` — The document is successful when its intended audience can use it without hidden context.

## Edge Cases

- A referenced document is planned but not yet materialized.
- A document is moved without updating its path.
- A generated family contains no instances yet.

## Accessibility

- `FD-GOV-000-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-000-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-000-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-000-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-000-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-000-TEST-001` — CI SHALL validate structure, metadata, and references.

## Acceptance Criteria

- `FD-GOV-000-AC-001` — Mandatory sections are present.
- `FD-GOV-000-AC-002` — References resolve or are explicitly registered as planned dependencies.

## Related Documents

- specification-completeness-checklist.md
- documentation-raci.md

## Open External Dependencies

- `FD-GOV-000-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
