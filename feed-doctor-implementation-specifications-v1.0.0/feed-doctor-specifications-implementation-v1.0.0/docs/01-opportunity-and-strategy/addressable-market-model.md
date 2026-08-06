---
document_id: FD-STR-003
title: "Addressable Market Model"
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

# Addressable Market Model

## Purpose

Define a bottom-up market model without treating overlapping platform counts as additive truth.

## Scope

Potential merchant, agency, and enterprise accounts and monetizable product scope.

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

- `FD-STR-003-FR-001` — The market model SHALL use scenarios rather than one false-precision TAM number.
- `FD-STR-003-FR-002` — Shopify and WooCommerce installed-base figures SHALL be treated as overlapping and methodologically different.
- `FD-STR-003-FR-003` — Serviceable market SHALL be constrained by Merchant Center usage, catalog complexity, willingness to grant access, geography, and product eligibility.
- `FD-STR-003-FR-004` — Revenue scenarios SHALL model merchant accounts, managed stores, average revenue per account, gross margin, support load, and churn.
- `FD-STR-003-FR-005` — Agency portfolios SHALL be modelled separately from single-store merchants.
- `FD-STR-003-FR-006` — The model SHALL include downside, base, and upside cases.

## Non-functional Requirements

- `FD-STR-003-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-003-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-003-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-003-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-003-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-003-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- Duplicate stores across datasets.
- One agency manages hundreds of stores.
- Free users create high compute cost.
- Enterprise contracts include non-standard pricing.

## Accessibility

- `FD-STR-003-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-003-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-003-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-003-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-003-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-003-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-003-AC-001` — Assumptions are explicit and sensitivity-tested.
- `FD-STR-003-AC-002` — No platform counts are naively summed.
- `FD-STR-003-AC-003` — Revenue scenarios trace to pricing and cost documents.

## Related Documents

- market-segmentation.md
- unit-economics-model.md
- business-model.md

## Open External Dependencies

- `FD-STR-003-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
