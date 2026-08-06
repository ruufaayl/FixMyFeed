# Database package

This package is FixMyFeed's only SQL boundary. T010 establishes the typed
PostgreSQL/Drizzle framework and deliberately creates no business tables;
table-owning tasks add approved definitions through `src/schema.ts`.

## Schema conventions

- IDs are application-generated RFC 9562 UUIDv7 values.
- Tenant-owned records use `organization_id`; tenant lookup indexes begin
  with that column.
- Mutable records use PostgreSQL `timestamptz` audit columns and an integer
  `version` starting at 1.
- List indexes use `(organization_id, created_at DESC, id DESC)` unless the
  owning table specification explicitly defines another access pattern.
- `DATABASE_URL` is consumed only from the approved configuration boundary or
  migration process. It must never be logged or committed.

## Migration workflow

From the repository root:

1. Change only approved definitions aggregated by `src/schema.ts`.
2. Run `pnpm --filter @fixmyfeed/database db:generate`.
3. Review generated SQL for locks, tenant constraints, destructive statements,
   data loss, index strategy, and PostgreSQL 17 compatibility.
4. Run `pnpm --filter @fixmyfeed/database db:check`.
5. Rehearse forward migration, failure injection, and rollback against an
   isolated PostgreSQL 17 database before approval.
6. Apply committed migrations with `db:migrate` or
   `runDatabaseMigrations`; both use the `drizzle.__drizzle_migrations`
   journal. Never use `drizzle-kit push` in shared or production environments.

Migration files and snapshots are immutable after merge. Renames and
destructive changes require reviewed custom SQL and an expand/migrate/contract
sequence. Backfills must be separate, resumable, observable, rate-limited, and
idempotent.

## Rollback

Rollback is a reviewed release action, not an automatically generated down
migration. Before deployment, record one of:

- application rollback while retaining a backwards-compatible expanded schema;
- a pre-reviewed corrective forward migration;
- restoration into an isolated database followed by verified recovery.

Never delete a migration journal entry, edit an applied migration, or issue an
unreviewed destructive statement. T010's baseline journal has zero migrations,
so its rollback is removal of the framework before any migration is applied.

## Failure behavior

Client validation accepts only PostgreSQL URLs and bounded pools. Construction
is lazy. Migration failures expose stable error codes, omit credentials, emit
only lifecycle event types, and close the dedicated single-connection client.
