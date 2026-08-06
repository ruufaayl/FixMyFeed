---
document_id: FD-STR-025
title: "Business Model"
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

# Business Model

## Purpose

Define how Feed Doctor creates, delivers, captures, and expands value.

## Scope

Subscriptions, usage, agency portfolios, enterprise contracts, and adjacent services.

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

- `FD-STR-025-FR-001` — Revenue SHALL primarily come from recurring SaaS subscriptions.
- `FD-STR-025-FR-002` — Packaging SHALL scale with managed stores, active products, scan and monitoring load, repair volume, API usage, and governance requirements.
- `FD-STR-025-FR-003` — Pricing SHALL avoid charging solely per detected issue because that penalizes product success.
- `FD-STR-025-FR-004` — Agency plans SHALL reflect portfolio value and operational leverage.
- `FD-STR-025-FR-005` — Enterprise pricing MAY include platform fee, capacity, support, security, and contract terms.
- `FD-STR-025-FR-006` — Professional services SHALL not become necessary for standard product operation.

## Non-functional Requirements

- `FD-STR-025-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-025-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-025-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-025-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-025-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-025-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- Large inactive catalog.
- Seasonal product spikes.
- Agency shares access.
- High AI cost.

## Accessibility

- `FD-STR-025-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-025-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-025-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-025-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-025-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-025-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-025-AC-001` — Revenue model aligns with customer value.
- `FD-STR-025-AC-002` — Cost drivers are recoverable.
- `FD-STR-025-AC-003` — Success does not reduce revenue unnaturally.

## Related Documents

- pricing-principles.md
- unit-economics-model.md

## Open External Dependencies

- `FD-STR-025-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
