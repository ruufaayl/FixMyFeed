# T022 — Completion Report

**Task:** T022 — Implement transactional outbox and event consumers (Epic E02)
**Branch:** `task/T022-implement-transactional-outbox-and-event-consumers` → PR into `develop`
**Depends on:** T010 (database), T012 (tenancy), T021 (queues) — merged.
**State transition:** `Not Started` → `In Review`

## What was built

The **transactional outbox** and **idempotent inbox** for reliable, exactly-once-effect event delivery (event-driven-architecture.md):

- **`outbox-schema.ts`** — `outbox_events` (written in the _same transaction_ as the business mutation, so an event is never lost and never published without its mutation) with a `pending → published / failed / dead` lifecycle, `attempt_count`, occurrence/publish timestamps, optimistic `version`, and a `(status, occurred_at)` index that drives the relay. `inbox_events` records which events a named consumer has processed, with a **unique `(event_id, consumer)`** index for idempotency.
- **`outbox.ts`** — pure, deterministic logic over **ports** (so it needs neither a database nor the queue runtime to test):
  - `createOutboxEvent` — validated pending-event builder (inserted inside the caller's tx).
  - `createOutboxRelay` — publishes a batch of pending events, marks them `published`, and on publish failure increments the attempt and **retries until `maxAttempts`, then dead-letters — never drops** an event.
  - `consumeOnce` — idempotent consumption guard: runs the handler only the first time an event is seen by a consumer.
- **Migration `0006`** creates both tables (additive, non-destructive).

Boundaries stay clean: the relay depends on an injected `OutboxPublisher` port (the worker app wires it to T021's queue `enqueue`), so `database` never imports `jobs`.

## Files changed

- **Added:** `packages/database/src/{outbox-schema,outbox}.ts`, `tests/outbox.test.mjs`.
- **Generated:** `drizzle/0006_t022_transactional_outbox.sql`, `meta/0006_snapshot.json`, `meta/_journal.json` (entry `idx: 6`).
- **Modified:** `packages/database/src/{schema,index}.ts`, `tests/auth.test.mjs` + `tests/tenancy.test.mjs` (schema-key lists += `outboxEvents`/`inboxEvents`), `.github/workflows/ci.yml`.
- **Traceability:** `WORKSTREAM_REGISTRY.md` T022 → `In Review`.

No new dependency; no root `package.json`/lockfile change.

## Tests and exact results

Full CI gate **locally**: `node --test` over all 15 test files → **149 pass, 0 fail**; `prettier --check .` clean; `eslint .` clean; `check:traceability` 100/100.

`tests/outbox.test.mjs` (7): event creation + validation; relay publishes all pending and marks them; a publish failure schedules a retry (stays pending, attempt++); **an event is dead-lettered after maxAttempts, never dropped**; `consumeOnce` idempotency (handler runs once across redeliveries); outbox/inbox table shape; migration `0006` creates both tables and is recorded at `entries[6]`.

**Verification limits (no live database):** the relay/inbox run over in-memory ports. The transactional write + real relay/dedup need Postgres — exercisable via the CI Postgres service (the migration-apply job already applies `0006`); a DB-backed integration test is a reasonable follow-up.

## Security & privacy

- The outbox couples events to their mutation transactionally — no phantom events, no lost events. Exhausted events are dead-lettered, never silently discarded.
- Events carry `organization_id` for tenant-scoped processing; `payload` is documented as redacted (secrets live in the T015 vault, not in events).
- The inbox's unique `(event_id, consumer)` constraint enforces exactly-once effect even under redelivery.

## Accessibility / performance / cost

N/A (backend). Cost $0. The relay processes bounded batches; the `(status, occurred_at)` index keeps pending scans cheap.

## Environment variables / external approvals

None.

## Rollback procedure

Revert the PR merge commit, or delete `packages/database/src/{outbox-schema,outbox}.ts` + `tests/outbox.test.mjs`, the `0006` migration/snapshot + journal entry, revert `schema.ts`/`index.ts` and the two schema-key lists, drop the ci.yml entry, and set the T022 registry row to `Not Started`. `0006` is expand-only (a contract migration dropping the two tables reverses it). Non-destructive.

## Known limitations / follow-ups

1. **DB-backed integration** (transactional insert, relay polling with row locking, inbox unique-violation dedup) — deferred to a Postgres run.
2. **Relay scheduling** (a maintenance job invoking `runOnce` on an interval) is wired via T021's `maintenance` queue in a follow-up.
3. Registry column counts for `outbox_events`/`inbox_events` are templated; the implemented columns follow the documented vocabulary — reconcile counts with the doc owner if desired (consistent with earlier tasks).

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T022 → `In Review`.
- `packages/database/src/outbox*.ts` trace to `event-driven-architecture.md`, `asynchronous-communication.md`, `outbox-events.md`, `inbox-events.md`.
- `tests/outbox.test.mjs` provides outbox/relay/inbox evidence.
