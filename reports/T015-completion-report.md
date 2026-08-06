# T015 — Completion Report

- **Task:** T015 — Implement encrypted credential vault (Epic E01)
- **Branch:** `codex/T015-encrypted-credential-vault` → PR into `develop`
- **Base:** `develop@882fd7e` (after T016 migration `0003`)
- **State transition:** `Not Started` → `In Review`

## Owner-approved authority decision

The imported physical registry had no dedicated vault table while the coordinated
migration contract required T015 to own `0004`. The owner explicitly selected and
approved option A: add the authoritative `encrypted_credentials` table rather than
absorbing the broader `platform_connections`/T030–T031 lifecycle scope. T015 adds
the exact 17-column table authority and registry entry in the same change.

## Specifications read

- Repository authority: `/AGENTS.md`, `/IMPLEMENTATION_SEQUENCE.md`,
  `/IMPLEMENTATION_BASELINE.md`, and `/implementation/WORKSTREAM_REGISTRY.md`.
- Task/epic authority: T015 and E01 implementation specifications.
- Architecture/security: secrets architecture, encryption-at-rest, key management,
  secrets management, encryption field policy, ADR-032 authenticated connector
  credentials, and ADR-040 no secrets in jobs.
- Data/migrations: physical schema registry, platform-connection context, identifier,
  timestamp, migration, schema-versioning, rollback, retention, and database
  authorities.
- Merged dependencies: T003 config, T010 migration framework, T012 tenancy, T014
  session security, and T016 immutable audit contracts.

## Files changed

- **Vault implementation:** `packages/database/src/credential-vault-{crypto,errors,schema}.ts`,
  `credential-vault.ts`, and additive schema/index exports.
- **Persistence:** tenant-scoped Drizzle insert, lookup, optimistic envelope rotation,
  and revocation adapter; database README safe-use guidance.
- **Migration:** `0004_t015_encrypted_credential_vault.sql`, immutable snapshot, and
  journal index 4.
- **Tests/gates:** `tests/credential-vault.test.mjs`; additive full-schema keys in
  auth/tenancy tests; explicit CI test-list entry.
- **Authority/traceability:** new encrypted-credentials table specification, physical
  registry row, T015 registry state, design/plan documents, and this report.

No root package metadata, lockfile, prior migration, prior migration assertion,
T014-owned file, or T016-owned file was changed.

## Requirements implemented

- AES-256-GCM application-level authenticated encryption using Node's built-in
  crypto, a fresh 12-byte nonce, a 16-byte tag, strict 32-byte base64 keys, and a
  SHA-256 key identifier. No third-party crypto or paid service is introduced.
- Versioned authenticated additional data binds ciphertext to credential ID,
  organization, provider, and credential type. Cross-tenant movement, tampering,
  malformed envelope metadata, and unknown keys fail closed.
- Existing `DATA_ENCRYPTION_KEY` encrypts; optional
  `PREVIOUS_DATA_ENCRYPTION_KEY` decrypts only. Explicit optimistic rotation rewrites
  previous-key envelopes under the active key.
- Tenant-scoped store, callback access, rotation, and idempotent terminal revocation.
  Expired/revoked rows never reach the plaintext callback.
- Idempotent creation returns the original record for an identical replay and rejects
  provider/type/expiry/secret drift using constant-time plaintext comparison.
- Metadata responses and lifecycle observer events exclude envelope and secret
  fields. Observer failure cannot change durable success. Unknown persistence and
  crypto failures become stable redacted vault errors.
- The callback receives a bounded owned plaintext buffer which is cleared in
  `finally`. Jobs and later connectors receive credential references, never secrets.

## Schema and migration

`encrypted_credentials` has 17 documented columns, restrictive organization/user
foreign keys, closed status/algorithm checks, envelope-size checks, revocation
consistency, positive optimistic versioning, tenant/actor idempotency uniqueness,
and tenant-first list/provider indexes.

Migration `0004_t015_encrypted_credential_vault` is additive and creates exactly
that table. Review caught and prevented a Drizzle `$1` placeholder in the algorithm
check; a regression test now requires literal-safe migration SQL and rejects SQL
parameters or destructive operations.

## Tests and acceptance evidence

- Prettier repository check — exit 0.
- ESLint repository check — exit 0.
- Node 24 TypeScript project build/typecheck — exit 0.
- Focused T015 suite — **21 passed, 0 failed**.
- Full explicit CI suite — **114 passed, 0 failed**.
- Generated traceability check — 100 task rows/docs, 15 epic docs, and 43 catalog
  variables consistent.
- `drizzle-kit check` — `Everything's fine` for migrations 0000–0004.
- `git diff --check` — exit 0.

Acceptance evidence covers encryption randomness/binary round trips, authenticated
tenant binding, tamper and metadata rejection, previous-key rotation, configuration
redaction, exact schema columns/indexes, tenant isolation, bounded callback access,
validation, expiry, revocation, optimistic conflicts, idempotency drift, observer
isolation, Drizzle tenant predicates, stable persistence failures, literal-safe
migration SQL, journal index 4, and physical-authority alignment.

## Security, privacy, performance, and cost

- Raw keys, plaintext, ciphertext, nonces, tags, and idempotency values are excluded
  from metadata and telemetry. Stable errors discard unknown exception details.
- Tenant ID remains in every persistence predicate even when credential ID is
  globally unique. Restrictive foreign keys prevent silent tenant/actor deletion.
- Encryption/decryption and constant-time replay comparison are O(payload), bounded
  to 65,536 bytes. Indexed operations are tenant-scoped; no unbounded list is added.
- Cost is $0: no new package, API, SaaS, recurring dependency, or provider call.
- Accessibility is not applicable because T015 adds no UI or route.

## Environment variables and external approvals

No environment variable was added or changed. Production use requires the already
documented `DATA_ENCRYPTION_KEY`; rotation may temporarily provide the already
documented `PREVIOUS_DATA_ENCRYPTION_KEY`. No values or real credentials are added.

## Rollback

Prefer application rollback while retaining the additive table. Before a destructive
contract migration: stop new writes, rotate/revoke or migrate every active credential,
verify backup/restore evidence, check retention/legal hold, and obtain explicit
operator approval. Never edit applied `0004`, its snapshot, or its journal entry.

## Known limitations and follow-ups

1. No owner-supplied disposable PostgreSQL environment was available, so migration
   0000–0004 was validated through Drizzle history/schema checks and SQL contracts,
   not a live `drizzle-kit migrate`. Merge T005/PR #5 and run the coordinated live
   migration-chain rehearsal before further database migrations accumulate.
2. Plaintext buffer clearing is best effort in garbage-collected JavaScript; callers
   can copy or retain callback data and therefore must follow the documented
   immediate-use contract.
3. T016 audit persistence is intentionally not hard-wired into the database vault.
   Applications can translate the bounded injected lifecycle events into immutable
   audit records without coupling the vault to an audit writer.

## Traceability

- `implementation/WORKSTREAM_REGISTRY.md`: T015 → `In Review`.
- `tests/credential-vault.test.mjs`: primary, failure, security, lifecycle,
  persistence, migration, journal, and authority evidence.
- Physical registry and encrypted-credentials authority: exact 17-column contract.
- `docs/superpowers/specs` and `docs/superpowers/plans`: owner-approved design and
  inline execution plan.
