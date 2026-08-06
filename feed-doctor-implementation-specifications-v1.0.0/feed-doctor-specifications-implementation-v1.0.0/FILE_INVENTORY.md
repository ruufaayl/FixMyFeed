---
document_id: FD-ROOT-012
title: "File Inventory"
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

# File Inventory

## Purpose

List all files physically present in this specification baseline.

## Files

- `CHANGELOG.md`
- `DECISION_LOG.md`
- `DEPENDENCY_GRAPH.md`
- `DOCUMENTATION_MANIFEST.md`
- `DOCUMENT_OWNERSHIP.md`
- `EXTERNAL_SOURCE_REGISTER.md`
- `FILE_INVENTORY.md`
- `GLOSSARY.md`
- `OPEN_EXTERNAL_DEPENDENCIES.md`
- `QUALITY_REPORT.md`
- `README.md`
- `REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `SPECIFICATION_COVERAGE_MATRIX.md`
- `docs/00-governance/README.md`
- `docs/00-governance/adr-template.md`
- `docs/00-governance/algorithm-specification-template.md`
- `docs/00-governance/analytics-event-template.md`
- `docs/00-governance/api-contract-template.md`
- `docs/00-governance/api-definition-of-done.md`
- `docs/00-governance/change-control-process.md`
- `docs/00-governance/citation-and-evidence-policy.md`
- `docs/00-governance/component-specification-template.md`
- `docs/00-governance/contradiction-resolution-policy.md`
- `docs/00-governance/cross-reference-policy.md`
- `docs/00-governance/database-definition-of-done.md`
- `docs/00-governance/database-table-template.md`
- `docs/00-governance/deprecation-policy.md`
- `docs/00-governance/diagramming-standard.md`
- `docs/00-governance/document-id-convention.md`
- `docs/00-governance/document-template.md`
- `docs/00-governance/documentation-charter.md`
- `docs/00-governance/documentation-raci.md`
- `docs/00-governance/event-contract-template.md`
- `docs/00-governance/external-dependency-policy.md`
- `docs/00-governance/feature-definition-of-done.md`
- `docs/00-governance/feature-specification-template.md`
- `docs/00-governance/integration-specification-template.md`
- `docs/00-governance/normative-language-standard.md`
- `docs/00-governance/page-definition-of-done.md`
- `docs/00-governance/page-specification-template.md`
- `docs/00-governance/release-definition-of-done.md`
- `docs/00-governance/requirements-id-convention.md`
- `docs/00-governance/review-and-approval-workflow.md`
- `docs/00-governance/rfc-template.md`
- `docs/00-governance/runbook-template.md`
- `docs/00-governance/security-control-template.md`
- `docs/00-governance/seo-page-template.md`
- `docs/00-governance/source-of-truth-hierarchy.md`
- `docs/00-governance/specification-completeness-checklist.md`
- `docs/00-governance/specification-lint-rules.md`
- `docs/00-governance/specification-versioning.md`
- `docs/00-governance/terminology-and-language-standard.md`
- `docs/00-governance/test-plan-template.md`
- `docs/00-governance/threat-model-template.md`
- `docs/00-governance/unresolved-question-policy.md`
- `docs/00-governance/webhook-contract-template.md`
- `docs/00-governance/workflow-specification-template.md`
- `docs/01-opportunity-and-strategy/README.md`
- `docs/01-opportunity-and-strategy/addressable-market-model.md`
- `docs/01-opportunity-and-strategy/agency-channel-strategy.md`
- `docs/01-opportunity-and-strategy/anti-goals.md`
- `docs/01-opportunity-and-strategy/business-kpi-tree.md`
- `docs/01-opportunity-and-strategy/business-model.md`
- `docs/01-opportunity-and-strategy/category-definition.md`
- `docs/01-opportunity-and-strategy/competitive-landscape.md`
- `docs/01-opportunity-and-strategy/competitor-capability-matrix.md`
- `docs/01-opportunity-and-strategy/competitor-seo-analysis.md`
- `docs/01-opportunity-and-strategy/cost-driver-model.md`
- `docs/01-opportunity-and-strategy/data-moat-strategy.md`
- `docs/01-opportunity-and-strategy/differentiation-and-moat.md`
- `docs/01-opportunity-and-strategy/distribution-strategy.md`
- `docs/01-opportunity-and-strategy/enterprise-strategy.md`
- `docs/01-opportunity-and-strategy/ethical-product-boundaries.md`
- `docs/01-opportunity-and-strategy/global-expansion-strategy.md`
- `docs/01-opportunity-and-strategy/long-term-product-horizon.md`
- `docs/01-opportunity-and-strategy/market-entry-risks.md`
- `docs/01-opportunity-and-strategy/market-evidence-register.md`
- `docs/01-opportunity-and-strategy/market-segmentation.md`
- `docs/01-opportunity-and-strategy/non-goals.md`
- `docs/01-opportunity-and-strategy/north-star-metric.md`
- `docs/01-opportunity-and-strategy/opportunity-validation.md`
- `docs/01-opportunity-and-strategy/packaging-principles.md`
- `docs/01-opportunity-and-strategy/platform-marketplace-strategy.md`
- `docs/01-opportunity-and-strategy/positioning.md`
- `docs/01-opportunity-and-strategy/pricing-principles.md`
- `docs/01-opportunity-and-strategy/problem-definition.md`
- `docs/01-opportunity-and-strategy/product-kpi-tree.md`
- `docs/01-opportunity-and-strategy/product-led-growth-strategy.md`
- `docs/01-opportunity-and-strategy/product-mission.md`
- `docs/01-opportunity-and-strategy/product-principles.md`
- `docs/01-opportunity-and-strategy/product-vision.md`
- `docs/01-opportunity-and-strategy/seo-led-acquisition-strategy.md`
- `docs/01-opportunity-and-strategy/strategic-risks.md`
- `docs/01-opportunity-and-strategy/strategic-wedge.md`
- `docs/01-opportunity-and-strategy/unit-economics-model.md`
- `docs/01-opportunity-and-strategy/value-proposition.md`
- `manifest-state.json`

## Purpose

List files physically present in the current repository tranche.

## Scope

Files included in this archive.

## Dependencies

- DOCUMENTATION_MANIFEST.md

## Inputs

- Filesystem inventory

## Outputs

- Human-readable file list

## Functional Requirements

- `FD-ROOT-012-FR-001` — This document SHALL remain consistent with its declared purpose and scope.
- `FD-ROOT-012-FR-002` — References SHALL use canonical repository paths and document identifiers.

## Non-functional Requirements

- `FD-ROOT-012-NFR-001` — The document SHALL remain readable in raw Markdown and rendered form.

## Data Requirements

- `FD-ROOT-012-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-ROOT-012-VAL-001` — All listed paths and identifiers SHALL be validated during repository lint.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-ROOT-012-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-ROOT-012-ERR-001` — Broken references or contradictory statements SHALL block approval.

## Success States

- `FD-ROOT-012-STATE-001` — The document is successful when its intended audience can use it without hidden context.

## Edge Cases

- A referenced document is planned but not yet materialized.
- A document is moved without updating its path.
- A generated family contains no instances yet.

## Accessibility

- `FD-ROOT-012-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-ROOT-012-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-ROOT-012-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-ROOT-012-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-ROOT-012-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-ROOT-012-TEST-001` — CI SHALL validate structure, metadata, and references.

## Acceptance Criteria

- `FD-ROOT-012-AC-001` — Mandatory sections are present.
- `FD-ROOT-012-AC-002` — References resolve or are explicitly registered as planned dependencies.

## Related Documents

- DOCUMENTATION_MANIFEST.md

## Open External Dependencies

- `FD-ROOT-012-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
