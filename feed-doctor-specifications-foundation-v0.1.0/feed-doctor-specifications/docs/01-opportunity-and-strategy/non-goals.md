---
document_id: FD-STR-036
title: "Non-goals"
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

# Non-goals

## Purpose

Define capabilities intentionally outside the initial and primary product scope.

## Scope

Adjacent commerce software categories.

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

- `FD-STR-036-FR-001` — Feed Doctor SHALL not initially provide full omnichannel order management.
- `FD-STR-036-FR-002` — It SHALL not initially replace a PIM or ERP.
- `FD-STR-036-FR-003` — It SHALL not initially manage ad bids or campaign budgets.
- `FD-STR-036-FR-004` — It SHALL not initially become a marketplace listing operations suite.
- `FD-STR-036-FR-005` — It SHALL not initially offer consumer personalization.
- `FD-STR-036-FR-006` — It SHALL not initially scrape private merchant accounts without authorization.
- `FD-STR-036-FR-007` — Future inclusion SHALL require an RFC proving category fit and architecture compatibility.

## Non-functional Requirements

- `FD-STR-036-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-036-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-036-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-036-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-036-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-036-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- A repair requires supplemental data.
- A customer asks for feed export to another channel.
- An adjacent feature supports diagnosis.

## Accessibility

- `FD-STR-036-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-036-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-036-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-036-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-036-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-036-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-036-AC-001` — Boundaries are clear but permit justified dependencies.
- `FD-STR-036-AC-002` — Adjacent requests have an evaluation path.
- `FD-STR-036-AC-003` — No hidden roadmap promise exists.

## Related Documents

- anti-goals.md
- future-expansion/README.md

## Open External Dependencies

- `FD-STR-036-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
