---
document_id: FD-ROOT-002
title: "Documentation Manifest"
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

# Documentation Manifest

## Purpose

This manifest records every required specification artifact, its ownership, maturity, approval state, dependencies, and implementation authority.

## Scope

All files in the Feed Doctor specification repository, including generated issue and attribute specifications.

## Dependencies

- README.md
- SPECIFICATION_COVERAGE_MATRIX.md
- DOCUMENT_OWNERSHIP.md
- docs/00-governance/specification-versioning.md

## Inputs

- Approved repository tree
- Document metadata
- Review decisions
- Dependency changes

## Outputs

- Machine-readable and human-readable completion status
- Lists of blocked, stale, superseded, and approved documents

## Functional Requirements

- `FD-ROOT-002-FR-001` — Each document must have one manifest row keyed by immutable document ID.
- `FD-ROOT-002-FR-002` — Manifest states are Planned, Draft, In Review, Approved Baseline, Implementation Diverged, Deprecated, and Superseded.
- `FD-ROOT-002-FR-003` — A document may be Approved Baseline only after required reviewers approve and all blocking references resolve.
- `FD-ROOT-002-FR-004` — The manifest must identify the implementation authority version.
- `FD-ROOT-002-FR-005` — Generated families may use a registry row plus per-instance rows.
- `FD-ROOT-002-FR-006` — Removal of a document requires a superseding document or explicit scope deletion decision.

## Non-functional Requirements

- `FD-ROOT-002-NFR-001` — The manifest must be deterministically sortable and diff-friendly.
- `FD-ROOT-002-NFR-002` — The manifest must be consumable by CI without parsing prose.

## Data Requirements

- `FD-ROOT-002-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-ROOT-002-VAL-001` — Document IDs must be unique.
- `FD-ROOT-002-VAL-002` — Paths must exist for every non-Planned item.
- `FD-ROOT-002-VAL-003` — Approved documents must not depend on Draft documents unless a recorded waiver exists.
- `FD-ROOT-002-VAL-004` — Review dates must not be in the past without a stale status.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-ROOT-002-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-ROOT-002-ERR-001` — Duplicate IDs, missing paths, circular blocking dependencies, and invalid states fail CI.

## Success States

- `FD-ROOT-002-STATE-002` — Every repository artifact has a visible lifecycle state and accountable owner.

## Edge Cases

- Renamed files without updated manifest entries.
- Split or merged specifications.
- Generated issue pages that are withdrawn by an upstream platform.
- A document that is approved but becomes factually stale due to an external API change.

## Accessibility

- `FD-ROOT-002-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-ROOT-002-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-ROOT-002-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-ROOT-002-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-ROOT-002-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-ROOT-002-TEST-001` — CI must compare filesystem paths, front matter, and manifest entries.
- `FD-ROOT-002-TEST-002` — CI must fail on orphaned approved documents.

## Acceptance Criteria

- `FD-ROOT-002-AC-001` — Every current file has one manifest entry.
- `FD-ROOT-002-AC-002` — No Approved Baseline entry has unresolved blocking dependencies.
- `FD-ROOT-002-AC-003` — The manifest can identify all documents required to implement any feature.

## Related Documents

- SPECIFICATION_COVERAGE_MATRIX.md
- REQUIREMENTS_TRACEABILITY_MATRIX.md
- docs/00-governance/document-id-convention.md

## Open External Dependencies

- `FD-ROOT-002-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |

## Current File Manifest

| Document ID | Path | Title | Status | Owner |
|---|---|---|---|---|
| FD-ROOT-008 | CHANGELOG.md | Specification Changelog | Draft Complete | Documentation Architecture |
| FD-ROOT-007 | DECISION_LOG.md | Decision Log | Draft Complete | Documentation Architecture |
| FD-ROOT-005 | DEPENDENCY_GRAPH.md | Specification Dependency Graph | Draft Complete | Documentation Architecture |
| FD-ROOT-002 | DOCUMENTATION_MANIFEST.md | Documentation Manifest | Draft Complete | Documentation Architecture |
| FD-ROOT-009 | DOCUMENT_OWNERSHIP.md | Document Ownership Registry | Draft Complete | Documentation Architecture |
| FD-ROOT-010 | EXTERNAL_SOURCE_REGISTER.md | External Source Register | Draft Complete | Documentation Architecture |
| FD-ROOT-012 | FILE_INVENTORY.md | File Inventory | Draft Complete | Documentation Architecture |
| FD-ROOT-006 | GLOSSARY.md | Canonical Glossary | Draft Complete | Documentation Architecture |
| FD-ROOT-011 | OPEN_EXTERNAL_DEPENDENCIES.md | Open External Dependencies | Draft Complete | Documentation Architecture |
| FD-ROOT-013 | QUALITY_REPORT.md | Governance Tranche Quality Report | Draft Complete | Quality Engineering |
| FD-ROOT-001 | README.md | Feed Doctor Production Specification Repository | Draft Complete | Documentation Architecture |
| FD-ROOT-004 | REQUIREMENTS_TRACEABILITY_MATRIX.md | Requirements Traceability Matrix | Draft Complete | Documentation Architecture |
| FD-ROOT-003 | SPECIFICATION_COVERAGE_MATRIX.md | Specification Coverage Matrix | Draft Complete | Documentation Architecture |
| FD-GOV-000 | docs/00-governance/README.md | Documentation Governance | Draft Complete | Architecture Council |
| FD-GOV-018 | docs/00-governance/adr-template.md | Architecture Decision Record Template | Draft Complete | Documentation Architecture |
| FD-GOV-012 | docs/00-governance/algorithm-specification-template.md | Algorithm Specification Template | Draft Complete | Documentation Architecture |
| FD-GOV-021 | docs/00-governance/analytics-event-template.md | Analytics Event Specification Template | Draft Complete | Documentation Architecture |
| FD-GOV-008 | docs/00-governance/api-contract-template.md | API Contract Template | Draft Complete | Documentation Architecture |
| FD-GOV-040 | docs/00-governance/api-definition-of-done.md | API Definition of Done | Draft Complete | Documentation Architecture |
| FD-GOV-030 | docs/00-governance/change-control-process.md | Specification Change Control Process | Draft Complete | Documentation Architecture |
| FD-GOV-026 | docs/00-governance/citation-and-evidence-policy.md | Citation and Evidence Policy | Draft Complete | Documentation Architecture |
| FD-GOV-007 | docs/00-governance/component-specification-template.md | Component Specification Template | Draft Complete | Documentation Architecture |
| FD-GOV-035 | docs/00-governance/contradiction-resolution-policy.md | Contradiction Resolution Policy | Draft Complete | Documentation Architecture |
| FD-GOV-025 | docs/00-governance/cross-reference-policy.md | Cross-Reference Policy | Draft Complete | Documentation Architecture |
| FD-GOV-041 | docs/00-governance/database-definition-of-done.md | Database Definition of Done | Draft Complete | Documentation Architecture |
| FD-GOV-011 | docs/00-governance/database-table-template.md | Database Table Specification Template | Draft Complete | Documentation Architecture |
| FD-GOV-032 | docs/00-governance/deprecation-policy.md | Specification and Capability Deprecation Policy | Draft Complete | Documentation Architecture |
| FD-GOV-028 | docs/00-governance/diagramming-standard.md | Diagramming Standard | Draft Complete | Documentation Architecture |
| FD-GOV-023 | docs/00-governance/document-id-convention.md | Document Identifier Convention | Draft Complete | Documentation Architecture |
| FD-GOV-003 | docs/00-governance/document-template.md | General Document Template | Draft Complete | Documentation Architecture |
| FD-GOV-001 | docs/00-governance/documentation-charter.md | Documentation Charter | Draft Complete | Documentation Architecture |
| FD-GOV-043 | docs/00-governance/documentation-raci.md | Documentation RACI | Draft Complete | Documentation Architecture |
| FD-GOV-009 | docs/00-governance/event-contract-template.md | Event Contract Template | Draft Complete | Documentation Architecture |
| FD-GOV-033 | docs/00-governance/external-dependency-policy.md | External Dependency Policy | Draft Complete | Documentation Architecture |
| FD-GOV-038 | docs/00-governance/feature-definition-of-done.md | Feature Definition of Done | Draft Complete | Documentation Architecture |
| FD-GOV-004 | docs/00-governance/feature-specification-template.md | Feature Specification Template | Draft Complete | Documentation Architecture |
| FD-GOV-013 | docs/00-governance/integration-specification-template.md | Integration Specification Template | Draft Complete | Documentation Architecture |
| FD-GOV-027 | docs/00-governance/normative-language-standard.md | Normative Language Standard | Draft Complete | Documentation Architecture |
| FD-GOV-039 | docs/00-governance/page-definition-of-done.md | Page Definition of Done | Draft Complete | Documentation Architecture |
| FD-GOV-006 | docs/00-governance/page-specification-template.md | Page Specification Template | Draft Complete | Documentation Architecture |
| FD-GOV-042 | docs/00-governance/release-definition-of-done.md | Release Definition of Done | Draft Complete | Documentation Architecture |
| FD-GOV-022 | docs/00-governance/requirements-id-convention.md | Requirements Identifier Convention | Draft Complete | Documentation Architecture |
| FD-GOV-031 | docs/00-governance/review-and-approval-workflow.md | Review and Approval Workflow | Draft Complete | Documentation Architecture |
| FD-GOV-019 | docs/00-governance/rfc-template.md | Request for Comments Template | Draft Complete | Documentation Architecture |
| FD-GOV-017 | docs/00-governance/runbook-template.md | Operational Runbook Template | Draft Complete | Documentation Architecture |
| FD-GOV-014 | docs/00-governance/security-control-template.md | Security Control Specification Template | Draft Complete | Documentation Architecture |
| FD-GOV-020 | docs/00-governance/seo-page-template.md | SEO Page Specification Template | Draft Complete | Documentation Architecture |
| FD-GOV-002 | docs/00-governance/source-of-truth-hierarchy.md | Source of Truth Hierarchy | Draft Complete | Documentation Architecture |
| FD-GOV-037 | docs/00-governance/specification-completeness-checklist.md | Specification Completeness Checklist | Draft Complete | Documentation Architecture |
| FD-GOV-036 | docs/00-governance/specification-lint-rules.md | Specification Lint Rules | Draft Complete | Documentation Architecture |
| FD-GOV-029 | docs/00-governance/specification-versioning.md | Specification Versioning | Draft Complete | Documentation Architecture |
| FD-GOV-024 | docs/00-governance/terminology-and-language-standard.md | Terminology and Language Standard | Draft Complete | Documentation Architecture |
| FD-GOV-016 | docs/00-governance/test-plan-template.md | Test Plan Template | Draft Complete | Documentation Architecture |
| FD-GOV-015 | docs/00-governance/threat-model-template.md | Threat Model Template | Draft Complete | Documentation Architecture |
| FD-GOV-034 | docs/00-governance/unresolved-question-policy.md | Unresolved Question Policy | Draft Complete | Documentation Architecture |
| FD-GOV-010 | docs/00-governance/webhook-contract-template.md | Webhook Contract Template | Draft Complete | Documentation Architecture |
| FD-GOV-005 | docs/00-governance/workflow-specification-template.md | Workflow Specification Template | Draft Complete | Documentation Architecture |
| FD-STR-000 | docs/01-opportunity-and-strategy/README.md | Opportunity and Strategy | Draft Complete | Product Strategy |
| FD-STR-003 | docs/01-opportunity-and-strategy/addressable-market-model.md | Addressable Market Model | Draft Complete | Product Strategy |
| FD-STR-021 | docs/01-opportunity-and-strategy/agency-channel-strategy.md | Agency Channel Strategy | Draft Complete | Product Strategy |
| FD-STR-035 | docs/01-opportunity-and-strategy/anti-goals.md | Anti-goals | Draft Complete | Product Strategy |
| FD-STR-032 | docs/01-opportunity-and-strategy/business-kpi-tree.md | Business KPI Tree | Draft Complete | Product Strategy |
| FD-STR-025 | docs/01-opportunity-and-strategy/business-model.md | Business Model | Draft Complete | Product Strategy |
| FD-STR-009 | docs/01-opportunity-and-strategy/category-definition.md | Category Definition | Draft Complete | Product Strategy |
| FD-STR-013 | docs/01-opportunity-and-strategy/competitive-landscape.md | Competitive Landscape | Draft Complete | Product Strategy |
| FD-STR-014 | docs/01-opportunity-and-strategy/competitor-capability-matrix.md | Competitor Capability Matrix | Draft Complete | Product Strategy |
| FD-STR-015 | docs/01-opportunity-and-strategy/competitor-seo-analysis.md | Competitor SEO Analysis | Draft Complete | Product Strategy |
| FD-STR-029 | docs/01-opportunity-and-strategy/cost-driver-model.md | Cost Driver Model | Draft Complete | Product Strategy |
| FD-STR-017 | docs/01-opportunity-and-strategy/data-moat-strategy.md | Data Moat Strategy | Draft Complete | Product Strategy |
| FD-STR-016 | docs/01-opportunity-and-strategy/differentiation-and-moat.md | Differentiation and Moat | Draft Complete | Product Strategy |
| FD-STR-018 | docs/01-opportunity-and-strategy/distribution-strategy.md | Distribution Strategy | Draft Complete | Product Strategy |
| FD-STR-023 | docs/01-opportunity-and-strategy/enterprise-strategy.md | Enterprise Strategy | Draft Complete | Product Strategy |
| FD-STR-037 | docs/01-opportunity-and-strategy/ethical-product-boundaries.md | Ethical Product Boundaries | Draft Complete | Product Strategy |
| FD-STR-024 | docs/01-opportunity-and-strategy/global-expansion-strategy.md | Global Expansion Strategy | Draft Complete | Product Strategy |
| FD-STR-038 | docs/01-opportunity-and-strategy/long-term-product-horizon.md | Long-term Product Horizon | Draft Complete | Product Strategy |
| FD-STR-034 | docs/01-opportunity-and-strategy/market-entry-risks.md | Market Entry Risks | Draft Complete | Product Strategy |
| FD-STR-002 | docs/01-opportunity-and-strategy/market-evidence-register.md | Market Evidence Register | Draft Complete | Product Strategy |
| FD-STR-004 | docs/01-opportunity-and-strategy/market-segmentation.md | Market Segmentation | Draft Complete | Product Strategy |
| FD-STR-036 | docs/01-opportunity-and-strategy/non-goals.md | Non-goals | Draft Complete | Product Strategy |
| FD-STR-030 | docs/01-opportunity-and-strategy/north-star-metric.md | North Star Metric | Draft Complete | Product Strategy |
| FD-STR-001 | docs/01-opportunity-and-strategy/opportunity-validation.md | Opportunity Validation | Draft Complete | Product Strategy |
| FD-STR-027 | docs/01-opportunity-and-strategy/packaging-principles.md | Packaging Principles | Draft Complete | Product Strategy |
| FD-STR-022 | docs/01-opportunity-and-strategy/platform-marketplace-strategy.md | Platform Marketplace Strategy | Draft Complete | Product Strategy |
| FD-STR-010 | docs/01-opportunity-and-strategy/positioning.md | Positioning | Draft Complete | Product Strategy |
| FD-STR-026 | docs/01-opportunity-and-strategy/pricing-principles.md | Pricing Principles | Draft Complete | Product Strategy |
| FD-STR-005 | docs/01-opportunity-and-strategy/problem-definition.md | Problem Definition | Draft Complete | Product Strategy |
| FD-STR-031 | docs/01-opportunity-and-strategy/product-kpi-tree.md | Product KPI Tree | Draft Complete | Product Strategy |
| FD-STR-020 | docs/01-opportunity-and-strategy/product-led-growth-strategy.md | Product-led Growth Strategy | Draft Complete | Product Strategy |
| FD-STR-007 | docs/01-opportunity-and-strategy/product-mission.md | Product Mission | Draft Complete | Product Strategy |
| FD-STR-008 | docs/01-opportunity-and-strategy/product-principles.md | Product Principles | Draft Complete | Product Strategy |
| FD-STR-006 | docs/01-opportunity-and-strategy/product-vision.md | Product Vision | Draft Complete | Product Strategy |
| FD-STR-019 | docs/01-opportunity-and-strategy/seo-led-acquisition-strategy.md | SEO-led Acquisition Strategy | Draft Complete | Product Strategy |
| FD-STR-033 | docs/01-opportunity-and-strategy/strategic-risks.md | Strategic Risks | Draft Complete | Product Strategy |
| FD-STR-012 | docs/01-opportunity-and-strategy/strategic-wedge.md | Strategic Wedge | Draft Complete | Product Strategy |
| FD-STR-028 | docs/01-opportunity-and-strategy/unit-economics-model.md | Unit Economics Model | Draft Complete | Product Strategy |
| FD-STR-011 | docs/01-opportunity-and-strategy/value-proposition.md | Value Proposition | Draft Complete | Product Strategy |
