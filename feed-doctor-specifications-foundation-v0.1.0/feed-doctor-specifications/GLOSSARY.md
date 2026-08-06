---
document_id: FD-ROOT-006
title: "Canonical Glossary"
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

# Canonical Glossary

## Purpose

Define the canonical business, technical, product, policy, and operational vocabulary used throughout Feed Doctor.

## Scope

All terms whose ambiguity could alter implementation, user experience, reporting, contracts, or operations.

## Dependencies

- docs/03-domain-model/ubiquitous-language.md
- docs/00-governance/terminology-and-language-standard.md

## Inputs

- Approved domain terms
- External platform terminology
- Deprecated synonyms

## Outputs

- Canonical definitions, aliases, forbidden usages, and ownership

## Functional Requirements

- `FD-ROOT-006-FR-001` — Each term must have one canonical definition and owning domain.
- `FD-ROOT-006-FR-002` — External platform terms must be labeled as external and mapped to internal concepts.
- `FD-ROOT-006-FR-003` — Ambiguous synonyms must be deprecated or context-qualified.
- `FD-ROOT-006-FR-004` — UI labels, API fields, analytics events, and database concepts must use canonical terms.
- `FD-ROOT-006-FR-005` — Terms with materially different meanings across Google, Shopify, and WooCommerce must include explicit mappings.

## Non-functional Requirements

- `FD-ROOT-006-NFR-001` — Definitions must be concise enough for routine use and precise enough for contract design.

## Data Requirements

- `FD-ROOT-006-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-ROOT-006-VAL-001` — No two active canonical terms may share indistinguishable definitions.
- `FD-ROOT-006-VAL-002` — Deprecated terms must reference replacements.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-ROOT-006-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-ROOT-006-ERR-001` — Conflicting definitions block approval of dependent documents.

## Success States

- `FD-ROOT-006-STATE-002` — A senior engineer can interpret every domain noun without consulting tribal knowledge.

## Edge Cases

- External terminology changes.
- A term is both a user-facing label and internal aggregate.
- Legacy aliases in imported data.
- Localization changes surface wording without changing meaning.

## Accessibility

- `FD-ROOT-006-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-ROOT-006-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-ROOT-006-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-ROOT-006-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-ROOT-006-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-ROOT-006-TEST-001` — Repository terminology lint for high-risk forbidden synonyms.
- `FD-ROOT-006-TEST-002` — Quarterly glossary review.

## Acceptance Criteria

- `FD-ROOT-006-AC-001` — All high-impact terms have definitions.
- `FD-ROOT-006-AC-002` — Every deprecated term has a replacement.
- `FD-ROOT-006-AC-003` — No approved document redefines a canonical term locally.

## Related Documents

- docs/03-domain-model/ubiquitous-language.md
- docs/00-governance/terminology-and-language-standard.md

## Open External Dependencies

- `FD-ROOT-006-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
