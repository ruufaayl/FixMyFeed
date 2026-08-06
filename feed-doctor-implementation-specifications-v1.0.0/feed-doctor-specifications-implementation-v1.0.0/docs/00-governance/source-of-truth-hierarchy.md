---
document_id: FD-GOV-002
title: "Source of Truth Hierarchy"
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

# Source of Truth Hierarchy

## Purpose

Resolve conflicts between strategy, domain rules, architecture, contracts, UI behavior, code, tests, external documentation, and operational observations.

## Scope

All information sources that may influence Feed Doctor behavior.

## Dependencies

- documentation-charter.md
- contradiction-resolution-policy.md
- DECISION_LOG.md

## Inputs

- Conflicting specifications
- External platform facts
- Implementation behavior
- Operational evidence

## Outputs

- Deterministic precedence rules
- Required conflict-resolution actions

## Functional Requirements

- `FD-GOV-002-FR-001` — Applicable law and binding contractual obligations take highest precedence.
- `FD-GOV-002-FR-002` — Approved security and privacy controls take precedence over convenience behavior.
- `FD-GOV-002-FR-003` — Approved domain invariants take precedence over feature-local descriptions.
- `FD-GOV-002-FR-004` — Approved API, event, and database contracts take precedence over UI implementation details.
- `FD-GOV-002-FR-005` — Feature specifications take precedence over tickets and informal communications.
- `FD-GOV-002-FR-006` — Approved page and component specifications govern user-visible behavior.
- `FD-GOV-002-FR-007` — Code and tests are evidence of implementation, not independent product authority.
- `FD-GOV-002-FR-008` — External platform documentation governs only the external platform behavior and must be normalized through internal contracts.
- `FD-GOV-002-FR-009` — When sources at the same level conflict, implementation must pause for contradiction resolution.

## Non-functional Requirements

- `FD-GOV-002-NFR-001` — The hierarchy must produce one accountable resolution path for every conflict.

## Data Requirements

- `FD-GOV-002-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-002-VAL-001` — A lower-precedence source may not silently override a higher-precedence source.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-002-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-002-ERR-001` — Unresolved equal-level conflict blocks approval and release.

## Success States

- `FD-GOV-002-STATE-002` — Any conflict can be escalated and resolved without subjective team preference.

## Edge Cases

- Emergency security patch.
- Observed vendor behavior contradicts documentation.
- A law differs by jurisdiction.
- Legacy production behavior conflicts with a new approved baseline.

## Accessibility

- `FD-GOV-002-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-002-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-002-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-002-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-002-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-002-TEST-001` — Review samples of cross-document conflicts during governance audits.

## Acceptance Criteria

- `FD-GOV-002-AC-001` — Precedence levels are explicit.
- `FD-GOV-002-AC-002` — Exceptions are logged.
- `FD-GOV-002-AC-003` — All templates reference this policy.

## Related Documents

- contradiction-resolution-policy.md
- change-control-process.md
- EXTERNAL_SOURCE_REGISTER.md

## Open External Dependencies

- `FD-GOV-002-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
