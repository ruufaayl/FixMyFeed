# T085 — Completion Report

**Task:** T085 — Implement issue normalization deduplication and lifecycle (Epic E08)
**Branch:** `task/T080-T087-diagnostics-engine`. **State:** Not Started → In Review

## What was built

Durable, deduplicated diagnostic issues with a cross-scan lifecycle.

**Schema (`packages/database`)** — `diagnostic-issue-schema.ts`: mutable `diagnostic_issues` table (org, catalog FK cascade, unique **(catalog, fingerprint)**, code, severity check, product/variant/field, evidence jsonb, `status` open/resolved, `first_seen_at`/`last_seen_at`/`resolved_at`, audit + version). **Migration 0013** (drizzle-kit; renamed to convention). Registered in `schema.ts` + exported.

**Logic (`packages/diagnostics`)** — `issue-lifecycle.ts`:

- `issueFingerprint(issue)` — stable sha256 over code + product + variant + field.
- `normalizeIssues(issues)` — fingerprint + **dedupe** (first occurrence wins, order preserved).
- `reconcileIssueLifecycle(current, prior)` → `opened` / `persisting` / `resolvedFingerprints` (prior open findings absent this scan).
- `toDiagnosticIssueRow(org, catalog, issue, {firstSeenAt, lastSeenAt})` — insert/upsert row builder.

## Files changed

Added `database/diagnostic-issue-schema.ts`, `database/drizzle/0013_*.sql` (+ meta/journal), `diagnostics/issue-lifecycle.ts`, `tests/diag-issue-lifecycle.test.mjs`, this report. Edited `database/{schema,index}.ts`, `diagnostics/index.ts`, `tools/db-smoke.mjs` (0000–0013 + table), `tests/{auth,tenancy}.test.mjs`, `ci.yml`. No boundary change.

## Tests

`tests/diag-issue-lifecycle.test.mjs` (5): fingerprint stability/distinction, dedupe first-wins, opened/persisting/resolved transitions, row mapping, schema + migration-0013. `auth`/`tenancy` schema-key updated; migration-apply covers the table via db-smoke.

## Security & privacy

Pure logic; no secrets. Evidence stores only validator-produced values.

## Rollback / limitations

Revert the E08 PR; migration 0013 only adds a table. **Follow-up:** scoring/prioritization (T086) ranks these issues; scan orchestration (T087) drives normalize → lifecycle → persist.

## Traceability

`WORKSTREAM_REGISTRY.md` T085 → In Review; `issue-lifecycle.ts` + `diagnostic_issues` ↔ issue-normalization / dedup / lifecycle specs.
