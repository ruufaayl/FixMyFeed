# T015 Encrypted Credential Vault Implementation Plan

> Execute inline on `codex/T015-encrypted-credential-vault`; do not begin another
> T-task.

## 1. Freeze the contract

- Add the approved table authority and physical-registry row.
- Add failing schema, crypto, lifecycle, persistence, migration, and traceability
  tests in `tests/credential-vault.test.mjs`.
- Run the focused test and confirm it fails because T015 symbols are absent.

## 2. Implement authenticated encryption

- Add stable redacted error codes.
- Add AES-256-GCM envelope primitives using the existing active/previous config
  keys, versioned authenticated data, strict bounds, and key identifiers.
- Run focused crypto tests to green before refactoring.

## 3. Implement schema and vault lifecycle

- Add `encrypted_credentials`, persistence contracts, the Drizzle adapter, and the
  store/access/rotate/revoke service.
- Enforce tenant scope, idempotency, optimistic concurrency, expiry/revocation, and
  observer isolation.
- Run focused lifecycle and adapter tests to green.

## 4. Generate migration 0004 and wire shared contracts

- Append the table to schema/index barrels.
- Generate and review `0004_t015_encrypted_credential_vault`, its snapshot, and
  journal index 4.
- Append only the required full-schema keys and CI test entry; do not alter prior
  task journal assertions.
- Document safe usage and rollback in the database README.

## 5. Verify and hand off

- Run Prettier, ESLint, Node 24 TypeScript build, the complete explicit CI suite,
  traceability, Drizzle checks, and `git diff --check`.
- Update only the T015 registry row to `In Review` and write the completion report.
- Re-run all gates, commit, push, open a PR into `develop`, and do not merge it.
