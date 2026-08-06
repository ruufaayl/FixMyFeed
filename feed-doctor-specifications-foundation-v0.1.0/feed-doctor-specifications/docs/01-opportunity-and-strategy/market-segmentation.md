---
document_id: FD-STR-004
title: "Market Segmentation"
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

# Market Segmentation

## Purpose

Define segments by operational need, catalog complexity, risk, and buying motion.

## Scope

Merchant owners, ecommerce teams, agencies, enterprises, developers, and feed specialists.

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

- `FD-STR-004-FR-001` — Segments SHALL be based on workflow and pain, not company size alone.
- `FD-STR-004-FR-002` — Primary initial segments SHALL be growth-stage Shopify merchants, WooCommerce operators with feed complexity, and performance agencies managing multiple Merchant Center accounts.
- `FD-STR-004-FR-003` — Enterprise shall be supported architecturally from inception but sold through a distinct motion.
- `FD-STR-004-FR-004` — Segments SHALL include catalog size, market count, issue frequency, technical capacity, approval needs, and willingness to automate.
- `FD-STR-004-FR-005` — Each segment SHALL map to jobs, features, pricing, onboarding, support, and acquisition channels.

## Non-functional Requirements

- `FD-STR-004-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-004-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-004-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-004-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-004-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-004-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- A small store has enterprise-level complexity.
- An agency is both reseller and direct user.
- A merchant has several brands and accounts.

## Accessibility

- `FD-STR-004-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-004-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-004-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-004-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-004-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-004-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-004-AC-001` — Each segment has qualification rules.
- `FD-STR-004-AC-002` — Primary and secondary segments are ranked.
- `FD-STR-004-AC-003` — Segment needs map to product capabilities.

## Related Documents

- user-segmentation.md
- pricing-principles.md
- agency-channel-strategy.md

## Open External Dependencies

- `FD-STR-004-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
