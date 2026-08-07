# T080 — Completion Report

**Task:** T080 — Implement validator registry and execution framework (Epic E08)
**Branch:** `task/T080-T087-diagnostics-engine`. **State:** Not Started → In Review

## What was built
`packages/diagnostics/src/engine.ts` — the deterministic core of the diagnostics engine.
- `ISSUE_SEVERITIES` (critical/error/warning/info) + `ValidationIssue` (code, severity, product/variant/field, message, optional evidence).
- `issue(...)` factory (null defaults; evidence only when supplied) and `productValidator(id, title, check)` to lift a per-product check into a catalog `Validator`.
- `ValidatorRegistry` — ordered, dedupe-by-id (`register`/`registerAll`/`has`/`get`/`list`/`size`).
- `runValidators(validators, context)` — runs in stable order, **isolates a thrower** (empty issues + recorded in `failed`) so one bad validator never aborts a scan.

## Files changed
Added `diagnostics/engine.ts` + `tests/diag-engine.test.mjs` + this report; wired `diagnostics/index.ts` + `ci.yml`. No dependency, env var, schema/migration, or boundary change.

## Tests
`tests/diag-engine.test.mjs` (5): issue factory, severity order, registry dedupe/order, product-validator flattening, executor aggregation + thrower isolation.

## Security & privacy
Pure; no secrets. Evidence is caller-populated from catalog data only.

## Rollback / limitations
Revert the E08 PR or remove `engine.ts`. **Follow-up:** concrete validators (T081–T084), issue lifecycle (T085), scoring (T086), scan orchestration (T087) build on this.

## Traceability
`WORKSTREAM_REGISTRY.md` T080 → In Review; `engine.ts` ↔ validator-registry / execution-framework specs.
