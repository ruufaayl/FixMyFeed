#!/usr/bin/env node
/**
 * Real-database smoke test — run after `drizzle-kit migrate` against a live
 * PostgreSQL instance (CI Postgres service container). Validates that the full
 * migration chain (0000–0010) produced the expected tables and that the T016
 * audit-log immutability trigger actually blocks UPDATE and DELETE.
 *
 * Requires DATABASE_URL. Uses the `postgres` driver already declared by
 * packages/database.
 */
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const databaseRequire = createRequire(
  new URL("../packages/database/package.json", import.meta.url),
);
const postgres = databaseRequire("postgres");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for the database smoke test");

const sql = postgres(url, { max: 1, onnotice: () => {} });

const EXPECTED_TABLES = [
  "users",
  "user_identities",
  "sessions",
  "authentication_verifications",
  "organizations",
  "workspaces",
  "memberships",
  "authentication_events",
  "security_events",
  "audit_logs",
  "encrypted_credentials",
  "support_access_grants",
  "outbox_events",
  "inbox_events",
  "operations",
  "idempotency_keys",
  "oauth_connections",
  "webhook_receipts",
  "connector_sync_cursors",
];

async function main() {
  // 1. All documented tables exist after migration.
  const rows = await sql`
    select table_name from information_schema.tables where table_schema = 'public'
  `;
  const present = new Set(rows.map((r) => r.table_name));
  for (const table of EXPECTED_TABLES) {
    assert.ok(present.has(table), `expected table missing after migrate: ${table}`);
  }

  // 2. audit_logs is append-only: an inserted row cannot be updated or deleted.
  const id = randomUUID();
  const genesis = "0".repeat(64);
  await sql`
    insert into audit_logs (id, actor_type, action, resource_type, outcome, occurred_at, hash)
    values (${id}, 'system', 'authentication', 'smoke_test', 'success', now(), ${genesis})
  `;

  let updateBlocked = false;
  try {
    await sql`update audit_logs set code = 'tamper' where id = ${id}`;
  } catch {
    updateBlocked = true;
  }
  assert.ok(updateBlocked, "audit_logs immutability trigger did NOT block UPDATE");

  let deleteBlocked = false;
  try {
    await sql`delete from audit_logs where id = ${id}`;
  } catch {
    deleteBlocked = true;
  }
  assert.ok(deleteBlocked, "audit_logs immutability trigger did NOT block DELETE");

  console.log(
    `DB smoke passed: ${EXPECTED_TABLES.length} tables present; audit_logs UPDATE and DELETE are blocked by the immutability trigger.`,
  );
}

try {
  await main();
} finally {
  await sql.end({ timeout: 5 });
}
