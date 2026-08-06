---
document_id: FD-STR-012
title: "Strategic Wedge"
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

# Strategic Wedge

## Purpose

Define the initial narrow capability that establishes differentiated value and expands into the long-term platform.

## Scope

Google Merchant Center issue workflows for Shopify and WooCommerce.

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

- `FD-STR-012-FR-001` — The initial wedge SHALL be Google Merchant Center issue diagnosis and safe source repair for Shopify and WooCommerce.
- `FD-STR-012-FR-002` — The wedge SHALL include account and product issue ingestion, normalized evidence, root-cause localization, repair preview, writeback, verification, and monitoring.
- `FD-STR-012-FR-003` — Public issue pages and diagnostic tools SHALL acquire users into the same workflow.
- `FD-STR-012-FR-004` — The wedge SHALL avoid building broad channel distribution before the core remediation loop is trusted.
- `FD-STR-012-FR-005` — Expansion SHALL occur through additional issue classes, source systems, and destination channels using shared primitives.

## Non-functional Requirements

- `FD-STR-012-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-012-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-012-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-012-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-012-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-012-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- Google restricts action APIs.
- Source platform writeback cannot resolve account configuration.
- A merchant only needs reporting.

## Accessibility

- `FD-STR-012-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-012-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-012-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-012-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-012-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-012-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-012-AC-001` — Wedge produces standalone value.
- `FD-STR-012-AC-002` — Wedge uses reusable architecture.
- `FD-STR-012-AC-003` — Expansion path does not require category reset.

## Related Documents

- distribution-strategy.md
- product-led-growth-strategy.md

## Open External Dependencies

- `FD-STR-012-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
