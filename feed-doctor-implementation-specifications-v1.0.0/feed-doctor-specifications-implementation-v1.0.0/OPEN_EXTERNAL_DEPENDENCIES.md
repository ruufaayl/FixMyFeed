---
document_id: FD-ROOT-011
title: "Open External Dependencies"
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

# Open External Dependencies

## Purpose

Record unresolved dependencies on vendors, platforms, regulators, certifications, contracts, allowlists, quotas, and external decisions.

## Scope

Any external condition that can block, limit, alter, or invalidate implementation or operation.

## Dependencies

- EXTERNAL_SOURCE_REGISTER.md
- docs/00-governance/external-dependency-policy.md

## Inputs

- Dependency reports
- Vendor status
- Contract negotiations
- Platform approvals
- Regulatory analysis

## Outputs

- Prioritized dependency register with owner, contingency, and decision deadline

## Functional Requirements

- `FD-ROOT-011-FR-001` — Each dependency must record impact, likelihood, owner, required action, target resolution date, fallback, and affected documents.
- `FD-ROOT-011-FR-002` — Dependencies must be classified as Blocking, Constraining, Monitoring, or Informational.
- `FD-ROOT-011-FR-003` — Allowlisted or approval-gated platform capabilities must never be documented as generally available.
- `FD-ROOT-011-FR-004` — Expired target dates automatically escalate.
- `FD-ROOT-011-FR-005` — Closing a dependency requires evidence and downstream document review.

## Non-functional Requirements

- `FD-ROOT-011-NFR-001` — The register must be suitable for executive and engineering review.

## Data Requirements

- `FD-ROOT-011-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-ROOT-011-VAL-001` — Blocking dependencies require contingency plans.
- `FD-ROOT-011-VAL-002` — Dependencies may not be closed without evidence.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-ROOT-011-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-ROOT-011-ERR-001` — Unowned blocking dependencies and expired unresolved deadlines are release risks.

## Success States

- `FD-ROOT-011-STATE-002` — No team mistakes an external assumption for a guaranteed capability.

## Edge Cases

- A platform feature is announced but not generally available.
- API quota approval is pending.
- A legal interpretation differs by region.
- Marketplace review timing is unknown.

## Accessibility

- `FD-ROOT-011-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-ROOT-011-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-ROOT-011-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-ROOT-011-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-ROOT-011-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-ROOT-011-TEST-001` — Weekly review of blocking and constraining dependencies.
- `FD-ROOT-011-TEST-002` — Release gate verifies no unaccepted blocker remains.

## Acceptance Criteria

- `FD-ROOT-011-AC-001` — All known external blockers are recorded.
- `FD-ROOT-011-AC-002` — Every blocker has an owner and fallback.
- `FD-ROOT-011-AC-003` — Closed items contain evidence.

## Related Documents

- EXTERNAL_SOURCE_REGISTER.md
- docs/00-governance/unresolved-question-policy.md

## Open External Dependencies

- `FD-ROOT-011-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
