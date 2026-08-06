---
document_id: FD-STR-028
title: "Unit Economics Model"
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

# Unit Economics Model

## Purpose

Define contribution economics and capacity assumptions for sustainable scale.

## Scope

Revenue, infrastructure, external APIs, support, sales, refunds, and gross margin.

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

- `FD-STR-028-FR-001` — The model SHALL calculate contribution margin per account and per managed product band.
- `FD-STR-028-FR-002` — Variable costs SHALL include compute, storage, egress, crawling, AI, notifications, vendor fees, support, and marketplace fees.
- `FD-STR-028-FR-003` — Cost attribution SHALL distinguish scans, continuous monitoring, repair execution, and public tools.
- `FD-STR-028-FR-004` — Agency and enterprise support costs SHALL be modelled separately.
- `FD-STR-028-FR-005` — Pricing and abuse limits SHALL be tested against downside cost cases.
- `FD-STR-028-FR-006` — Gross-margin targets SHALL not depend on silently reducing scan quality.

## Non-functional Requirements

- `FD-STR-028-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-028-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-028-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-028-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-028-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-028-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- One tenant produces extreme crawl load.
- AI provider price changes.
- External API quotas require premium access.
- Public tool abuse.

## Accessibility

- `FD-STR-028-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-028-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-028-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-028-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-028-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-028-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-028-AC-001` — All major variable costs are represented.
- `FD-STR-028-AC-002` — Sensitivity scenarios exist.
- `FD-STR-028-AC-003` — Pricing decisions trace to economics.

## Related Documents

- cost-driver-model.md
- pricing-principles.md

## Open External Dependencies

- `FD-STR-028-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
