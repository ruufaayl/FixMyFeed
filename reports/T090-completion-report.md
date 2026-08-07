# T090 — Completion Report

**Task:** T090 — Implement remediation registry and safety classes (Epic E09)
**Branch:** `task/T090-T097-repair-engine`. **State:** Not Started → In Review

## What was built

`packages/repairs/src/registry.ts` — the foundation of the repair engine, keyed by E08 diagnostic issue codes.

- `SAFETY_CLASSES` (automatic / assisted / manual / blocked) + `RISK_LEVELS` (low/medium/high).
- `Remediation` descriptor (issueCode, title, safetyClass, riskLevel, targetField, variantScoped, description).
- `canAutoApply` — **only** `automatic` + non-high risk.
- `RemediationRegistry` — register/dedupe-by-code, `safetyClassFor` **deny-by-default → manual** for unknown codes.
- `BUILTIN_REMEDIATIONS` + `defaultRemediationRegistry()` — only deterministic reversible rewrites (http→https) are `automatic`; content-invention/price/GTIN are `assisted`/`manual`.

Activated the previously-inert `@fixmyfeed/repairs` package (deps domain/database/connectors/diagnostics per boundaries.json).

## Files changed

Added `repairs/registry.ts`, rewrote `repairs/index.ts`, added `repairs/package.json` workspace deps, `tests/repairs-registry.test.mjs`, this report; wired `ci.yml`. No schema/migration; boundaries unchanged (deps already allow-listed).

## Tests

`tests/repairs-registry.test.mjs` (4): safety-class order, `canAutoApply` gating, registry dedupe + deny-by-default, built-ins (http-upgrade auto-appliable; missing_title/invalid_gtin never auto). Boundaries test still green.

## Security & privacy

Pure; no secrets. Deny-by-default safety classing is the core guard — no remediation implies `manual`, and high-risk fields are never auto-applied.

## Rollback / limitations

Revert the E09 PR or remove `registry.ts`. Built-in set is intentionally conservative; expands as validators grow. **Follow-up:** plan generation (T091) selects from this registry.

## Traceability

`WORKSTREAM_REGISTRY.md` T090 → In Review; `registry.ts` ↔ remediation-registry / safety-class specs (E09 epic).
