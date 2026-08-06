---
document_id: FD-STR-032
title: "Business KPI Tree"
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

# Business KPI Tree

## Purpose

Define acquisition, activation, revenue, retention, expansion, efficiency, and trust metrics.

## Scope

Company-level business performance.

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

- `FD-STR-032-FR-001` — Business metrics SHALL include qualified traffic, workflow starts, connected stores, activated accounts, paid conversion, net revenue retention, gross retention, expansion, gross margin, support cost, and CAC payback.
- `FD-STR-032-FR-002` — SEO metrics SHALL connect to activated accounts rather than traffic alone.
- `FD-STR-032-FR-003` — Agency metrics SHALL distinguish partners, managed clients, and end merchants.
- `FD-STR-032-FR-004` — Enterprise pipeline SHALL distinguish promised versus technically approved capability.
- `FD-STR-032-FR-005` — Revenue metrics SHALL reconcile to billing records.

## Non-functional Requirements

- `FD-STR-032-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-032-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-032-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-032-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-032-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-032-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- Free tool traffic dominates.
- Agency adds many inactive clients.
- Annual prepayment obscures usage economics.

## Accessibility

- `FD-STR-032-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-032-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-032-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-032-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-032-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-032-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-032-AC-001` — Metrics reconcile to source systems.
- `FD-STR-032-AC-002` — Funnels are segment-specific.
- `FD-STR-032-AC-003` — Vanity metrics are not primary.

## Related Documents

- product-kpi-tree.md
- SEO-metrics.md

## Open External Dependencies

- `FD-STR-032-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
