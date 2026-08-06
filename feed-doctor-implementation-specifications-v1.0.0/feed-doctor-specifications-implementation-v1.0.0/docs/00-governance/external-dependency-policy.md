---
document_id: FD-GOV-033
title: "External Dependency Policy"
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

# External Dependency Policy

## Purpose

Govern assumptions and risks created by external platforms, vendors, standards, regulations, quotas, and approval programs.

## Scope

All dependencies outside Feed Doctor's direct control.

## Dependencies

- EXTERNAL_SOURCE_REGISTER.md
- OPEN_EXTERNAL_DEPENDENCIES.md

## Inputs

- External capability
- Contract
- Documentation
- Observed behavior
- Risk

## Outputs

- Dependency classification, fallback, monitoring, and review requirements

## Functional Requirements

- `FD-GOV-033-FR-001` — External dependencies SHALL be classified by criticality, substitutability, mutability, and approval status.
- `FD-GOV-033-FR-002` — Capabilities requiring allowlist, certification, review, or contract SHALL be treated as unavailable until evidence proves access.
- `FD-GOV-033-FR-003` — Every critical dependency SHALL have monitoring, degradation behavior, and contingency.
- `FD-GOV-033-FR-004` — Vendor-specific concepts SHALL be isolated behind internal contracts where feasible.
- `FD-GOV-033-FR-005` — Mutable dependency behavior SHALL have a refresh owner and review cadence.

## Non-functional Requirements

- `FD-GOV-033-NFR-001` — Critical dependency failure must not cause uncontrolled cross-tenant impact.

## Data Requirements

- `FD-GOV-033-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-033-VAL-001` — Blocking dependencies require recorded fallback or explicit launch acceptance.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-033-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-033-ERR-001` — Unverified assumptions cannot become Approved Baseline requirements.

## Success States

- `FD-GOV-033-STATE-002` — Teams know which capabilities are guaranteed, conditional, degraded, or unavailable.

## Edge Cases

- Vendor preview feature.
- Regional availability difference.
- Quota changed without notice.
- Conflicting documentation and observed behavior.

## Accessibility

- `FD-GOV-033-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-033-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-033-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-033-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-033-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-033-TEST-001` — Dependency failure game days.
- `FD-GOV-033-TEST-002` — Documentation freshness checks.

## Acceptance Criteria

- `FD-GOV-033-AC-001` — Dependencies are classified.
- `FD-GOV-033-AC-002` — Fallbacks are defined.
- `FD-GOV-033-AC-003` — Approval-gated capabilities are not overstated.

## Related Documents

- OPEN_EXTERNAL_DEPENDENCIES.md
- integration-specification-template.md

## Open External Dependencies

- `FD-GOV-033-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
