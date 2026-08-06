---
document_id: FD-GOV-041
title: "Database Definition of Done"
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

# Database Definition of Done

## Purpose

Define when a database table or schema change is safe for production.

## Scope

Every persistent table, view, index, constraint, and migration.

## Dependencies

- database-table-template.md
- docs/07-data-architecture/online-schema-change.md

## Inputs

- Table spec
- Migration plan
- Backfill plan
- Performance tests
- Rollback plan

## Outputs

- Database change readiness decision

## Functional Requirements

- `FD-GOV-041-FR-001` — Schema, constraints, indexes, tenancy, retention, deletion, encryption, audit behavior, access patterns, and ownership SHALL be complete.
- `FD-GOV-041-FR-002` — Migration and rollback SHALL be safe under live traffic.
- `FD-GOV-041-FR-003` — Backfills SHALL be resumable, observable, rate-limited, and idempotent.
- `FD-GOV-041-FR-004` — Queries SHALL use supported indexes at projected scale.
- `FD-GOV-041-FR-005` — Backup and restore implications SHALL be reviewed.

## Non-functional Requirements

- `FD-GOV-041-NFR-001` — Lock time, replication lag, storage growth, and query latency limits must be met.

## Data Requirements

- `FD-GOV-041-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-041-VAL-001` — DDL and migrations must pass representative-scale rehearsal.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-041-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-041-ERR-001` — Unbounded table scans, unsafe locks, or missing tenant constraints block Done.

## Success States

- `FD-GOV-041-STATE-002` — The change can be deployed and operated without data loss or unacceptable degradation.

## Edge Cases

- Large existing table.
- Regional replicas.
- Partial backfill.
- Rollback after application deployment.

## Accessibility

- `FD-GOV-041-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-041-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-041-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-041-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-041-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-041-TEST-001` — Migration rehearsal.
- `FD-GOV-041-TEST-002` — Constraint tests.
- `FD-GOV-041-TEST-003` — Load and query-plan tests.
- `FD-GOV-041-TEST-004` — Restore test.

## Acceptance Criteria

- `FD-GOV-041-AC-001` — Migration is zero-downtime or approved otherwise.
- `FD-GOV-041-AC-002` — Rollback exists.
- `FD-GOV-041-AC-003` — Performance passes.

## Related Documents

- database-table-template.md
- release-definition-of-done.md

## Open External Dependencies

- `FD-GOV-041-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
