---
document_id: FD-GOV-019
title: "Request for Comments Template"
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

# Request for Comments Template

## Purpose

Structure review of proposed cross-cutting changes before they become approved specifications or architecture decisions.

## Scope

Material product, domain, architecture, data, security, UX, API, operations, or governance changes.

## Dependencies

- review-and-approval-workflow.md
- change-control-process.md

## Inputs

- Problem statement
- Proposal
- Alternatives
- Impact assessment
- Migration plan

## Outputs

- Approved, rejected, revised, or withdrawn proposal

## Functional Requirements

- `FD-GOV-019-FR-001` — RFCs SHALL define motivation, scope, non-goals, detailed proposal, alternatives, compatibility, security, privacy, reliability, performance, migration, rollout, rollback, observability, testing, ownership, and unresolved risks.
- `FD-GOV-019-FR-002` — Review periods and required reviewer roles SHALL be explicit.
- `FD-GOV-019-FR-003` — Comments SHALL be resolved or dispositioned before approval.
- `FD-GOV-019-FR-004` — Approved RFCs SHALL identify all documents requiring updates.

## Non-functional Requirements

- `FD-GOV-019-NFR-001` — RFCs must support asynchronous review by distributed teams.

## Data Requirements

- `FD-GOV-019-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-019-VAL-001` — Unresolved blocking comments prevent approval.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-019-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-019-ERR-001` — Approval without impact analysis or migration plan is invalid.

## Success States

- `FD-GOV-019-STATE-002` — Cross-cutting changes are reviewed before implementation lock-in.

## Edge Cases

- Emergency RFC.
- Confidential security proposal.
- Proposal partially accepted.

## Accessibility

- `FD-GOV-019-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-019-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-019-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-019-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-019-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-019-TEST-001` — RFC completeness check.
- `FD-GOV-019-TEST-002` — Post-approval document-update verification.

## Acceptance Criteria

- `FD-GOV-019-AC-001` — Required reviewers approve.
- `FD-GOV-019-AC-002` — Blocking comments are resolved.
- `FD-GOV-019-AC-003` — Downstream changes are tracked.

## Related Documents

- adr-template.md
- change-control-process.md

## Open External Dependencies

- `FD-GOV-019-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
