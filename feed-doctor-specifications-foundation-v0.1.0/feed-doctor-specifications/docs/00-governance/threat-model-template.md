---
document_id: FD-GOV-015
title: "Threat Model Template"
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

# Threat Model Template

## Purpose

Identify assets, actors, trust boundaries, attack paths, abuse cases, mitigations, and residual risks before implementation.

## Scope

Systems, features, workflows, connectors, repair operations, public tools, and administrative capabilities.

## Dependencies

- security-control-template.md
- docs/06-security-privacy-and-compliance/security-principles.md

## Inputs

- Architecture diagrams
- Data flows
- Actors
- Assets
- Trust boundaries

## Outputs

- Threat inventory, mitigations, residual-risk decisions, and test obligations

## Functional Requirements

- `FD-GOV-015-FR-001` — Threat models SHALL identify assets, entry points, trust boundaries, privileged actions, data classifications, adversaries, misuse cases, threats, mitigations, residual risk, and owners.
- `FD-GOV-015-FR-002` — Automated repair SHALL include malicious-data and confused-deputy analysis.
- `FD-GOV-015-FR-003` — Multi-tenancy SHALL include cross-tenant access and metadata leakage analysis.
- `FD-GOV-015-FR-004` — Public tools SHALL include abuse, SSRF, malware, scraping, and resource-exhaustion analysis.
- `FD-GOV-015-FR-005` — Threats without accepted mitigation SHALL block release.

## Non-functional Requirements

- `FD-GOV-015-NFR-001` — Threat models must be reviewable by security and feature owners.

## Data Requirements

- `FD-GOV-015-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-015-VAL-001` — Every high or critical threat requires a mapped control and verification test.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-015-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-015-ERR-001` — Unowned residual risk or undocumented trust boundary blocks approval.

## Success States

- `FD-GOV-015-STATE-002` — Security risks are visible before design becomes expensive to change.

## Edge Cases

- Third-party compromise.
- Insider misuse.
- Temporary support access.
- Generated content poisoning.
- Supply-chain compromise.

## Accessibility

- `FD-GOV-015-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-015-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-015-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-015-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-015-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-015-TEST-001` — Threat-to-control traceability review.
- `FD-GOV-015-TEST-002` — Abuse-case test planning.

## Acceptance Criteria

- `FD-GOV-015-AC-001` — All trust boundaries are diagrammed.
- `FD-GOV-015-AC-002` — High-risk threats have controls.
- `FD-GOV-015-AC-003` — Residual risks have explicit acceptance.

## Related Documents

- security-control-template.md
- docs/06-security-privacy-and-compliance/system-threat-model.md

## Open External Dependencies

- `FD-GOV-015-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
