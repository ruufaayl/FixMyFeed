---
document_id: FD-GOV-032
title: "Specification and Capability Deprecation Policy"
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

# Specification and Capability Deprecation Policy

## Purpose

Define safe removal or replacement of documents, APIs, fields, features, integrations, pages, and operational behavior.

## Scope

All externally or internally depended-on capabilities and specifications.

## Dependencies

- specification-versioning.md
- CHANGELOG.md

## Inputs

- Deprecation proposal
- Usage evidence
- Replacement
- Migration plan

## Outputs

- Deprecation notice, migration period, removal decision

## Functional Requirements

- `FD-GOV-032-FR-001` — Deprecations SHALL identify affected consumers, replacement, compatibility period, migration steps, telemetry, owner, and removal criteria.
- `FD-GOV-032-FR-002` — Public API and webhook deprecations SHALL follow published compatibility commitments.
- `FD-GOV-032-FR-003` — Data fields SHALL not be removed before migration and retention requirements are satisfied.
- `FD-GOV-032-FR-004` — SEO pages SHALL define redirect or archival behavior.
- `FD-GOV-032-FR-005` — Emergency removal is allowed only for security, legal, or platform-mandated reasons and requires executive approval.

## Non-functional Requirements

- `FD-GOV-032-NFR-001` — Deprecation periods must account for enterprise customer adoption cycles.

## Data Requirements

- `FD-GOV-032-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-032-VAL-001` — Removal criteria must be measurable.
- `FD-GOV-032-VAL-002` — Usage telemetry must support removal decisions.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-032-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-032-ERR-001` — Removal without replacement or migration evidence is prohibited except approved emergency cases.

## Success States

- `FD-GOV-032-STATE-002` — Consumers can migrate without surprise or silent data loss.

## Edge Cases

- Upstream vendor removes capability immediately.
- Feature has no active users.
- Security risk prevents continued compatibility.

## Accessibility

- `FD-GOV-032-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-032-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-032-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-032-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-032-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-032-TEST-001` — Deprecation communication test.
- `FD-GOV-032-TEST-002` — Telemetry validation.
- `FD-GOV-032-TEST-003` — Redirect and compatibility tests.

## Acceptance Criteria

- `FD-GOV-032-AC-001` — Replacement and dates are explicit.
- `FD-GOV-032-AC-002` — Usage is measured.
- `FD-GOV-032-AC-003` — Removal has approval.

## Related Documents

- CHANGELOG.md
- external-dependency-policy.md

## Open External Dependencies

- `FD-GOV-032-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
