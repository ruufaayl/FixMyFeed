---
document_id: FD-GOV-042
title: "Release Definition of Done"
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

# Release Definition of Done

## Purpose

Define the complete acceptance gate for promoting a Feed Doctor release to general production availability.

## Scope

Application, service, schema, integration, SEO, security, and operational releases.

## Dependencies

- feature-definition-of-done.md
- docs/20-devops-sre-and-platform-engineering/operational-readiness-review.md
- docs/19-testing-and-quality-assurance/quality-release-gates.md

## Inputs

- Release scope
- Traceability evidence
- Test results
- Security and operational approvals

## Outputs

- Go, conditional go, or no-go decision

## Functional Requirements

- `FD-GOV-042-FR-001` — All release-scoped requirements SHALL be approved and traceable.
- `FD-GOV-042-FR-002` — All included features, pages, APIs, and database changes SHALL meet their definitions of done.
- `FD-GOV-042-FR-003` — Security, privacy, compliance, accessibility, SEO, performance, resilience, support, monitoring, migration, rollback, and communication gates SHALL pass.
- `FD-GOV-042-FR-004` — Known defects SHALL be risk-assessed with owner, mitigation, and expiry.
- `FD-GOV-042-FR-005` — Production verification and rollback triggers SHALL be defined.
- `FD-GOV-042-FR-006` — Marketplace or vendor approvals SHALL be evidenced where required.

## Non-functional Requirements

- `FD-GOV-042-NFR-001` — Release SLO and capacity assumptions must be validated.

## Data Requirements

- `FD-GOV-042-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-042-VAL-001` — No critical blocker or expired waiver may remain.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-042-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-042-ERR-001` — Missing rollback, unsupported migration, or unowned operational risk requires no-go.

## Success States

- `FD-GOV-042-STATE-002` — The release is safe, supportable, observable, reversible, and contract-compliant.

## Edge Cases

- Emergency release.
- Partial regional rollout.
- Vendor approval pending.
- Security fix with incomplete normal test window.

## Accessibility

- `FD-GOV-042-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-042-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-042-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-042-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-042-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-042-TEST-001` — Release regression suite.
- `FD-GOV-042-TEST-002` — Production verification plan.
- `FD-GOV-042-TEST-003` — Disaster and rollback rehearsal as required.

## Acceptance Criteria

- `FD-GOV-042-AC-001` — All mandatory gates pass.
- `FD-GOV-042-AC-002` — Decision is recorded.
- `FD-GOV-042-AC-003` — Rollback and ownership are active.

## Related Documents

- feature-definition-of-done.md
- change-control-process.md

## Open External Dependencies

- `FD-GOV-042-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
