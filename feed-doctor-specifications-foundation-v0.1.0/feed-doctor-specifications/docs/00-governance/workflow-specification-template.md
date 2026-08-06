---
document_id: FD-GOV-005
title: "Workflow Specification Template"
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

# Workflow Specification Template

## Purpose

Specify complete multi-step user and system workflows across pages, services, integrations, and asynchronous jobs.

## Scope

Any capability with more than one state transition or system boundary.

## Dependencies

- feature-specification-template.md
- source-of-truth-hierarchy.md

## Inputs

- Actors
- Trigger
- Preconditions
- State machine
- Dependent services

## Outputs

- Deterministic workflow sequence and recovery behavior

## Functional Requirements

- `FD-GOV-005-FR-001` — Workflow specifications SHALL define entry conditions, ordered steps, decision points, state transitions, side effects, emitted events, compensating actions, and terminal states.
- `FD-GOV-005-FR-002` — Each step SHALL name the responsible actor or service.
- `FD-GOV-005-FR-003` — Human approval and automated action boundaries SHALL be explicit.
- `FD-GOV-005-FR-004` — Retryable and non-retryable failures SHALL be distinguished.
- `FD-GOV-005-FR-005` — Resumption after interruption SHALL define cursor or checkpoint semantics.
- `FD-GOV-005-FR-006` — Timeout, abandonment, duplicate trigger, and cancellation behavior SHALL be specified.

## Non-functional Requirements

- `FD-GOV-005-NFR-001` — Long-running workflows must define duration expectations and progress visibility.

## Data Requirements

- `FD-GOV-005-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-005-VAL-001` — All states must be reachable or explicitly reserved.
- `FD-GOV-005-VAL-002` — Every non-terminal state must have an exit or expiry policy.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-005-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-005-ERR-001` — Orphan states, implicit side effects, and undefined compensation block approval.

## Success States

- `FD-GOV-005-STATE-002` — The workflow can be implemented as a state machine without inventing transitions.

## Edge Cases

- User closes browser mid-flow.
- External OAuth expires.
- A batch partially succeeds.
- A retry occurs after the underlying action actually completed.

## Accessibility

- `FD-GOV-005-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-005-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-005-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-005-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-005-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-005-TEST-001` — State-transition coverage test.
- `FD-GOV-005-TEST-002` — Failure-injection workflow tests.

## Acceptance Criteria

- `FD-GOV-005-AC-001` — State diagram and transition table agree.
- `FD-GOV-005-AC-002` — All side effects are idempotent or protected.
- `FD-GOV-005-AC-003` — Terminal outcomes are exhaustive.

## Related Documents

- algorithm-specification-template.md
- event-contract-template.md
- test-plan-template.md

## Open External Dependencies

- `FD-GOV-005-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
