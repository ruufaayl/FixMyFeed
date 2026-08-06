---
document_id: FD-GOV-018
title: "Architecture Decision Record Template"
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

# Architecture Decision Record Template

## Purpose

Record a durable architecture decision, its context, alternatives, consequences, and supersession behavior.

## Scope

Material technical choices that constrain multiple components, teams, or future evolution.

## Dependencies

- DECISION_LOG.md
- source-of-truth-hierarchy.md

## Inputs

- Decision context
- Forces
- Alternatives
- Evidence
- Risks

## Outputs

- Approved, rejected, or superseded decision record

## Functional Requirements

- `FD-GOV-018-FR-001` — ADRs SHALL define status, date, decision owners, context, decision drivers, considered alternatives, decision, positive consequences, negative consequences, risks, implementation obligations, validation plan, and supersession rules.
- `FD-GOV-018-FR-002` — Rejected alternatives SHALL include rejection rationale.
- `FD-GOV-018-FR-003` — Assumptions SHALL be testable and assigned review triggers.
- `FD-GOV-018-FR-004` — Technology selection ADRs SHALL distinguish required capabilities from vendor choice.

## Non-functional Requirements

- `FD-GOV-018-NFR-001` — ADRs must remain concise enough to review and complete enough to explain reversibility.

## Data Requirements

- `FD-GOV-018-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-018-VAL-001` — An ADR cannot be approved without at least one credible alternative unless the choice is externally mandated.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-018-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-018-ERR-001` — Hidden assumptions and missing consequence analysis block approval.

## Success States

- `FD-GOV-018-STATE-002` — Future teams can understand why the architecture exists and when to revisit it.

## Edge Cases

- Externally mandated decision.
- Emergency temporary choice.
- Vendor acquisition changes product viability.

## Accessibility

- `FD-GOV-018-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-018-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-018-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-018-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-018-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-018-TEST-001` — Decision review against architecture objectives.
- `FD-GOV-018-TEST-002` — Post-implementation validation of assumptions.

## Acceptance Criteria

- `FD-GOV-018-AC-001` — Decision and alternatives are explicit.
- `FD-GOV-018-AC-002` — Consequences are owned.
- `FD-GOV-018-AC-003` — Review triggers are defined.

## Related Documents

- DECISION_LOG.md
- rfc-template.md

## Open External Dependencies

- `FD-GOV-018-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
