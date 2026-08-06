---
document_id: FD-DF3E14BF
title: "Physical Schema Registry"
status: "Approved for Implementation"
version: "1.0.0"
owner: "Feed Doctor Engineering"
last_reviewed: "2026-08-06"
implementation_authority: true
---

# Physical Schema Registry

## Purpose

Provides the authoritative inventory of every PostgreSQL table and links to its exact column, constraint, index, retention, and migration specification.

## Scope

This document is the implementation authority for Physical Schema Registry. It defines behavior, boundaries, contracts, failure handling, verification, and ownership. Any implementation that conflicts with this document requires an approved ADR and documentation change before merge.

## Dependencies

- `/IMPLEMENTATION_BASELINE.md`
- `/AGENTS.md`

## Inputs

- Approved product and architecture specifications.
- Authenticated tenant context where applicable.
- Versioned configuration and connector capability metadata.

## Outputs

- A conforming implementation of Physical Schema Registry.
- Traceable tests and operational evidence.
- Auditable state transitions and failure records.

## Functional Requirements

- Every migration-created table MUST appear in this registry and have one table specification.
- Generated database schema is compared to this registry in CI.
- Undocumented tables or columns are release-blocking.
- Column renames, type changes, and removals require migration stages and documentation version updates.

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

- `/REQUIREMENTS_TRACEABILITY_MATRIX.md`
- `/SPECIFICATION_COVERAGE_MATRIX.md`

## Open External Dependencies

- Owner-supplied credentials are required only for explicitly enabled external connectors.
- External marketplace or API approval timelines are outside repository control.
- No external paid service may be enabled without owner approval and a recorded cost decision.


## Table Inventory

| Domain | Table | Documented columns | Specification |
|---|---|---:|---|
| `identity-and-tenancy` | `organizations` | 15 | `docs/07-data-architecture/tables/identity-and-tenancy/organizations.md` |
| `identity-and-tenancy` | `workspaces` | 14 | `docs/07-data-architecture/tables/identity-and-tenancy/workspaces.md` |
| `identity-and-tenancy` | `users` | 7 | `docs/07-data-architecture/tables/identity-and-tenancy/users.md` |
| `identity-and-tenancy` | `user_identities` | 13 | `docs/07-data-architecture/tables/identity-and-tenancy/user-identities.md` |
| `identity-and-tenancy` | `memberships` | 13 | `docs/07-data-architecture/tables/identity-and-tenancy/memberships.md` |
| `identity-and-tenancy` | `roles` | 15 | `docs/07-data-architecture/tables/identity-and-tenancy/roles.md` |
| `identity-and-tenancy` | `permissions` | 15 | `docs/07-data-architecture/tables/identity-and-tenancy/permissions.md` |
| `identity-and-tenancy` | `role_permissions` | 15 | `docs/07-data-architecture/tables/identity-and-tenancy/role-permissions.md` |
| `identity-and-tenancy` | `invitations` | 13 | `docs/07-data-architecture/tables/identity-and-tenancy/invitations.md` |
| `identity-and-tenancy` | `service_accounts` | 13 | `docs/07-data-architecture/tables/identity-and-tenancy/service-accounts.md` |
| `identity-and-tenancy` | `api_keys` | 15 | `docs/07-data-architecture/tables/identity-and-tenancy/api-keys.md` |
| `identity-and-tenancy` | `sessions` | 8 | `docs/07-data-architecture/tables/identity-and-tenancy/sessions.md` |
| `identity-and-tenancy` | `authentication_verifications` | 6 | `docs/07-data-architecture/tables/identity-and-tenancy/authentication-verifications.md` |
| `identity-and-tenancy` | `authentication_events` | 16 | `docs/07-data-architecture/tables/identity-and-tenancy/authentication-events.md` |
| `stores-and-integrations` | `stores` | 15 | `docs/07-data-architecture/tables/stores-and-integrations/stores.md` |
| `stores-and-integrations` | `store_domains` | 15 | `docs/07-data-architecture/tables/stores-and-integrations/store-domains.md` |
| `stores-and-integrations` | `store_markets` | 15 | `docs/07-data-architecture/tables/stores-and-integrations/store-markets.md` |
| `stores-and-integrations` | `platform_connections` | 17 | `docs/07-data-architecture/tables/stores-and-integrations/platform-connections.md` |
| `stores-and-integrations` | `oauth_connections` | 17 | `docs/07-data-architecture/tables/stores-and-integrations/oauth-connections.md` |
| `stores-and-integrations` | `connector_installations` | 15 | `docs/07-data-architecture/tables/stores-and-integrations/connector-installations.md` |
| `stores-and-integrations` | `connector_capabilities` | 15 | `docs/07-data-architecture/tables/stores-and-integrations/connector-capabilities.md` |
| `stores-and-integrations` | `connector_sync_cursors` | 19 | `docs/07-data-architecture/tables/stores-and-integrations/connector-sync-cursors.md` |
| `stores-and-integrations` | `merchant_center_accounts` | 15 | `docs/07-data-architecture/tables/stores-and-integrations/merchant-center-accounts.md` |
| `stores-and-integrations` | `merchant_account_relationships` | 15 | `docs/07-data-architecture/tables/stores-and-integrations/merchant-account-relationships.md` |
| `stores-and-integrations` | `destination_configurations` | 15 | `docs/07-data-architecture/tables/stores-and-integrations/destination-configurations.md` |
| `stores-and-integrations` | `data_sources` | 15 | `docs/07-data-architecture/tables/stores-and-integrations/data-sources.md` |
| `stores-and-integrations` | `source_schedules` | 18 | `docs/07-data-architecture/tables/stores-and-integrations/source-schedules.md` |
| `stores-and-integrations` | `integration_health_records` | 15 | `docs/07-data-architecture/tables/stores-and-integrations/integration-health-records.md` |
| `stores-and-integrations` | `webhook_receipts` | 15 | `docs/07-data-architecture/tables/stores-and-integrations/webhook-receipts.md` |
| `catalog-and-products` | `catalogs` | 19 | `docs/07-data-architecture/tables/catalog-and-products/catalogs.md` |
| `catalog-and-products` | `catalog_markets` | 19 | `docs/07-data-architecture/tables/catalog-and-products/catalog-markets.md` |
| `catalog-and-products` | `products` | 16 | `docs/07-data-architecture/tables/catalog-and-products/products.md` |
| `catalog-and-products` | `product_variants` | 16 | `docs/07-data-architecture/tables/catalog-and-products/product-variants.md` |
| `catalog-and-products` | `product_identifiers` | 16 | `docs/07-data-architecture/tables/catalog-and-products/product-identifiers.md` |
| `catalog-and-products` | `product_options` | 16 | `docs/07-data-architecture/tables/catalog-and-products/product-options.md` |
| `catalog-and-products` | `product_option_values` | 16 | `docs/07-data-architecture/tables/catalog-and-products/product-option-values.md` |
| `catalog-and-products` | `product_attributes` | 16 | `docs/07-data-architecture/tables/catalog-and-products/product-attributes.md` |
| `catalog-and-products` | `product_attribute_values` | 16 | `docs/07-data-architecture/tables/catalog-and-products/product-attribute-values.md` |
| `catalog-and-products` | `product_media` | 16 | `docs/07-data-architecture/tables/catalog-and-products/product-media.md` |
| `catalog-and-products` | `product_categories` | 16 | `docs/07-data-architecture/tables/catalog-and-products/product-categories.md` |
| `catalog-and-products` | `product_market_overrides` | 16 | `docs/07-data-architecture/tables/catalog-and-products/product-market-overrides.md` |
| `catalog-and-products` | `product_snapshots` | 16 | `docs/07-data-architecture/tables/catalog-and-products/product-snapshots.md` |
| `catalog-and-products` | `variant_snapshots` | 16 | `docs/07-data-architecture/tables/catalog-and-products/variant-snapshots.md` |
| `catalog-and-products` | `product_source_mappings` | 16 | `docs/07-data-architecture/tables/catalog-and-products/product-source-mappings.md` |
| `catalog-and-products` | `product_destination_mappings` | 16 | `docs/07-data-architecture/tables/catalog-and-products/product-destination-mappings.md` |
| `feed-processing` | `feeds` | 16 | `docs/07-data-architecture/tables/feed-processing/feeds.md` |
| `feed-processing` | `feed_versions` | 16 | `docs/07-data-architecture/tables/feed-processing/feed-versions.md` |
| `feed-processing` | `feed_items` | 16 | `docs/07-data-architecture/tables/feed-processing/feed-items.md` |
| `feed-processing` | `feed_item_snapshots` | 16 | `docs/07-data-architecture/tables/feed-processing/feed-item-snapshots.md` |
| `feed-processing` | `feed_fields` | 16 | `docs/07-data-architecture/tables/feed-processing/feed-fields.md` |
| `feed-processing` | `feed_field_mappings` | 16 | `docs/07-data-architecture/tables/feed-processing/feed-field-mappings.md` |
| `feed-processing` | `imports` | 16 | `docs/07-data-architecture/tables/feed-processing/imports.md` |
| `feed-processing` | `import_files` | 16 | `docs/07-data-architecture/tables/feed-processing/import-files.md` |
| `feed-processing` | `import_records` | 16 | `docs/07-data-architecture/tables/feed-processing/import-records.md` |
| `feed-processing` | `sync_runs` | 16 | `docs/07-data-architecture/tables/feed-processing/sync-runs.md` |
| `feed-processing` | `sync_run_stages` | 16 | `docs/07-data-architecture/tables/feed-processing/sync-run-stages.md` |
| `feed-processing` | `sync_run_items` | 16 | `docs/07-data-architecture/tables/feed-processing/sync-run-items.md` |
| `feed-processing` | `sync_checkpoints` | 16 | `docs/07-data-architecture/tables/feed-processing/sync-checkpoints.md` |
| `feed-processing` | `reconciliation_runs` | 16 | `docs/07-data-architecture/tables/feed-processing/reconciliation-runs.md` |
| `feed-processing` | `reconciliation_differences` | 16 | `docs/07-data-architecture/tables/feed-processing/reconciliation-differences.md` |
| `diagnostics` | `issue_definitions` | 16 | `docs/07-data-architecture/tables/diagnostics/issue-definitions.md` |
| `diagnostics` | `issue_definition_versions` | 16 | `docs/07-data-architecture/tables/diagnostics/issue-definition-versions.md` |
| `diagnostics` | `issue_source_aliases` | 16 | `docs/07-data-architecture/tables/diagnostics/issue-source-aliases.md` |
| `diagnostics` | `issue_instances` | 16 | `docs/07-data-architecture/tables/diagnostics/issue-instances.md` |
| `diagnostics` | `issue_occurrences` | 18 | `docs/07-data-architecture/tables/diagnostics/issue-occurrences.md` |
| `diagnostics` | `issue_affected_entities` | 16 | `docs/07-data-architecture/tables/diagnostics/issue-affected-entities.md` |
| `diagnostics` | `issue_evidence` | 16 | `docs/07-data-architecture/tables/diagnostics/issue-evidence.md` |
| `diagnostics` | `issue_impacts` | 16 | `docs/07-data-architecture/tables/diagnostics/issue-impacts.md` |
| `diagnostics` | `issue_destination_impacts` | 16 | `docs/07-data-architecture/tables/diagnostics/issue-destination-impacts.md` |
| `diagnostics` | `issue_status_history` | 16 | `docs/07-data-architecture/tables/diagnostics/issue-status-history.md` |
| `diagnostics` | `issue_suppressions` | 16 | `docs/07-data-architecture/tables/diagnostics/issue-suppressions.md` |
| `diagnostics` | `issue_acknowledgements` | 16 | `docs/07-data-architecture/tables/diagnostics/issue-acknowledgements.md` |
| `diagnostics` | `diagnostic_scans` | 16 | `docs/07-data-architecture/tables/diagnostics/diagnostic-scans.md` |
| `diagnostics` | `diagnostic_scan_stages` | 16 | `docs/07-data-architecture/tables/diagnostics/diagnostic-scan-stages.md` |
| `diagnostics` | `diagnostic_findings` | 16 | `docs/07-data-architecture/tables/diagnostics/diagnostic-findings.md` |
| `diagnostics` | `diagnostic_baselines` | 16 | `docs/07-data-architecture/tables/diagnostics/diagnostic-baselines.md` |
| `repair-and-rules` | `remediation_definitions` | 15 | `docs/07-data-architecture/tables/repair-and-rules/remediation-definitions.md` |
| `repair-and-rules` | `remediation_definition_versions` | 15 | `docs/07-data-architecture/tables/repair-and-rules/remediation-definition-versions.md` |
| `repair-and-rules` | `remediation_plans` | 15 | `docs/07-data-architecture/tables/repair-and-rules/remediation-plans.md` |
| `repair-and-rules` | `remediation_steps` | 15 | `docs/07-data-architecture/tables/repair-and-rules/remediation-steps.md` |
| `repair-and-rules` | `remediation_executions` | 15 | `docs/07-data-architecture/tables/repair-and-rules/remediation-executions.md` |
| `repair-and-rules` | `remediation_results` | 15 | `docs/07-data-architecture/tables/repair-and-rules/remediation-results.md` |
| `repair-and-rules` | `change_sets` | 15 | `docs/07-data-architecture/tables/repair-and-rules/change-sets.md` |
| `repair-and-rules` | `change_set_items` | 15 | `docs/07-data-architecture/tables/repair-and-rules/change-set-items.md` |
| `repair-and-rules` | `change_previews` | 15 | `docs/07-data-architecture/tables/repair-and-rules/change-previews.md` |
| `repair-and-rules` | `change_approvals` | 15 | `docs/07-data-architecture/tables/repair-and-rules/change-approvals.md` |
| `repair-and-rules` | `writeback_operations` | 15 | `docs/07-data-architecture/tables/repair-and-rules/writeback-operations.md` |
| `repair-and-rules` | `writeback_results` | 15 | `docs/07-data-architecture/tables/repair-and-rules/writeback-results.md` |
| `repair-and-rules` | `rollback_plans` | 15 | `docs/07-data-architecture/tables/repair-and-rules/rollback-plans.md` |
| `repair-and-rules` | `rollback_executions` | 15 | `docs/07-data-architecture/tables/repair-and-rules/rollback-executions.md` |
| `repair-and-rules` | `rules` | 15 | `docs/07-data-architecture/tables/repair-and-rules/rules.md` |
| `repair-and-rules` | `rule_versions` | 15 | `docs/07-data-architecture/tables/repair-and-rules/rule-versions.md` |
| `repair-and-rules` | `rule_conditions` | 15 | `docs/07-data-architecture/tables/repair-and-rules/rule-conditions.md` |
| `repair-and-rules` | `rule_actions` | 15 | `docs/07-data-architecture/tables/repair-and-rules/rule-actions.md` |
| `repair-and-rules` | `rule_assignments` | 15 | `docs/07-data-architecture/tables/repair-and-rules/rule-assignments.md` |
| `repair-and-rules` | `rule_evaluations` | 15 | `docs/07-data-architecture/tables/repair-and-rules/rule-evaluations.md` |
| `repair-and-rules` | `rule_conflicts` | 15 | `docs/07-data-architecture/tables/repair-and-rules/rule-conflicts.md` |
| `monitoring-and-notifications` | `monitors` | 14 | `docs/07-data-architecture/tables/monitoring-and-notifications/monitors.md` |
| `monitoring-and-notifications` | `monitor_targets` | 14 | `docs/07-data-architecture/tables/monitoring-and-notifications/monitor-targets.md` |
| `monitoring-and-notifications` | `monitor_runs` | 14 | `docs/07-data-architecture/tables/monitoring-and-notifications/monitor-runs.md` |
| `monitoring-and-notifications` | `monitor_results` | 14 | `docs/07-data-architecture/tables/monitoring-and-notifications/monitor-results.md` |
| `monitoring-and-notifications` | `alerts` | 15 | `docs/07-data-architecture/tables/monitoring-and-notifications/alerts.md` |
| `monitoring-and-notifications` | `alert_groups` | 15 | `docs/07-data-architecture/tables/monitoring-and-notifications/alert-groups.md` |
| `monitoring-and-notifications` | `alert_state_history` | 15 | `docs/07-data-architecture/tables/monitoring-and-notifications/alert-state-history.md` |
| `monitoring-and-notifications` | `notification_preferences` | 15 | `docs/07-data-architecture/tables/monitoring-and-notifications/notification-preferences.md` |
| `monitoring-and-notifications` | `notification_routes` | 15 | `docs/07-data-architecture/tables/monitoring-and-notifications/notification-routes.md` |
| `monitoring-and-notifications` | `notifications` | 15 | `docs/07-data-architecture/tables/monitoring-and-notifications/notifications.md` |
| `monitoring-and-notifications` | `notification_deliveries` | 15 | `docs/07-data-architecture/tables/monitoring-and-notifications/notification-deliveries.md` |
| `monitoring-and-notifications` | `notification_suppressions` | 15 | `docs/07-data-architecture/tables/monitoring-and-notifications/notification-suppressions.md` |
| `monitoring-and-notifications` | `notification_digests` | 15 | `docs/07-data-architecture/tables/monitoring-and-notifications/notification-digests.md` |
| `billing-and-usage` | `plans` | 14 | `docs/07-data-architecture/tables/billing-and-usage/plans.md` |
| `billing-and-usage` | `plan_versions` | 14 | `docs/07-data-architecture/tables/billing-and-usage/plan-versions.md` |
| `billing-and-usage` | `entitlements` | 14 | `docs/07-data-architecture/tables/billing-and-usage/entitlements.md` |
| `billing-and-usage` | `plan_entitlements` | 14 | `docs/07-data-architecture/tables/billing-and-usage/plan-entitlements.md` |
| `billing-and-usage` | `billing_customers` | 14 | `docs/07-data-architecture/tables/billing-and-usage/billing-customers.md` |
| `billing-and-usage` | `subscriptions` | 14 | `docs/07-data-architecture/tables/billing-and-usage/subscriptions.md` |
| `billing-and-usage` | `subscription_items` | 14 | `docs/07-data-architecture/tables/billing-and-usage/subscription-items.md` |
| `billing-and-usage` | `billing_events` | 15 | `docs/07-data-architecture/tables/billing-and-usage/billing-events.md` |
| `billing-and-usage` | `usage_meters` | 14 | `docs/07-data-architecture/tables/billing-and-usage/usage-meters.md` |
| `billing-and-usage` | `usage_records` | 14 | `docs/07-data-architecture/tables/billing-and-usage/usage-records.md` |
| `billing-and-usage` | `usage_aggregates` | 14 | `docs/07-data-architecture/tables/billing-and-usage/usage-aggregates.md` |
| `billing-and-usage` | `credits` | 14 | `docs/07-data-architecture/tables/billing-and-usage/credits.md` |
| `billing-and-usage` | `credit_ledger` | 14 | `docs/07-data-architecture/tables/billing-and-usage/credit-ledger.md` |
| `billing-and-usage` | `coupons` | 14 | `docs/07-data-architecture/tables/billing-and-usage/coupons.md` |
| `billing-and-usage` | `billing_reconciliation_records` | 14 | `docs/07-data-architecture/tables/billing-and-usage/billing-reconciliation-records.md` |
| `platform-operations` | `audit_logs` | 14 | `docs/07-data-architecture/tables/platform-operations/audit-logs.md` |
| `platform-operations` | `security_events` | 14 | `docs/07-data-architecture/tables/platform-operations/security-events.md` |
| `platform-operations` | `feature_flags` | 14 | `docs/07-data-architecture/tables/platform-operations/feature-flags.md` |
| `platform-operations` | `feature_flag_overrides` | 14 | `docs/07-data-architecture/tables/platform-operations/feature-flag-overrides.md` |
| `platform-operations` | `system_configurations` | 14 | `docs/07-data-architecture/tables/platform-operations/system-configurations.md` |
| `platform-operations` | `idempotency_keys` | 17 | `docs/07-data-architecture/tables/platform-operations/idempotency-keys.md` |
| `platform-operations` | `jobs` | 16 | `docs/07-data-architecture/tables/platform-operations/jobs.md` |
| `platform-operations` | `job_attempts` | 16 | `docs/07-data-architecture/tables/platform-operations/job-attempts.md` |
| `platform-operations` | `scheduled_tasks` | 16 | `docs/07-data-architecture/tables/platform-operations/scheduled-tasks.md` |
| `platform-operations` | `outbox_events` | 14 | `docs/07-data-architecture/tables/platform-operations/outbox-events.md` |
| `platform-operations` | `inbox_events` | 14 | `docs/07-data-architecture/tables/platform-operations/inbox-events.md` |
| `platform-operations` | `dead_letter_events` | 14 | `docs/07-data-architecture/tables/platform-operations/dead-letter-events.md` |
| `platform-operations` | `webhook_endpoints` | 14 | `docs/07-data-architecture/tables/platform-operations/webhook-endpoints.md` |
| `platform-operations` | `webhook_deliveries` | 14 | `docs/07-data-architecture/tables/platform-operations/webhook-deliveries.md` |
| `platform-operations` | `rate_limit_events` | 14 | `docs/07-data-architecture/tables/platform-operations/rate-limit-events.md` |
| `platform-operations` | `support_access_grants` | 14 | `docs/07-data-architecture/tables/platform-operations/support-access-grants.md` |
| `platform-operations` | `administrative_actions` | 14 | `docs/07-data-architecture/tables/platform-operations/administrative-actions.md` |
| `privacy-and-compliance` | `consent_records` | 13 | `docs/07-data-architecture/tables/privacy-and-compliance/consent-records.md` |
| `privacy-and-compliance` | `privacy_preferences` | 13 | `docs/07-data-architecture/tables/privacy-and-compliance/privacy-preferences.md` |
| `privacy-and-compliance` | `data_export_requests` | 13 | `docs/07-data-architecture/tables/privacy-and-compliance/data-export-requests.md` |
| `privacy-and-compliance` | `deletion_requests` | 13 | `docs/07-data-architecture/tables/privacy-and-compliance/deletion-requests.md` |
| `privacy-and-compliance` | `retention_holds` | 13 | `docs/07-data-architecture/tables/privacy-and-compliance/retention-holds.md` |
| `privacy-and-compliance` | `legal_holds` | 13 | `docs/07-data-architecture/tables/privacy-and-compliance/legal-holds.md` |
| `privacy-and-compliance` | `processing_activity_records` | 13 | `docs/07-data-architecture/tables/privacy-and-compliance/processing-activity-records.md` |
| `privacy-and-compliance` | `subprocessor_records` | 13 | `docs/07-data-architecture/tables/privacy-and-compliance/subprocessor-records.md` |
| `seo-content` | `seo_topics` | 15 | `docs/07-data-architecture/tables/seo-content/seo-topics.md` |
| `seo-content` | `seo_entities` | 15 | `docs/07-data-architecture/tables/seo-content/seo-entities.md` |
| `seo-content` | `seo_pages` | 15 | `docs/07-data-architecture/tables/seo-content/seo-pages.md` |
| `seo-content` | `seo_page_versions` | 15 | `docs/07-data-architecture/tables/seo-content/seo-page-versions.md` |
| `seo-content` | `seo_page_sources` | 15 | `docs/07-data-architecture/tables/seo-content/seo-page-sources.md` |
| `seo-content` | `seo_page_reviews` | 15 | `docs/07-data-architecture/tables/seo-content/seo-page-reviews.md` |
| `seo-content` | `seo_page_refresh_jobs` | 18 | `docs/07-data-architecture/tables/seo-content/seo-page-refresh-jobs.md` |
| `seo-content` | `internal_links` | 15 | `docs/07-data-architecture/tables/seo-content/internal-links.md` |
| `seo-content` | `redirects` | 15 | `docs/07-data-architecture/tables/seo-content/redirects.md` |
| `seo-content` | `canonical_rules` | 15 | `docs/07-data-architecture/tables/seo-content/canonical-rules.md` |
| `seo-content` | `structured_data_blocks` | 15 | `docs/07-data-architecture/tables/seo-content/structured-data-blocks.md` |
| `seo-content` | `sitemap_entries` | 15 | `docs/07-data-architecture/tables/seo-content/sitemap-entries.md` |
| `seo-content` | `seo_experiments` | 15 | `docs/07-data-architecture/tables/seo-content/seo-experiments.md` |

## Revision History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-08-06 | Initial implementation-authority specification. | Feed Doctor architecture baseline |
