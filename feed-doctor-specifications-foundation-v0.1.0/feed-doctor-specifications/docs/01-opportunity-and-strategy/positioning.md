---
document_id: FD-STR-010
title: "Positioning"
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

# Positioning

## Purpose

Define how Feed Doctor is presented relative to alternatives.

## Scope

Merchant, agency, and enterprise buying contexts.

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

- `FD-STR-010-FR-001` — Feed Doctor SHALL be positioned as the system that finds why products are at risk, proves the cause, and safely repairs the correct source.
- `FD-STR-010-FR-002` — Positioning SHALL contrast opaque auto-fixes with explainable and reversible remediation.
- `FD-STR-010-FR-003` — Merchant positioning SHALL emphasize saved revenue and time.
- `FD-STR-010-FR-004` — Agency positioning SHALL emphasize portfolio visibility, repeatable controls, and client evidence.
- `FD-STR-010-FR-005` — Enterprise positioning SHALL emphasize governance, approvals, auditability, and scale.
- `FD-STR-010-FR-006` — SEO positioning SHALL match one workflow per page.

## Non-functional Requirements

- `FD-STR-010-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-010-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-010-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-010-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-010-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-010-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- Customer expects a generic feed tool.
- Competitor claims equivalent auto-fix.
- Merchant has no technical team.

## Accessibility

- `FD-STR-010-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-010-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-010-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-010-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-010-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-010-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-010-AC-001` — Primary message, proof, and objection handling are segment-specific.
- `FD-STR-010-AC-002` — Claims are supportable.
- `FD-STR-010-AC-003` — Category language remains consistent.

## Related Documents

- value-proposition.md
- competitive-landscape.md

## Open External Dependencies

- `FD-STR-010-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
