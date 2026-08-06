---
document_id: FD-STR-002
title: "Market Evidence Register"
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

# Market Evidence Register

## Evidence Records

| Evidence ID | Source ID | Claim Type | Current Observation | Confidence | Refresh Trigger |
|---|---|---|---|---|---|
| EVD-001 | EXT-SHOPIFY-10K-2025 | Platform scale | Shopify facilitated a very large 2025 commerce volume and grew year over year. | High | New annual filing |
| EVD-002 | EXT-WOO-NEWSROOM-2026 | Installed base | WooCommerce publishes 4.1M+ live installations, attributed to StoreLeads. | Medium | Quarterly refresh |
| EVD-003 | EXT-GMC-RENDER-ISSUES | API capability | Third-party apps can render issue-resolution content; action triggering is allowlisted. | High | Google documentation change |
| EVD-004 | EXT-GMC-VIEW-ISSUES | API capability | Account issues include severity, details, documentation, and impacted destinations. | High | Google documentation change |
| EVD-005 | EXT-GMC-PRODUCT-MIGRATION | Data model | Submitted product data is separated from Google's processed product state. | High | API version change |
| EVD-006 | EXT-DFW-ABOUT-2026 | Competitor adoption | DataFeedWatch reports 18,497 online shops and 2,000+ channels. | Medium | Vendor claim changes |
| EVD-007 | EXT-CHANNABLE-FEEDS-2026 | Competitor capability | Channable markets bulk error fixing, rules, AI assistance, previews, and 3,000+ channels. | Medium | Product page change |
| EVD-008 | EXT-DFW-SEMRUSH-2026-05 | SEO signal | Semrush estimated 22.11K organic visits and 4.54K referring domains for DataFeedWatch in May 2026. | Low to Medium | Monthly refresh |
| EVD-009 | EXT-ADNABU-SHOPIFY-REVIEWS-2026 | User pain signal | Reviews include concerns around sync, price, variant image, title, and support failures. | Medium for hypothesis generation | Monthly sampling |
| EVD-010 | EXT-AIO-WIKIPEDIA-2026 | Search risk | Research found AI Overview exposure reduced traffic to matched Wikipedia pages in the studied setting. | Medium | Peer review or replication |

## Interpretation Rules

Evidence records validate direction, not guaranteed revenue. First-party vendor claims do not independently prove customer satisfaction. Negative reviews identify failure modes but do not establish population-level frequency. Third-party SEO estimates must never be used as accounting-grade traffic data.

## Purpose

Maintain the evidence set used to justify the opportunity and constrain strategic decisions.

## Scope

Market size, platform capability, competitor adoption, customer pain, SEO potential, and search risk.

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

- `FD-STR-002-FR-001` — Every strategic market claim SHALL reference an evidence ID.
- `FD-STR-002-FR-002` — Evidence SHALL be classified by source authority and confidence.
- `FD-STR-002-FR-003` — First-party vendor claims SHALL be labelled as vendor claims.
- `FD-STR-002-FR-004` — Third-party modelled estimates SHALL be labelled as estimates.
- `FD-STR-002-FR-005` — Customer reviews SHALL be used for failure-mode discovery, not prevalence claims.
- `FD-STR-002-FR-006` — Stale evidence SHALL trigger review of dependent decisions.

## Non-functional Requirements

- `FD-STR-002-NFR-001` — Strategic decisions must be measurable, traceable, and revisited when their evidence triggers change.

## Data Requirements

- `FD-STR-002-DATA-001` — Quantitative claims must record source, date, methodology class, and confidence.

## Validation Rules

- `FD-STR-002-VAL-001` — Decisions must not conflict with the approved product thesis or category boundary.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-STR-002-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-STR-002-ERR-001` — Unsupported market claims and internally contradictory decisions block approval.

## Success States

- `FD-STR-002-STATE-002` — Downstream teams can use this document without inventing business assumptions.

## Edge Cases

- A source disappears.
- A vendor changes a public customer count.
- An API capability enters preview or deprecation.
- Two SEO tools materially disagree.

## Accessibility

- `FD-STR-002-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-STR-002-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-STR-002-SEC-001` — Strategy must not require unsafe access, policy evasion, hidden writeback, or collection of unnecessary merchant data.

## Privacy Requirements

- `FD-STR-002-PRIV-001` — Market and product strategy must minimize collection of customer and end-consumer personal data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-STR-002-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-STR-002-TEST-001` — Review strategic assumptions against evidence and defined invalidation triggers at least quarterly.

## Acceptance Criteria

- `FD-STR-002-AC-001` — All load-bearing market claims have evidence records.
- `FD-STR-002-AC-002` — Each evidence record has a refresh trigger and owner.
- `FD-STR-002-AC-003` — Confidence labels match source quality.

## Related Documents

- opportunity-validation.md
- EXTERNAL_SOURCE_REGISTER.md
- competitive-landscape.md

## Open External Dependencies

- `FD-STR-002-OPS-001` — External platform capabilities remain subject to the registered source and dependency policies.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
