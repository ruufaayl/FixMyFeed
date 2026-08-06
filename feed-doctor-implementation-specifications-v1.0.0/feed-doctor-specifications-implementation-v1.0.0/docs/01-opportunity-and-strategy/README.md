---
document_id: FD-STR-000
title: "Opportunity and Strategy"
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

# Opportunity and Strategy


## Strategic Function

This directory converts market evidence and the approved Feed Doctor thesis into constraints that product, architecture, UX, SEO, go-to-market, billing, and operations must follow.

## Binding Strategy Summary

Feed Doctor will compete as a product-feed issue intelligence and remediation system. It will use Shopify and WooCommerce as initial source platforms and Google Merchant Center as the first destination channel. It will differentiate through deterministic diagnosis, evidence-backed explanations, safe repair, approval, verification, rollback, continuous monitoring, and workflow-specific public tools.

Generic feed syndication, campaign management, PIM functionality, and unreviewed AI-generated changes are outside the primary category boundary.
## Purpose

Index the approved opportunity and strategy specification family.

## Scope

All documents in `docs/01-opportunity-and-strategy`.

## Dependencies

- README.md
- docs/00-governance/documentation-charter.md

## Inputs

- Market evidence
- Product thesis
- Strategic decisions

## Outputs

- Strategy index
- Binding product constraints

## Functional Requirements

- `FD-STR-000-FR-001` — The strategy family SHALL define the opportunity, category, target segments, wedge, moat, distribution, business model, metrics, risks, and anti-goals.

## Non-functional Requirements

- `FD-STR-000-NFR-001` — Strategy documents must be internally consistent and evidence-backed.

## Data Requirements

- `FD-STR-000-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-STR-000-VAL-001` — All quantitative claims must trace to the market evidence register.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-000-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-000-ERR-001` — Conflicting positioning or category definitions block downstream approval.

## Success States

- `FD-STR-000-STATE-002` — Product and architecture teams can derive priorities without business ambiguity.

## Edge Cases

- New platform capabilities change the competitive boundary.
- SEO traffic declines while product demand remains strong.
- A competitor copies a visible feature but not the operating model.

## Accessibility

- `FD-STR-000-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-000-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-000-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-STR-000-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-000-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-000-TEST-001` — Quarterly strategy coherence review.

## Acceptance Criteria

- `FD-STR-000-AC-001` — The complete strategy family is indexed.
- `FD-STR-000-AC-002` — Dependencies on external estimates are qualified.
- `FD-STR-000-AC-003` — Downstream constraints are explicit.

## Related Documents

- opportunity-validation.md
- product-vision.md
- category-definition.md
- strategic-wedge.md

## Open External Dependencies

- `FD-STR-000-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
