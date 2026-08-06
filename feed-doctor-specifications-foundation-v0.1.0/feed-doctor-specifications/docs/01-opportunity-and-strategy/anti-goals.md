---
document_id: FD-STR-035
title: "Anti-goals"
status: "Draft Complete"
version: "1.0.0"
owner: "Product Strategy"
reviewers:
  - Product Architecture
  - Security Architecture
  - Quality Engineering
classification: "Internal"
last_reviewed: "2026-08-06"
next_review_due: "2026-11-06"
---

# Anti-goals

## Purpose

Define outcomes the organization actively refuses because they undermine category, trust, or architecture.

## Scope

Product, sales, AI, SEO, and engineering behavior.

## Dependencies

- docs/00-governance/documentation-charter.md
- docs/00-governance/citation-and-evidence-policy.md

## Inputs

- Approved product thesis
- Market and platform evidence
- Related strategy specifications

## Outputs

- Binding strategic decisions
- Constraints for downstream product and architecture documents

## Functional Requirements

- `FD-STR-035-FR-001` — Feed Doctor SHALL NOT silently mutate merchant data.
- `FD-STR-035-FR-002` — Feed Doctor SHALL NOT claim guaranteed Merchant Center approval or reinstatement.
- `FD-STR-035-FR-003` — Feed Doctor SHALL NOT build thin programmatic pages solely to capture keywords.
- `FD-STR-035-FR-004` — Feed Doctor SHALL NOT use generative AI as the sole validator of policy or structured feed correctness.
- `FD-STR-035-FR-005` — Feed Doctor SHALL NOT require professional services for standard supported workflows.
- `FD-STR-035-FR-006` — Feed Doctor SHALL NOT create customer-specific permanent code forks.
- `FD-STR-035-FR-007` — Feed Doctor SHALL NOT expose one tenant's data or learned examples to another.
- `FD-STR-035-FR-008` — Feed Doctor SHALL NOT optimize for issue count when issue prevention reduces counts.

## Non-functional Requirements

- `FD-STR-035-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-035-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-035-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-035-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-035-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-035-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- Customer requests full automatic mode.
- Sales requests custom promise.
- SEO competitor publishes at massive scale.

## Accessibility

- `FD-STR-035-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-035-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-035-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-035-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-035-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-035-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-035-AC-001` — Prohibited outcomes are explicit.
- `FD-STR-035-AC-002` — Architecture and sales review gates enforce them.
- `FD-STR-035-AC-003` — Exceptions require strategy-level approval where exceptions are even permissible.

## Related Documents

- non-goals.md
- ethical-product-boundaries.md

## Open External Dependencies

- `FD-STR-035-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
