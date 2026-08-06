---
document_id: FD-GOV-011
title: "Database Table Specification Template"
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

# Database Table Specification Template

## Purpose

Define the complete contract for each persistent relational table.

## Scope

Every production relational table, materialized view, and durable relational projection.

## Dependencies

- docs/07-data-architecture/physical-data-model.md
- docs/07-data-architecture/schema-versioning.md

## Inputs

- Domain entity
- Ownership
- Access patterns
- Retention requirements

## Outputs

- Implementation-ready table definition and lifecycle contract

## Functional Requirements

- `FD-GOV-011-FR-001` — Each table SHALL define purpose, ownership, tenancy, columns, types, nullability, defaults, generated values, primary key, foreign keys, unique constraints, check constraints, indexes, partitioning, row lifecycle, retention, deletion, encryption, audit behavior, and migration rules.
- `FD-GOV-011-FR-002` — Every column SHALL define semantic meaning and allowed values.
- `FD-GOV-011-FR-003` — Soft-delete behavior SHALL define uniqueness and query semantics.
- `FD-GOV-011-FR-004` — High-volume tables SHALL define partition and archive strategy.
- `FD-GOV-011-FR-005` — Sensitive fields SHALL define access and masking.

## Non-functional Requirements

- `FD-GOV-011-NFR-001` — Expected row count, growth rate, read/write patterns, and latency requirements must be documented.

## Data Requirements

- `FD-GOV-011-DATA-001` — No production data is created or processed by this document.

## Validation Rules

- `FD-GOV-011-VAL-001` — Every foreign key and logical relationship must have a declared enforcement strategy.
- `FD-GOV-011-VAL-002` — Unbounded text or JSON fields require rationale and validation contracts.

## Loading States

Not applicable. This is a documentation-governance specification.

## Empty States

- `FD-GOV-011-STATE-001` — An empty or materially incomplete section is a specification failure unless it explicitly states why the section is not applicable.

## Error States

- `FD-GOV-011-ERR-001` — Missing uniqueness semantics, tenant isolation, or migration behavior block approval.

## Success States

- `FD-GOV-011-STATE-002` — A database engineer can create and operate the table without inferring domain rules.

## Edge Cases

- Tenant deletion.
- Historical snapshots.
- Backfill during live traffic.
- Data type expansion.
- Regional residency.

## Accessibility

- `FD-GOV-011-A11Y-001` — Markdown content must use semantic headings, descriptive link text, plain-language labels, and tables that remain understandable when linearized.

## Performance Requirements

- `FD-GOV-011-PERF-001` — Repository-wide validation must complete within the CI documentation budget defined by the platform engineering specification.

## Security Requirements

- `FD-GOV-011-SEC-001` — Secrets, credentials, personal data, customer data, and exploit details must not be embedded in documentation.

## Privacy Requirements

- `FD-GOV-011-PRIV-001` — Examples must use synthetic or irreversibly anonymized data.

## Analytics Events

Not applicable. This document does not define a user-facing interaction.

## SEO Requirements

Not applicable. This document is internal and must not be indexable.

## Observability Requirements

- `FD-GOV-011-OBS-001` — Specification lint failures, broken references, missing required sections, and stale review dates must be reported in CI.

## Test Requirements

- `FD-GOV-011-TEST-001` — DDL validation.
- `FD-GOV-011-TEST-002` — Constraint tests.
- `FD-GOV-011-TEST-003` — Query-plan and index tests.
- `FD-GOV-011-TEST-004` — Tenant isolation tests.

## Acceptance Criteria

- `FD-GOV-011-AC-001` — All columns and constraints are specified.
- `FD-GOV-011-AC-002` — Access patterns are supported by indexes.
- `FD-GOV-011-AC-003` — Lifecycle and retention are explicit.

## Related Documents

- api-contract-template.md
- docs/07-data-architecture/database-definition-of-done.md

## Open External Dependencies

- `FD-GOV-011-OPS-001` — None unless explicitly listed in this document.

## Revision History

| Version | Date | Authoring Body | Change |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Feed Doctor Architecture Council | Initial approved baseline. |
