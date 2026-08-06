---
document_id: FD-STR-013
title: "Competitive Landscape"
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

# Competitive Landscape

## Purpose

Map direct, adjacent, native, manual, and substitute solutions.

## Scope

Feed-management vendors, ecommerce apps, platform-native diagnostics, agencies, spreadsheets, and custom scripts.

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

- `FD-STR-013-FR-001` — Competitors SHALL be grouped by job solved rather than marketing category.
- `FD-STR-013-FR-002` — Direct competitors include feed-management platforms with diagnostics and repair.
- `FD-STR-013-FR-003` — Native alternatives include Google Merchant Center, Shopify channel apps, and WooCommerce plugins.
- `FD-STR-013-FR-004` — Manual alternatives include spreadsheets, agencies, developers, and support workflows.
- `FD-STR-013-FR-005` — Feed Doctor SHALL differentiate on evidence, source localization, safety, verification, rollback, portfolio governance, and issue-specific SEO.
- `FD-STR-013-FR-006` — Competitor claims SHALL be refreshed quarterly.

## Non-functional Requirements

- `FD-STR-013-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-013-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-013-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-013-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-013-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-013-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- Vendor feature changes rapidly.
- A native platform copies a visible feature.
- Agency and software are combined.

## Accessibility

- `FD-STR-013-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-013-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-013-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-013-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-013-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-013-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-013-AC-001` — Competitor groups and capabilities are explicit.
- `FD-STR-013-AC-002` — Differentiation is not based on features competitors already claim.
- `FD-STR-013-AC-003` — Sources are current and qualified.

## Related Documents

- competitor-capability-matrix.md
- differentiation-and-moat.md

## Open External Dependencies

- `FD-STR-013-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
