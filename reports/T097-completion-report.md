# T097 — Completion Report

**Task:** T097 — Implement rule builder expression and simulation (Epic E09). **State:** Not Started → In Review — completes E09.

## What was built

A safe, declarative auto-remediation rule language + persistence.

**Schema (migration 0016):** `repair_rules` — tenant rules (name, enabled, priority, `definition` jsonb). The definition is declarative data, **never executable code**.

**Logic (`packages/repairs/rules.ts`, pure):** `RuleDefinition` = `all` (AND) / `any` (OR) conditions over an issue's `code`/`severity`/`field`, plus an `action` (auto_apply/flag/ignore). `validateRuleDefinition` (deny-by-default: rejects unknown fields/operators/actions + mismatched value shapes), `matchesRule`, `selectRule` (highest-priority enabled match), `simulateRules` (what would match, without applying), `toRepairRuleRow` (validates before insert).

## Tests

`tests/repairs-rules.test.mjs` (5): validation deny-by-default, all/any matching, priority selection, simulation (disabled rules excluded, dedup match count), row builder + schema/migration 0016. db-smoke 0000–0016; auth/tenancy schema-key updated.

## Security

No `eval` — rules are declarative data validated deny-by-default. Simulation applies nothing. Pure.

## Traceability

`WORKSTREAM_REGISTRY.md` T097 → In Review; `rules.ts` + `repair_rules` ↔ rule-builder / simulation specs. **E09 (T090–T097) complete.**
