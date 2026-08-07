# T087 — Completion Report

**Task:** T087 — Implement diagnostic scan orchestration (Epic E08)
**Branch:** `task/T080-T087-diagnostics-engine`. **State:** Not Started → In Review

## What was built
`packages/diagnostics/src/orchestration.ts` — the capstone that runs a full scan end-to-end.
- `defaultValidators()` / `defaultValidatorRegistry()` — every built-in validator (required, structural, identity, media, consistency) in run order.
- `runDiagnosticScan(input)` — executes sync validators (T080 executor isolates throwers), optionally runs the async URL-acquisition (T083) and landing-page (T084) checks when probes are supplied, then **normalizes + dedupes** (T085), computes **lifecycle** vs prior stored issues (T085), and **prioritizes + summarizes** (T086).
- `DiagnosticScanResult` → `scored` (prioritized), `summary`, `lifecycle` (opened/persisting/resolved), `failedValidators`.

This closes E08: connectors → catalog (E07) → deterministic diagnostics with a ranked, persistable, lifecycle-aware scan result.

## Files changed
Added `diagnostics/orchestration.ts` + `tests/diag-orchestration.test.mjs` + this report; wired `diagnostics/index.ts` + `ci.yml`. No dependency, env var, schema/migration, or boundary change.

## Tests
`tests/diag-orchestration.test.mjs` (5): registry completeness, clean catalog = no issues, issue detection + critical-first ordering + all-opened lifecycle, injected probes merged (image_unreachable + landing_page_unavailable), prior issue resolved when gone.

## Security & privacy
Pure aside from injected probes (which enforce SSRF per their adapters). No secrets; the package performs no network I/O itself.

## Rollback / limitations
Revert the E08 PR or remove `orchestration.ts`. The scan is in-memory; the worker persists `diagnostic_issues` from `lifecycle` + `scored`. **Follow-up:** wire the scan into a job + API surface (later epics).

## Traceability
`WORKSTREAM_REGISTRY.md` T087 → In Review; `orchestration.ts` ↔ diagnostic-scan-orchestration spec.
