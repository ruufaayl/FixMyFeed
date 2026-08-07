# T086 — Completion Report

**Task:** T086 — Implement evidence confidence impact and prioritization (Epic E08)
**Branch:** `task/T080-T087-diagnostics-engine`. **State:** Not Started → In Review

## What was built

`packages/diagnostics/src/scoring.ts` — deterministic scoring/ranking of normalized issues.

- `SEVERITY_WEIGHT` (critical 1 / error 0.7 / warning 0.4 / info 0.15).
- `issueConfidence` — network-derived codes (unreachable/content-type/landing-page) score 0.8, deterministic checks 1.0.
- `issueImpact` — feed-**blocking** codes (missing title/image/price/link, invalid gtin/url, unreachable) score 1.0, else severity weight.
- `scoreIssue` → `ScoredIssue` with `priorityScore = severityWeight × impact × confidence` (4 dp).
- `prioritizeIssues` — highest priority first with fully deterministic tie-breaks (severity → code → product → variant → fingerprint).
- `summarizeScan(issues, topN=20)` → totals, per-severity + per-code counts, and top issues.

## Files changed

Added `diagnostics/scoring.ts` + `tests/diag-scoring.test.mjs` + this report; wired `diagnostics/index.ts` + `ci.yml`. No dependency, env var, schema/migration, or boundary change.

## Tests

`tests/diag-scoring.test.mjs` (5): confidence by code, blocking impact, priority arithmetic (blocking-critical=1, network-error=0.56, info=0.0225), ordered prioritization with deterministic ties, scan summary (totals/severity/code/topN).

## Security & privacy

Pure; no secrets. Scores derive only from issue code/severity, no external data.

## Rollback / limitations

Revert the E08 PR or remove `scoring.ts`. Weights are heuristic constants, tunable later. **Follow-up:** scan orchestration (T087) uses `summarizeScan` for the scan result surfaced to merchants.

## Traceability

`WORKSTREAM_REGISTRY.md` T086 → In Review; `scoring.ts` ↔ evidence / confidence / impact / prioritization specs.
