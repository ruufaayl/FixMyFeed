---
document_id: FD-F04906E9
title: "Environment Variable Catalog"
status: "Approved for Implementation"
version: "1.0.0"
owner: "Feed Doctor Engineering"
last_reviewed: "2026-08-06"
implementation_authority: true
---

# Environment Variable Catalog

## Purpose

This document defines every permitted runtime configuration and secret name. Agents MUST NOT invent environment variables. The owner supplies real values; test and local environments use documented non-secret substitutes.

## Scope

This document is the implementation authority for Environment Variable Catalog. It defines behavior, boundaries, contracts, failure handling, verification, and ownership. Any implementation that conflicts with this document requires an approved ADR and documentation change before merge.

## Dependencies

- `/IMPLEMENTATION_BASELINE.md`
- `/AGENTS.md`

## Inputs

- Approved product and architecture specifications.
- Authenticated tenant context where applicable.
- Versioned configuration and connector capability metadata.

## Outputs

- A conforming implementation of Environment Variable Catalog.
- Traceable tests and operational evidence.
- Auditable state transitions and failure records.

## Functional Requirements

- Variables are grouped into application, database, authentication, encryption, storage, email, Shopify, WooCommerce, Google, billing, anti-abuse, observability, and feature flags.
- Every variable has a type, required environments, secret classification, safe default, validation rule, rotation behavior, and failure mode.
- Missing mandatory secrets MUST stop startup; missing optional integration secrets MUST disable only that integration.
- Secrets MUST never be exposed through client bundles, logs, build output, telemetry, or error responses.

## Non-functional Requirements

- NFR-001: The implementation MUST remain provider-portable and MUST NOT require a paid AI API.
- NFR-002: Runtime dependencies MUST be open source or available within the approved bootstrap cost envelope.
- NFR-003: All behavior MUST be deterministic unless a separately approved optional intelligence feature is explicitly enabled.
- NFR-004: Public interfaces MUST be versioned and backwards-compatible within the stated support window.
- NFR-005: The system MUST degrade safely when third-party services are unavailable.

## Data Requirements

- All records MUST carry tenant ownership, creation time, update time, and stable identifiers where applicable.
- Source data, normalized data, derived findings, and writeback results MUST remain distinguishable.
- Mutable business records MUST retain an audit trail sufficient to reconstruct user-visible changes.
- Sensitive values MUST never be written to logs, analytics payloads, URLs, or client-readable configuration.

## Validation Rules

- Validate all input at the trust boundary and again before persistence or external side effects.
- Reject unknown enum values unless the contract explicitly supports forward-compatible passthrough.
- Normalize whitespace, identifiers, URLs, locale, currency, and timestamps according to repository standards.
- Never infer missing authorization, ownership, destination, market, or repair consent.

## Loading States

- Interactive operations MUST show an immediate acknowledged state.
- Long-running work MUST expose queued, running, retrying, blocked, completed, partially completed, cancelled, and failed states.
- Loading indicators MUST not imply completion and MUST include resumable status retrieval.

## Empty States

- Empty states MUST distinguish no data, not yet synchronized, filtered-to-zero, insufficient permission, and unavailable integration.
- Every actionable empty state MUST provide the single safest next step.

## Error States

- Errors MUST use the canonical error envelope and a stable machine-readable code.
- User messages MUST explain impact and recovery without exposing secrets or internal stack traces.
- Retryable, non-retryable, authorization, validation, quota, conflict, and upstream errors MUST remain distinguishable.
- Partial failures MUST preserve successful work and identify every failed item.

## Success States

- Success MUST be recorded only after durable persistence and required external acknowledgements.
- Success responses MUST include resulting identifiers, effective version, and next relevant action.
- Mutations MUST produce an audit event and, where applicable, a change-set result.

## Edge Cases

- Duplicate requests, retries after timeouts, out-of-order events, stale browser state, and concurrent edits.
- Revoked credentials, deleted upstream resources, changed permissions, rate limits, and upstream schema changes.
- Catalogs with zero products, millions of products, malformed attributes, duplicate identifiers, and mixed locales.
- Clock skew, daylight-saving changes, unsupported currencies, Unicode edge cases, and extremely long values.
- Tenant deletion, subscription restriction, legal hold, and emergency feature disablement during active work.

## Accessibility

- All user interfaces MUST conform to WCAG 2.2 AA.
- Every operation MUST be keyboard operable with visible focus and logical focus restoration.
- Status, severity, and validation MUST not rely on color alone.
- Dynamic updates MUST use appropriate live-region behavior without excessive announcement.

## Performance Requirements

- Interactive reads SHOULD meet p95 server latency of 500 ms excluding third-party latency.
- Interactive writes SHOULD acknowledge within 1 second and move long work to durable jobs.
- List endpoints MUST paginate and MUST NOT perform unbounded scans.
- Large-catalog processing MUST stream or batch with bounded memory and resumable checkpoints.

## Security Requirements

- Apply least privilege, deny by default, tenant-scoped queries, CSRF protection, secure cookies, and origin validation.
- Encrypt transport using TLS and encrypt provider credentials using an application-managed envelope.
- Require explicit reauthorization for high-risk writeback and administrative actions.
- Record immutable audit events for authentication, authorization changes, exports, repairs, rollbacks, and support access.

## Privacy Requirements

- Collect only data necessary for feed diagnosis, repair, account operation, security, and billing.
- Respect retention, export, deletion, legal-hold, and regional-processing policies.
- Do not send customer catalog data to model providers by default.
- Public tools MUST avoid persistent storage unless the user explicitly saves a result.

## Analytics Events

- Emit only approved first-party events using the canonical analytics envelope.
- Events MUST include anonymous or authenticated actor context, tenant context, feature, outcome, latency class, and error code when applicable.
- Analytics MUST exclude secrets, raw feed content, personal data, full URLs with query strings, and merchant access tokens.

## SEO Requirements

- Authenticated application routes MUST be excluded from indexing.
- Public routes MUST provide server-rendered canonical metadata, semantic headings, crawlable links, and valid status codes.
- Programmatic pages MUST pass uniqueness, evidence, usefulness, and thin-content gates before indexability.
- SEO requirements are not applicable to non-public operational interfaces beyond index prevention.

## Observability Requirements

- Emit structured logs, metrics, traces, and audit events with correlation identifiers.
- Expose queue age, throughput, error rate, retry count, upstream latency, quota consumption, and tenant fairness metrics.
- Alerts MUST map to documented SLOs and runbooks.
- Sensitive data MUST be redacted before telemetry emission.

## Test Requirements

- Unit tests for validation and state transitions.
- Integration tests for persistence, authorization, retries, and external adapters.
- Contract tests for API, event, webhook, and connector boundaries.
- End-to-end tests for primary, empty, error, partial-success, accessibility, and recovery paths.
- Load and abuse tests for public or high-volume surfaces.

## Acceptance Criteria

- AC-001: Every functional requirement has at least one traceable automated test.
- AC-002: No undocumented external service, paid API, environment variable, table, endpoint, event, or permission is introduced.
- AC-003: Security, accessibility, observability, and rollback requirements pass their release gates.
- AC-004: Failure injection demonstrates deterministic recovery or safe terminal failure.
- AC-005: Documentation, generated contracts, migrations, tests, and implementation remain mutually consistent.

## Related Documents

- `/AGENTS.md`
- `/docs/04-system-architecture/reference-architecture.md`
- `/docs/20-devops-sre-and-platform-engineering/platform-reference.md`

## Open External Dependencies

- Owner-supplied credentials are required only for explicitly enabled external connectors.
- External marketplace or API approval timelines are outside repository control.
- No external paid service may be enabled without owner approval and a recorded cost decision.


## Authoritative Variable Matrix


| Variable | Type | Secret | Required When | Safe Default | Validation / Failure |
|---|---|---:|---|---|---|
| `NODE_ENV` | enum | No | Always | `development` | One of development, test, production. |
| `APP_BASE_URL` | URL | No | Always | `http://localhost:3000` | HTTPS required in production. |
| `DATABASE_URL` | PostgreSQL DSN | Yes | Always | None | Startup fails when absent or unreachable. |
| `DATABASE_POOL_MAX` | integer | No | Always | `10` | Range 1–100; bootstrap cap 10. |
| `AUTH_SECRET` | 32+ byte secret | Yes | Always | None | Startup fails; rotate through documented dual-key procedure. |
| `DATA_ENCRYPTION_KEY` | 32-byte base64 | Yes | Connector credentials exist | None | Connector features disabled if absent. |
| `PREVIOUS_DATA_ENCRYPTION_KEY` | 32-byte base64 | Yes | During rotation only | Empty | May decrypt only; never encrypt new values. |
| `JOB_WORKER_ENABLED` | boolean | No | Always | `false` | Web-only processes keep false; worker process true. |
| `JOB_CONCURRENCY` | integer | No | Worker | `4` | Range 1–32; cost guard may lower it. |
| `OBJECT_STORAGE_DRIVER` | enum | No | Always | `filesystem` | `filesystem` allowed only local/test; production uses `s3`. |
| `OBJECT_STORAGE_ENDPOINT` | URL | No | S3 driver | Empty | Required with non-AWS S3-compatible providers. |
| `OBJECT_STORAGE_BUCKET` | string | No | S3 driver | Empty | Startup validation for worker and upload surfaces. |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | string | Yes | S3 driver | Empty | Storage adapter disabled if incomplete. |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | string | Yes | S3 driver | Empty | Storage adapter disabled if incomplete. |
| `SMTP_HOST` | hostname | No | Email enabled | Empty | Email queue remains disabled if incomplete. |
| `SMTP_PORT` | integer | No | Email enabled | `587` | 1–65535. |
| `SMTP_USERNAME` | string | Yes | Provider requires it | Empty | Never logged. |
| `SMTP_PASSWORD` | string | Yes | Provider requires it | Empty | Never logged. |
| `SMTP_FROM` | mailbox | No | Email enabled | Empty | RFC-valid mailbox required. |
| `TURNSTILE_SITE_KEY` | string | No | Public tools in production | Empty | Public anonymous scans disabled if absent. |
| `TURNSTILE_SECRET_KEY` | string | Yes | Public tools in production | Empty | Server-side only. |
| `SHOPIFY_CLIENT_ID` | string | No | Shopify enabled | Empty | Shopify connection UI disabled if absent. |
| `SHOPIFY_CLIENT_SECRET` | string | Yes | Shopify enabled | Empty | Server-side only; encrypted tokens stored separately. |
| `SHOPIFY_APP_URL` | URL | No | Shopify enabled | `APP_BASE_URL` | Must match marketplace and OAuth configuration. |
| `GOOGLE_CLIENT_ID` | string | No | Google enabled | Empty | Google connector disabled if absent. |
| `GOOGLE_CLIENT_SECRET` | string | Yes | Google enabled | Empty | Server-side only. |
| `GOOGLE_OAUTH_REDIRECT_URI` | URL | No | Google enabled | Derived | Exact-match validation. |
| `WOOCOMMERCE_CONNECTOR_ENABLED` | boolean | No | Optional | `true` | Credentials are per-store and encrypted. |
| `BILLING_ENABLED` | boolean | No | Optional | `false` | Must remain false until owner approval. |
| `STRIPE_SECRET_KEY` | string | Yes | Billing enabled | Empty | Billing startup check fails closed. |
| `STRIPE_WEBHOOK_SECRET` | string | Yes | Billing enabled | Empty | Required before webhook route accepts events. |
| `PUBLIC_TOOLS_ENABLED` | boolean | No | Optional | `false` | Enable after abuse controls and SEO QA pass. |
| `AUTOMATED_WRITEBACK_ENABLED` | boolean | No | Optional | `false` | Owner approval and connector scope required. |
| `AI_ASSISTANCE_ENABLED` | boolean | No | Optional | `false` | Does not affect core diagnostic or repair correctness. |
| `LOCAL_MODEL_BASE_URL` | URL | No | Local model enabled | `http://localhost:11434` | Private-network endpoint only. |
| `ANALYTICS_ENABLED` | boolean | No | Optional | `true` | First-party, consent-aware analytics only. |
| `LOG_LEVEL` | enum | No | Always | `info` | debug forbidden in production except time-boxed incident override. |
| `SENTRY_DSN` | URL | Potentially | Optional | Empty | Optional adapter; system works without it. |
| `MONTHLY_EXTERNAL_COST_CAP_USD` | decimal | No | Production | `0` | Zero means all metered paid adapters disabled. |
| `ANONYMOUS_SCAN_DAILY_LIMIT` | integer | No | Public tools | `3` | Hard limit; no paid overage. |
| `TENANT_PRODUCT_LIMIT` | integer | No | Bootstrap | `5000` | Plan/entitlement may lower, never silently exceed. |
| `TEMP_FILE_RETENTION_HOURS` | integer | No | Always | `24` | Range 1–168. |
| `EXPORT_RETENTION_DAYS` | integer | No | Always | `7` | Range 1–30 bootstrap. |

## Revision History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Initial implementation-authority specification. | Feed Doctor architecture baseline |
