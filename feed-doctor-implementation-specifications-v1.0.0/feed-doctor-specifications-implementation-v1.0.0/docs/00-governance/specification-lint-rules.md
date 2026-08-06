---
document_id: FD-GOV-036
title: "Specification Lint Rules"
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

# Specification Lint Rules

## Purpose

Define automated checks that prevent structurally incomplete, ambiguous, stale, or untraceable specifications.

## Scope

All Markdown documents, front matter, references, requirements, and registries.

## Dependencies

- document-template.md
- requirements-id-convention.md
- cross-reference-policy.md

## Inputs

- Repository files
- Manifest
- Glossary
- Requirement registry

## Outputs

- Deterministic lint results with severity and remediation

## Functional Requirements

- `FD-GOV-036-FR-001` — Lint SHALL verify front matter, mandatory sections, document IDs, requirement IDs, normative keywords, broken links, missing related documents, stale review dates, placeholder markers, invalid statuses, and unresolved conflict markers.
- `FD-GOV-036-FR-002` — Lint SHALL flag ambiguous obligation words and banned vague qualifiers.
- `FD-GOV-036-FR-003` — Approved Baseline documents SHALL fail on warnings classified as blocking.
- `FD-GOV-036-FR-004` — Generated documents SHALL validate against their family schema.
- `FD-GOV-036-FR-005` — Lint exceptions SHALL require scoped waiver, owner, expiry, and rationale.

## Non-functional Requirements

- `FD-GOV-036-NFR-001` — Lint must provide file, line, rule ID, severity, and correction guidance.

## Data Requirements

- `FD-GOV-036-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-036-VAL-001` — Rules must be deterministic and versioned.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-036-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-036-ERR-001` — Lint infrastructure failure blocks baseline approval unless emergency waiver exists.

## Success States

- `FD-GOV-036-STATE-002` — Common documentation defects are detected before human review.

## Edge Cases

- Code snippets contain normative words.
- Quoted external text.
- Restricted documents absent from normal checkout.

## Accessibility

- `FD-GOV-036-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-036-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-036-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-036-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-036-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-036-TEST-001` — Golden valid and invalid document fixtures.
- `FD-GOV-036-TEST-002` — Backward compatibility tests for rule versions.

## Acceptance Criteria

- `FD-GOV-036-AC-001` — All blocking rules are enumerated.
- `FD-GOV-036-AC-002` — Failures are actionable.
- `FD-GOV-036-AC-003` — Waivers expire.

## Related Documents

- specification-completeness-checklist.md
- normative-language-standard.md

## Open External Dependencies

- `FD-GOV-036-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
