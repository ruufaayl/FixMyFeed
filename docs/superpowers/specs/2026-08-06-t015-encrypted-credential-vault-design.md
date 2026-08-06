# T015 Encrypted Credential Vault Design

## Status and authority

Approved by the repository owner on 2026-08-06. This design implements T015 on
`codex/T015-encrypted-credential-vault` from `develop@882fd7e`. The owner explicitly
authorized a new authoritative `encrypted_credentials` table and migration
`0004_t015_encrypted_credential_vault`.

## Boundaries

The vault belongs to `@fixmyfeed/database`, the only package allowed to issue SQL.
Applications and later connector orchestration depend on its public contract;
connector implementations never receive database clients or encryption keys. No
new dependency, environment variable, paid service, or provider integration is
introduced.

## Cryptographic envelope

Provider credentials use AES-256-GCM through `node:crypto`, with a fresh 12-byte
nonce and 16-byte authentication tag for every encryption. The existing validated
`DATA_ENCRYPTION_KEY` supplies the active 32-byte key and
`PREVIOUS_DATA_ENCRYPTION_KEY` optionally supplies the decryption-only rotation
key. A SHA-256 key identifier is stored; raw keys are never persisted.

Authenticated additional data is a versioned canonical encoding of the credential
ID, organization ID, provider, and credential type. Moving ciphertext between
tenants or credential records therefore fails authentication. Credential payloads
are bounded binary data. Errors expose stable codes and never include keys,
plaintext, ciphertext, authentication tags, or persistence details.

## Physical schema

`encrypted_credentials` is organization-owned and contains 17 columns:

1. `id` (application-generated UUIDv7 primary key)
2. `organization_id` (restrictive organization foreign key)
3. `provider` (bounded normalized identifier)
4. `credential_type` (bounded normalized identifier)
5. `status` (`active` or `revoked`)
6. `algorithm` (fixed `aes-256-gcm`)
7. `key_id` (SHA-256 hexadecimal identifier)
8. `nonce` (12-byte `bytea`)
9. `ciphertext` (bounded non-empty `bytea`)
10. `auth_tag` (16-byte `bytea`)
11. `idempotency_key` (bounded request identity)
12. `created_by_user_id` (restrictive user foreign key)
13. `expires_at` (optional provider expiry)
14. `revoked_at` (required exactly when revoked)
15. `created_at`
16. `updated_at`
17. `version` (positive optimistic-concurrency token)

Tenant-first indexes support lookup and pagination. Creation is unique by
organization, actor, and idempotency key. The migration is additive and contains
no destructive operation.

## Service contract and lifecycle

The vault exposes tenant-scoped store, metadata, callback access, rotation, and
revocation operations backed by an injected persistence port and a concrete
Drizzle adapter. Store allocates the stable ID before encryption so the ID can be
bound into authenticated data. Duplicate creation returns the original reference
without rewriting its secret.

Credential access validates tenant scope and lifecycle before decryption. Plaintext
is passed only to a callback and its owned buffer is cleared in `finally`. The
callback may not serialize, log, enqueue, or retain the credential. Expired and
revoked credentials fail closed. Rotation decrypts using the active or previous
key and rewrites the envelope under the active key with optimistic concurrency.
Revocation is idempotent and makes later access fail.

## Failure and observability

Stable failure categories distinguish validation, missing scope, not found,
expired, revoked, key unavailable, authentication/decryption failure, conflict,
and persistence failure. An optional observer receives bounded lifecycle events
for store, access, rotation, revocation, and failure; it receives identifiers and
codes only. Observer failure cannot change a durable outcome. Later application
wiring may translate these events into T016 immutable audit records.

## Verification and rollback

Tests cover encryption randomness, binary round trips, authenticated-data binding,
tamper detection, redaction, active/previous-key rotation, tenant isolation,
idempotency, expiration, revocation, optimistic conflicts, observer isolation,
Drizzle tenant predicates, schema constraints, migration ordering, and authority
alignment. Full formatting, linting, type checking, unit/integration tests,
traceability, Drizzle validation, and diff checks run before completion.

Rollback is application-first while retaining the additive table. Before a
production contract migration, disable new writes, revoke or migrate active
credentials, verify backup/restore evidence, and obtain operator approval. Never
edit an applied migration, snapshot, or journal entry.
