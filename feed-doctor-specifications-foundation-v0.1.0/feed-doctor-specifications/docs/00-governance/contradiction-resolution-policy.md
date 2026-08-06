---
document_id: FD-GOV-035
title: "Contradiction Resolution Policy"
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

# Contradiction Resolution Policy

## Purpose

Define detection, escalation, and resolution of conflicting requirements or observed behavior.

## Scope

Conflicts within one document, across documents, with external sources, or between specification and production.

## Dependencies

- source-of-truth-hierarchy.md
- DECISION_LOG.md
- change-control-process.md

## Inputs

- Conflicting statements
- Source levels
- Affected implementations
- Risk

## Outputs

- Resolved authoritative behavior and correction plan

## Functional Requirements

- `FD-GOV-035-FR-001` — Contradictions SHALL be logged immediately with affected document IDs and requirements.
- `FD-GOV-035-FR-002` — Implementation SHALL pause for blocking contradictions unless an emergency safe-state procedure applies.
- `FD-GOV-035-FR-003` — Resolution SHALL follow source-of-truth hierarchy.
- `FD-GOV-035-FR-004` — Equal-level contradictions SHALL be decided by the accountable domain owner with required cross-domain reviewers.
- `FD-GOV-035-FR-005` — Production divergence SHALL trigger either implementation correction or a formally approved specification change.
- `FD-GOV-035-FR-006` — Resolved contradictions SHALL update all affected documents and traceability records.

## Non-functional Requirements

- `FD-GOV-035-NFR-001` — Critical contradictions must have expedited review paths.

## Data Requirements

- `FD-GOV-035-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-035-VAL-001` — A contradiction is not closed until all dependent artifacts agree.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-035-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-035-ERR-001` — Local workaround without repository correction is prohibited.

## Success States

- `FD-GOV-035-STATE-002` — One authoritative behavior remains and downstream artifacts are consistent.

## Edge Cases

- Customer contract conflicts with general behavior.
- Regional law conflict.
- Observed vendor behavior differs by account.

## Accessibility

- `FD-GOV-035-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-035-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-035-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-035-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-035-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-035-TEST-001` — Repository contradiction audit.
- `FD-GOV-035-TEST-002` — Production divergence review.

## Acceptance Criteria

- `FD-GOV-035-AC-001` — Conflict owner is assigned.
- `FD-GOV-035-AC-002` — Resolution follows precedence.
- `FD-GOV-035-AC-003` — All downstream references are corrected.

## Related Documents

- source-of-truth-hierarchy.md
- change-control-process.md

## Open External Dependencies

- `FD-GOV-035-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
