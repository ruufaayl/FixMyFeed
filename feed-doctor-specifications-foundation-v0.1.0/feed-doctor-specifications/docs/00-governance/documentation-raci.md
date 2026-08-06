---
document_id: FD-GOV-043
title: "Documentation RACI"
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

# Documentation RACI

## Purpose

Define accountable, responsible, consulted, and informed roles for each specification family and approval risk.

## Scope

All repository authoring, review, approval, maintenance, and deprecation activities.

## Dependencies

- DOCUMENT_OWNERSHIP.md
- review-and-approval-workflow.md

## Inputs

- Document family
- Risk classification
- Team topology

## Outputs

- Required role assignments and escalation rules

## Functional Requirements

- `FD-GOV-043-FR-001` — Each document family SHALL identify one Accountable role and at least one Responsible role.
- `FD-GOV-043-FR-002` — Security, privacy, billing, legal, data deletion, tenant isolation, automated repair, and disaster recovery SHALL require specialist consultation or approval.
- `FD-GOV-043-FR-003` — QA SHALL be consulted on every normative acceptance and test section.
- `FD-GOV-043-FR-004` — UX and accessibility SHALL approve page and component behavior.
- `FD-GOV-043-FR-005` — SEO SHALL approve indexable public pages.
- `FD-GOV-043-FR-006` — Operations SHALL approve runbooks, SLOs, alerts, and production readiness.
- `FD-GOV-043-FR-007` — No one person may be both sole author and sole approver for high-risk documents.

## Non-functional Requirements

- `FD-GOV-043-NFR-001` — RACI rules must remain aligned with team topology as the company scales.

## Data Requirements

- `FD-GOV-043-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-043-VAL-001` — Approval tooling must enforce required role coverage.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-043-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-043-ERR-001` — Missing accountable role or required specialist blocks approval.

## Success States

- `FD-GOV-043-STATE-002` — Review responsibility is predictable and no critical domain is silently omitted.

## Edge Cases

- Small early team.
- Temporary absence.
- External legal counsel.
- Shared service across teams.

## Accessibility

- `FD-GOV-043-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-043-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-043-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-043-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-043-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-043-TEST-001` — Quarterly role mapping audit.
- `FD-GOV-043-TEST-002` — Approval-rule simulation.

## Acceptance Criteria

- `FD-GOV-043-AC-001` — Every document family has RACI.
- `FD-GOV-043-AC-002` — High-risk independence rules exist.
- `FD-GOV-043-AC-003` — Escalation paths are defined.

## Related Documents

- DOCUMENT_OWNERSHIP.md
- review-and-approval-workflow.md

## Open External Dependencies

- `FD-GOV-043-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
