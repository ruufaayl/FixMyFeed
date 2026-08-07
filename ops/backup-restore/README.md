# Backup & Restore Automation

This directory holds the **machine-checkable backup/restore automation plan** for
FixMyFeed and the documentation hook that keeps it honest (task T027).

## Files

- **`manifest.json`** — the declarative automation plan: what is backed up, on
  what cadence, with what retention and encryption, how a restore is performed
  and verified, the recovery objectives, and the human runbook it points to.
- Validated by **`tools/backup-restore/check.mjs`** (run in CI as
  `pnpm run check:backup-restore`) and by **`tests/backup-restore.test.mjs`**.

## The plan (summary)

| Target             | Kind           | Schedule | Retention | Encrypted | PITR |
| ------------------ | -------------- | -------- | --------- | --------- | ---- |
| `primary-postgres` | database       | hourly   | 30 days   | yes       | yes  |
| `object-storage`   | object-storage | daily    | 90 days   | yes       | no   |

- **Objectives:** RPO 60 min, RTO 240 min.
- **Restore order:** provision → restore Postgres → restore object storage →
  apply pending migrations → verify → cutover.
- **Restore verification:** schema smoke, row-count reconciliation, audit-chain
  integrity.
- **DR drill cadence:** every 90 days.

## What the hook enforces

The documentation hook fails CI if the plan drifts from reality or from policy:

- both required target kinds (`database`, `object-storage`) are declared, each
  with a schedule, positive retention, and **`encrypted: true`** (tenant-data
  backups must be encrypted);
- recovery objectives are present and consistent (`RPO ≤ RTO`);
- the restore plan has ordered steps including a `verify` step and the required
  verification checks;
- the referenced **runbook document exists**; and
- every declared data store still exists as a package in the repo
  (`packages/database`, `packages/storage`) — so a store can't be removed
  without updating the backup plan, and vice versa.

## Authoritative specifications

The runbook and policy authority live in the specification set:

- `docs/20-devops-sre-and-platform-engineering/runbooks/backup-restore.md`
- `docs/07-data-architecture/backup-and-restore.md`
- `docs/20-devops-sre-and-platform-engineering/{backup-policy,restore-policy,disaster-recovery}.md`
- `docs/04-system-architecture/disaster-recovery-architecture.md`

The values in `manifest.json` are the implemented plan; reconcile any numeric
policy changes with the specification owner.
