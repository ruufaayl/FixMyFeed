---
document_id: FD-ROOT-010
title: "External Source Register"
status: "Draft Complete"
version: "1.0.0"
owner: "Documentation Architecture"
reviewers:
  - Product Architecture
  - Security Architecture
  - Quality Engineering
classification: "Internal"
last_reviewed: "2026-08-06"
next_review_due: "2026-11-06"
---

# External Source Register

## Purpose

Track authoritative external sources that constrain product behavior, compliance, integrations, SEO content, and market assertions.

## Scope

Official platform documentation, standards, laws, vendor contracts, and approved research sources.

## Dependencies

- docs/00-governance/citation-and-evidence-policy.md
- OPEN_EXTERNAL_DEPENDENCIES.md

## Inputs

- Source URL or identifier
- Publisher
- Authority classification
- Retrieved date
- Affected documents

## Outputs

- Versioned source records with freshness and ownership metadata

## Functional Requirements

- `FD-ROOT-010-FR-001` — Each external source must record publisher, title, location, authority level, retrieval date, owner, review cadence, and dependent documents.
- `FD-ROOT-010-FR-002` — Official primary sources are required for API, policy, legal, and security behavior where available.
- `FD-ROOT-010-FR-003` — Third-party market estimates must be labeled estimates and must not be treated as platform truth.
- `FD-ROOT-010-FR-004` — Changed sources must trigger downstream review.
- `FD-ROOT-010-FR-005` — Unavailable sources must be preserved by citation metadata and replacement analysis where legally permitted.

## Non-functional Requirements

- `FD-ROOT-010-NFR-001` — The register must support automated freshness alerts.

## Data Requirements

- `FD-ROOT-010-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-ROOT-010-VAL-001` — Mutable sources require review cadences.
- `FD-ROOT-010-VAL-002` — Claims cannot cite missing source records.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-ROOT-010-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-ROOT-010-ERR-001` — Stale critical sources, inaccessible required sources, and unsupported claims block affected approvals.

## Success States

- `FD-ROOT-010-STATE-002` — Every externally constrained behavior has identifiable evidence and a refresh owner.

## Edge Cases

- Documentation moves URLs.
- Vendor docs change without versioning.
- Two official sources conflict.
- A source is jurisdiction-specific.

## Accessibility

- `FD-ROOT-010-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-ROOT-010-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-ROOT-010-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-ROOT-010-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-ROOT-010-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-ROOT-010-TEST-001` — Scheduled source freshness audit.
- `FD-ROOT-010-TEST-002` — Reference integrity validation.

## Acceptance Criteria

- `FD-ROOT-010-AC-001` — All externally constrained approved documents reference registered sources.
- `FD-ROOT-010-AC-002` — Critical sources have active review cadences.
- `FD-ROOT-010-AC-003` — Third-party estimates are explicitly qualified.

## Related Documents

- OPEN_EXTERNAL_DEPENDENCIES.md
- docs/00-governance/external-dependency-policy.md

## Open External Dependencies

- `FD-ROOT-010-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |

## Registered Sources

| Source ID | Authority | Publisher | Title | Retrieved | Refresh | Primary Use |
|---|---|---|---|---|---|---|
| EXT-SHOPIFY-10K-2025 | Primary regulatory filing | Shopify / U.S. SEC | Shopify 2025 Form 10-K | 2026-08-06 | Annual | Platform scale, GMV, financial context |
| EXT-SHOPIFY-Q4-2025 | Primary issuer filing | Shopify / U.S. SEC | Shopify Q4 and FY2025 results | 2026-08-06 | Annual | FY2025 revenue and growth context |
| EXT-WOO-NEWSROOM-2026 | First-party with attributed estimate | WooCommerce | WooCommerce in numbers | 2026-08-06 | Quarterly | Installed base and ecosystem scale |
| EXT-GMC-RENDER-ISSUES | Primary platform documentation | Google | Display issues and solutions to businesses | 2026-08-06 | Monthly | In-app diagnostics and allowlisted actions |
| EXT-GMC-VIEW-ISSUES | Primary platform documentation | Google | View issues impacting a merchant account | 2026-08-06 | Monthly | Account issue API capabilities |
| EXT-GMC-LATEST-UPDATES | Primary platform documentation | Google | Merchant API latest updates | 2026-08-06 | Weekly | API lifecycle and change monitoring |
| EXT-GMC-PRODUCT-MIGRATION | Primary platform documentation | Google | Merchant API product migration | 2026-08-06 | Monthly | ProductInput/Product processed-state model |
| EXT-GMC-HELP-API | Primary platform documentation | Google | Merchant API overview | 2026-08-06 | Quarterly | Merchant API scope |
| EXT-DFW-ABOUT-2026 | First-party vendor claim | DataFeedWatch | About DataFeedWatch | 2026-08-06 | Quarterly | Competitor scale and positioning |
| EXT-DFW-SEMRUSH-2026-05 | Third-party estimate | Semrush | datafeedwatch.com traffic and search estimates, May 2026 | 2026-08-06 | Monthly | Directional SEO validation |
| EXT-CHANNABLE-FEEDS-2026 | First-party vendor claim | Channable | Product feed management | 2026-08-06 | Quarterly | Competitive capability surface |
| EXT-ADNABU-SHOPIFY-REVIEWS-2026 | Platform-hosted customer reviews | Shopify App Store | Nabu for Google Shopping Feed reviews | 2026-08-06 | Monthly | Adoption signal and failure-mode discovery |
| EXT-AIO-WIKIPEDIA-2026 | Primary research preprint | Khosravi and Yoganarasimhan | Impact of AI Search Summaries on Website Traffic | 2026-08-06 | One-time review | Zero-click and answer-engine risk |

## Source Locations

| Source ID | Location |
|---|---|
| EXT-SHOPIFY-10K-2025 | https://www.sec.gov/Archives/edgar/data/1594805/000159480526000007/shop-20251231.htm |
| EXT-SHOPIFY-Q4-2025 | https://www.sec.gov/Archives/edgar/data/1594805/000159480526000006/exhibit991pressreleaseq420.htm |
| EXT-WOO-NEWSROOM-2026 | https://woocommerce.com/newsroom/ |
| EXT-GMC-RENDER-ISSUES | https://developers.google.com/merchant/api/guides/accounts/render-issues |
| EXT-GMC-VIEW-ISSUES | https://developers.google.com/merchant/api/guides/accounts/view-issues |
| EXT-GMC-LATEST-UPDATES | https://developers.google.com/merchant/api/latest-updates |
| EXT-GMC-PRODUCT-MIGRATION | https://developers.google.com/merchant/api/guides/compatibility/products |
| EXT-GMC-HELP-API | https://support.google.com/merchants/answer/16494522 |
| EXT-DFW-ABOUT-2026 | https://www.datafeedwatch.com/about-us |
| EXT-DFW-SEMRUSH-2026-05 | https://www.semrush.com/website/datafeedwatch.com/overview/ |
| EXT-CHANNABLE-FEEDS-2026 | https://www.channable.com/products/product-feed-management-tool |
| EXT-ADNABU-SHOPIFY-REVIEWS-2026 | https://apps.shopify.com/google-shopping-feed-2/reviews |
| EXT-AIO-WIKIPEDIA-2026 | https://arxiv.org/abs/2602.18455 |
