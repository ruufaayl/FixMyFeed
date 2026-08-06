---
document_id: FD-GOV-017
title: "Operational Runbook Template"
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

# Operational Runbook Template

## Purpose

Define executable operational response for incidents, degradations, maintenance, and recovery.

## Scope

Production services, integrations, data stores, queues, jobs, security controls, and customer-facing dependencies.

## Dependencies

- docs/20-devops-sre-and-platform-engineering/incident-command.md
- docs/20-devops-sre-and-platform-engineering/on-call-policy.md

## Inputs

- Alert
- Symptoms
- Telemetry
- Affected service
- Severity

## Outputs

- Diagnosis, containment, remediation, verification, escalation, and communication steps

## Functional Requirements

- `FD-GOV-017-FR-001` — Runbooks SHALL define trigger, customer impact, severity mapping, prerequisites, safety warnings, diagnostic steps, containment, remediation, rollback, verification, escalation, communications, and follow-up.
- `FD-GOV-017-FR-002` — Commands or examples, when included, SHALL be safe, scoped, and explicitly labeled.
- `FD-GOV-017-FR-003` — Destructive steps SHALL require confirmation and backup verification.
- `FD-GOV-017-FR-004` — Runbooks SHALL identify when to stop and escalate.
- `FD-GOV-017-FR-005` — Customer and status-page communication triggers SHALL be explicit.

## Non-functional Requirements

- `FD-GOV-017-NFR-001` — Critical runbooks must be executable under degraded access conditions.

## Data Requirements

- `FD-GOV-017-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-017-VAL-001` — Steps must be tested through game days or controlled exercises.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-017-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-017-ERR-001` — Ambiguous destructive actions and missing rollback prevent approval.

## Success States

- `FD-GOV-017-STATE-002` — An on-call engineer unfamiliar with the service can restore or safely escalate it.

## Edge Cases

- Telemetry unavailable.
- Primary operator unavailable.
- Regional outage.
- Security incident where normal tools are untrusted.

## Accessibility

- `FD-GOV-017-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-017-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-017-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-017-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-017-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-017-TEST-001` — Scheduled runbook exercise.
- `FD-GOV-017-TEST-002` — Post-incident validation after use.

## Acceptance Criteria

- `FD-GOV-017-AC-001` — Diagnosis and recovery paths are complete.
- `FD-GOV-017-AC-002` — Escalation is explicit.
- `FD-GOV-017-AC-003` — Verification proves customer recovery.

## Related Documents

- docs/20-devops-sre-and-platform-engineering/post-incident-review.md
- security-control-template.md

## Open External Dependencies

- `FD-GOV-017-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
