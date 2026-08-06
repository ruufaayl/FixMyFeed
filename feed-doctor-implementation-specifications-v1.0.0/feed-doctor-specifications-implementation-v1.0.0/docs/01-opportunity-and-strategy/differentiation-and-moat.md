---
document_id: FD-STR-016
title: "Differentiation and Moat"
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

# Differentiation and Moat

## Purpose

Define durable advantages that compound with usage and cannot be reduced to UI features.

## Scope

Data, workflow, trust, ecosystem, content, and operational advantages.

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

- `FD-STR-016-FR-001` — The primary moat SHALL be a governed issue knowledge graph linking source data, destination state, evidence, repairs, outcomes, and recurrence.
- `FD-STR-016-FR-002` — Repair outcome data SHALL improve prioritization and safety without compromising tenant privacy.
- `FD-STR-016-FR-003` — Public issue pages SHALL derive from governed internal knowledge, creating content freshness and consistency advantages.
- `FD-STR-016-FR-004` — Auditability, approval policy, and rollback SHALL create enterprise trust.
- `FD-STR-016-FR-005` — Connector breadth SHALL follow depth of normalized issue support.
- `FD-STR-016-FR-006` — Brand trust SHALL be protected by refusing unsafe auto-fix claims.

## Non-functional Requirements

- `FD-STR-016-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-016-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-016-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-016-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-016-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-016-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- Competitor copies workflow.
- Data cannot be pooled across tenants.
- Platform standardizes issue schemas.

## Accessibility

- `FD-STR-016-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-016-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-016-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-016-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-016-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-016-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-016-AC-001` — Moats compound over time.
- `FD-STR-016-AC-002` — Moat does not depend solely on proprietary AI.
- `FD-STR-016-AC-003` — Privacy boundaries are explicit.

## Related Documents

- data-moat-strategy.md
- ethical-product-boundaries.md

## Open External Dependencies

- `FD-STR-016-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
