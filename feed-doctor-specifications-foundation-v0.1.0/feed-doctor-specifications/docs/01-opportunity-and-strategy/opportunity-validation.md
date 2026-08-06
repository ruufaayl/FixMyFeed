---
document_id: FD-STR-001
title: "Opportunity Validation"
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

# Opportunity Validation

## Executive Decision

**GO.** Feed Doctor is a justified production-scale SaaS opportunity provided it is built as an issue-intelligence, safe-remediation, and prevention platform rather than as a generic feed distributor.

## Evidence Summary

| Evidence | Observation | Strategic Interpretation |
|---|---|---|
| Shopify scale | Shopify reported substantial 2025 GMV and continued growth in its SEC filings. | Shopify is large enough to support a specialized merchant-operations category. |
| WooCommerce scale | WooCommerce reports more than 4.1 million live installations, based on an attributed ecosystem estimate. | The self-hosted market is large and operationally fragmented, increasing diagnostic need. |
| Google issue APIs | Merchant API exposes account and product issues, processed product state, impacted destinations, and resolution content. | A third-party diagnostics product is technically feasible. |
| Restricted actions | Google's `triggeraction` capability is allowlisted. | The product must distinguish detection, guidance, writeback, redirection, and platform-controlled action. |
| Competitor validation | DataFeedWatch reports 18,497 shops; Channable markets broad feed management and repair capabilities. | Merchants pay for feed operations, but the broad category is crowded. |
| SEO signal | Semrush estimated 22.11K monthly organic visits for DataFeedWatch in May 2026 and commercially valuable Merchant Center rankings. | Search can acquire qualified users, but estimates are directional. |
| AI-search risk | 2026 research estimated traffic reduction for Wikipedia pages exposed to AI Overviews. | Public pages must contain tools, evidence, and workflow completion rather than commodity prose. |

## Evidence Classification

- Platform and API behavior relies on primary Google documentation.
- Shopify scale relies on issuer filings with the U.S. SEC.
- WooCommerce scale is a first-party publication citing a third-party estimate.
- Competitor customer counts are first-party vendor claims.
- SEO traffic and keyword values are third-party modelled estimates.
- All mutable evidence must be refreshed according to `market-evidence-register.md`.

## Purpose

Determine whether Feed Doctor has sufficient market size, pain severity, technical feasibility, distribution potential, and defensible differentiation to justify full production specification.

## Scope

Shopify, WooCommerce, Google Merchant Center, feed operations, issue remediation, and SEO-led acquisition.

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

- `FD-STR-001-FR-001` — Feed Doctor SHALL proceed as a production-scale SaaS opportunity.
- `FD-STR-001-FR-002` — Feed Doctor SHALL position issue intelligence, deterministic diagnosis, safe repair, verification, and prevention as its primary category.
- `FD-STR-001-FR-003` — Feed Doctor SHALL NOT enter the market as a generic feed-syndication clone.
- `FD-STR-001-FR-004` — Shopify and WooCommerce SHALL be the initial source platforms.
- `FD-STR-001-FR-005` — Google Merchant Center SHALL be the first destination channel.
- `FD-STR-001-FR-006` — Public SEO content SHALL connect directly to diagnostic or repair workflows.
- `FD-STR-001-FR-007` — Automated actions SHALL distinguish store-side, feed-side, account-side, review-side, and platform-controlled actions.
- `FD-STR-001-FR-008` — Market validation SHALL be re-run when a defined invalidation trigger occurs.

## Non-functional Requirements

- `FD-STR-001-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-001-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-001-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-001-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-001-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-001-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- Third-party traffic estimates are inaccurate.
- Google changes API access or issue-resolution scope.
- A platform bundles equivalent safe remediation natively.
- SEO click-through declines materially.

## Accessibility

- `FD-STR-001-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-001-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-001-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-001-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-001-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-001-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-001-AC-001` — The opportunity has explicit go and no-go criteria.
- `FD-STR-001-AC-002` — All load-bearing claims reference registered evidence.
- `FD-STR-001-AC-003` — The category boundary excludes generic feed management as the primary identity.
- `FD-STR-001-AC-004` — Invalidation triggers and strategic responses are documented.

## Related Documents

- market-evidence-register.md
- addressable-market-model.md
- category-definition.md
- strategic-wedge.md
- competitive-landscape.md

## Open External Dependencies

- `FD-STR-001-OPS-001` — Google Merchant API access, Shopify app review, WooCommerce distribution, and external search behavior remain mutable dependencies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
