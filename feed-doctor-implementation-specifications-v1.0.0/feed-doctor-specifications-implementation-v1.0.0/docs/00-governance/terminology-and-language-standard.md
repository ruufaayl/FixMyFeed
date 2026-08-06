---
document_id: FD-GOV-024
title: "Terminology and Language Standard"
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

# Terminology and Language Standard

## Purpose

Ensure specifications use precise, consistent, inclusive, implementation-neutral language.

## Scope

All repository prose, diagrams, tables, UI copy requirements, API names, and generated content.

## Dependencies

- GLOSSARY.md
- normative-language-standard.md

## Inputs

- Canonical glossary
- Domain language
- External platform terminology

## Outputs

- Language rules and prohibited ambiguity patterns

## Functional Requirements

- `FD-GOV-024-FR-001` — Canonical glossary terms SHALL be used consistently.
- `FD-GOV-024-FR-002` — Pronouns or vague referents such as it, this, that, or they SHALL NOT be used when multiple entities are possible.
- `FD-GOV-024-FR-003` — Words such as fast, scalable, secure, intuitive, soon, generally, normal, and reasonable SHALL be replaced by measurable definitions.
- `FD-GOV-024-FR-004` — External vendor terminology SHALL be qualified when it does not equal an internal concept.
- `FD-GOV-024-FR-005` — User-facing language SHALL avoid blame and explain recovery.
- `FD-GOV-024-FR-006` — Specifications SHALL distinguish product, variant, feed item, source record, destination product, issue definition, and issue instance.

## Non-functional Requirements

- `FD-GOV-024-NFR-001` — Language must remain understandable to cross-functional senior staff.

## Data Requirements

- `FD-GOV-024-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-024-VAL-001` — Ambiguous banned terms require quantified or scoped replacements.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-024-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-024-ERR-001` — Terminology conflicts are resolved through the glossary process.

## Success States

- `FD-GOV-024-STATE-002` — Independent readers interpret requirements consistently.

## Edge Cases

- Quoted external language.
- Legal wording.
- Localized UI labels.

## Accessibility

- `FD-GOV-024-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-024-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-024-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-024-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-024-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-024-TEST-001` — Terminology lint.
- `FD-GOV-024-TEST-002` — Editorial ambiguity review.

## Acceptance Criteria

- `FD-GOV-024-AC-001` — High-risk ambiguous terms are prohibited.
- `FD-GOV-024-AC-002` — External terms are mapped.
- `FD-GOV-024-AC-003` — Glossary remains authoritative.

## Related Documents

- GLOSSARY.md
- citation-and-evidence-policy.md

## Open External Dependencies

- `FD-GOV-024-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
