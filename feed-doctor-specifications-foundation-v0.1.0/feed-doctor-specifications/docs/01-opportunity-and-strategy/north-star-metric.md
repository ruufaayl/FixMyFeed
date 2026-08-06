---
document_id: FD-STR-030
title: "North Star Metric"
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

# North Star Metric

## Purpose

Define the single primary measure of delivered product value.

## Scope

Active merchant accounts using diagnostics, repair, and prevention.

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

- `FD-STR-030-FR-001` — The north-star metric SHALL be Weekly Protected Product Opportunities.
- `FD-STR-030-FR-002` — A protected product opportunity SHALL be a destination-product-market combination that is eligible or has an actively managed issue with evidence, ownership, and monitoring.
- `FD-STR-030-FR-003` — The metric SHALL exclude unsupported inferred products and duplicate destinations.
- `FD-STR-030-FR-004` — Clean products SHALL count only when monitored within the freshness SLA.
- `FD-STR-030-FR-005` — Resolved products SHALL count after verification, not after attempted writeback.
- `FD-STR-030-FR-006` — The metric SHALL be paired with guardrails for false positives, rollback, support burden, and customer retention.

## Non-functional Requirements

- `FD-STR-030-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-030-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-030-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-030-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-030-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-030-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- Product has no traffic.
- Issue resolution processing is delayed.
- One product appears in several countries.

## Accessibility

- `FD-STR-030-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-030-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-030-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-030-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-030-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-030-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-030-AC-001` — Metric has exact inclusion and exclusion rules.
- `FD-STR-030-AC-002` — Metric cannot be inflated by duplicate scans.
- `FD-STR-030-AC-003` — Guardrails prevent harmful optimization.

## Related Documents

- product-kpi-tree.md
- activation-model.md

## Open External Dependencies

- `FD-STR-030-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
