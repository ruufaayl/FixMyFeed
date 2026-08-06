---
document_id: FD-STR-014
title: "Competitor Capability Matrix"
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

# Competitor Capability Matrix

## Purpose

Define the capability dimensions used to compare alternatives without relying on superficial feature lists.

## Scope

Direct and adjacent competitors.

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

- `FD-STR-014-FR-001` — The matrix SHALL compare issue coverage, evidence quality, source localization, deterministic validation, repair safety, preview, approval, rollback, verification, monitoring, portfolio management, API access, audit, public tools, and content depth.
- `FD-STR-014-FR-002` — Capabilities SHALL be scored as Verified, Claimed, Partial, Unknown, or Absent.
- `FD-STR-014-FR-003` — Vendor marketing claims SHALL not be scored as verified product behavior without supporting evidence.
- `FD-STR-014-FR-004` — Comparisons SHALL record date and source.
- `FD-STR-014-FR-005` — Scoring SHALL not use a single weighted total that hides strategic tradeoffs.

## Non-functional Requirements

- `FD-STR-014-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-014-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-014-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-014-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-014-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-014-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- Capability is beta.
- Feature only exists on enterprise plan.
- Documentation and product differ.

## Accessibility

- `FD-STR-014-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-014-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-014-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-014-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-014-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-014-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-014-AC-001` — Matrix dimensions align with strategy.
- `FD-STR-014-AC-002` — Evidence status is visible.
- `FD-STR-014-AC-003` — Unknown is not treated as absent.

## Related Documents

- competitive-landscape.md
- market-evidence-register.md

## Open External Dependencies

- `FD-STR-014-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
