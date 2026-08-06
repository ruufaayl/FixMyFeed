---
document_id: FD-GOV-034
title: "Unresolved Question Policy"
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

# Unresolved Question Policy

## Purpose

Prevent missing information from becoming undocumented implementation assumptions.

## Scope

Any ambiguity, unknown external behavior, incomplete requirement, or pending decision.

## Dependencies

- documentation-charter.md
- OPEN_EXTERNAL_DEPENDENCIES.md
- rfc-template.md

## Inputs

- Unknown
- Impact
- Available evidence
- Decision deadline

## Outputs

- Defined default behavior, external dependency, RFC, or blocking status

## Functional Requirements

- `FD-GOV-034-FR-001` — When information is missing, the author SHALL define the safest production-ready default and explain rationale unless the decision depends on unavailable external authority.
- `FD-GOV-034-FR-002` — Unknown external facts SHALL be recorded as dependencies, not guessed.
- `FD-GOV-034-FR-003` — Safety, security, privacy, billing, deletion, and authorization ambiguity SHALL default to deny, preserve, or require approval as appropriate.
- `FD-GOV-034-FR-004` — Unresolved questions SHALL have owner, impact, decision path, and deadline.
- `FD-GOV-034-FR-005` — Approved Baseline documents SHALL contain no untracked open questions.

## Non-functional Requirements

- `FD-GOV-034-NFR-001` — Defaults must minimize irreversible harm and preserve future migration options.

## Data Requirements

- `FD-GOV-034-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-034-VAL-001` — Placeholder questions without ownership fail lint.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-034-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-034-ERR-001` — Silent assumptions are specification defects.

## Success States

- `FD-GOV-034-STATE-002` — Implementation never stalls on a product question that the specification should have resolved.

## Edge Cases

- Vendor behavior cannot be tested.
- Legal advice is pending.
- Two safe defaults have major business tradeoffs.

## Accessibility

- `FD-GOV-034-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-034-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-034-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-034-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-034-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-034-TEST-001` — Open-question scan.
- `FD-GOV-034-TEST-002` — Approval check for unresolved markers.

## Acceptance Criteria

- `FD-GOV-034-AC-001` — All unknowns are resolved, defaulted, or tracked.
- `FD-GOV-034-AC-002` — High-risk ambiguity fails closed.
- `FD-GOV-034-AC-003` — Rationale is documented.

## Related Documents

- external-dependency-policy.md
- contradiction-resolution-policy.md

## Open External Dependencies

- `FD-GOV-034-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
