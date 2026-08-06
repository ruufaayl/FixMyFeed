/**
 * Generic tenant-aware repository framework tests (task T020).
 *
 * Uses an in-memory persistence adapter to prove the isolation, concurrency,
 * soft-delete, and pagination invariants without a database. Pure Node.js.
 *
 * Traceability: multi-tenant-architecture.md, tenant-isolation-model.md,
 * data-plane-architecture.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createTenantRepository,
  validateTenantScope,
  TenantRepositoryError,
  TENANT_REPOSITORY_ERROR_CODE,
} from "../packages/database/dist/index.js";

/**
 * A faithful in-memory adapter: it applies the given scope to every read/write,
 * as a real SQL adapter must. Rows carry organization_id, version, timestamps,
 * and deleted_at.
 */
function inMemoryPersistence() {
  const rows = [];
  let clock = 0;
  const now = () => new Date(Date.parse("2026-08-06T00:00:00.000Z") + clock++ * 1000);
  const visible = (scope, r) => r.organizationId === scope.organizationId && r.deletedAt === null;
  return {
    rows,
    async insert(scope, values) {
      const row = {
        id: randomUUID(),
        organizationId: scope.organizationId,
        version: 1,
        createdAt: now(),
        updatedAt: now(),
        deletedAt: null,
        ...values,
      };
      rows.push(row);
      return row;
    },
    async findById(scope, id) {
      return rows.find((r) => r.id === id && visible(scope, r));
    },
    async list(scope, input) {
      const scoped = rows
        .filter((r) => visible(scope, r))
        .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1));
      const after = input.cursor
        ? scoped.filter(
            (r) =>
              r.createdAt < input.cursor.createdAt ||
              (r.createdAt.getTime() === input.cursor.createdAt.getTime() &&
                r.id < input.cursor.id),
          )
        : scoped;
      return after.slice(0, input.limit);
    },
    async update(scope, id, changes, expectedVersion) {
      const r = rows.find((x) => x.id === id && visible(scope, x));
      if (!r || r.version !== expectedVersion) return undefined;
      Object.assign(r, changes, { version: r.version + 1, updatedAt: now() });
      return r;
    },
    async softDelete(scope, id, expectedVersion) {
      const r = rows.find((x) => x.id === id && visible(scope, x));
      if (!r || r.version !== expectedVersion) return undefined;
      r.deletedAt = now();
      r.version += 1;
      return r;
    },
  };
}

const ORG_A = { organizationId: randomUUID() };
const ORG_B = { organizationId: randomUUID() };

const repo = () =>
  createTenantRepository("widget", inMemoryPersistence(), { maxLimit: 5, defaultLimit: 2 });

test("validateTenantScope rejects missing or malformed organization scope", () => {
  assert.throws(
    () => validateTenantScope(undefined),
    (e) => e.code === TENANT_REPOSITORY_ERROR_CODE.SCOPE_REQUIRED,
  );
  assert.throws(() => validateTenantScope({ organizationId: "not-a-uuid" }), TenantRepositoryError);
  assert.deepEqual(validateTenantScope(ORG_A), ORG_A);
});

test("create stamps the caller's organization scope onto the row", async () => {
  const r = repo();
  const row = await r.create(ORG_A, { label: "a" });
  assert.equal(row.organizationId, ORG_A.organizationId);
  assert.equal(row.version, 1);
});

test("tenant isolation: another tenant cannot see, get, update, or delete a row", async () => {
  const r = repo();
  const row = await r.create(ORG_A, { label: "secret" });

  assert.equal(await r.find(ORG_B, row.id), undefined, "invisible cross-tenant");
  await assert.rejects(
    () => r.get(ORG_B, row.id),
    (e) => e.code === TENANT_REPOSITORY_ERROR_CODE.NOT_FOUND,
  );
  await assert.rejects(
    () => r.update(ORG_B, row.id, { label: "hijack" }, 1),
    (e) => e.code === TENANT_REPOSITORY_ERROR_CODE.VERSION_CONFLICT,
  );
  await assert.rejects(
    () => r.softDelete(ORG_B, row.id, 1),
    (e) => e.code === TENANT_REPOSITORY_ERROR_CODE.VERSION_CONFLICT,
  );
  // The owner is unaffected.
  assert.equal((await r.get(ORG_A, row.id)).label, "secret");
});

test("optimistic concurrency: a stale expected version is rejected", async () => {
  const r = repo();
  const row = await r.create(ORG_A, { label: "v1" });
  const updated = await r.update(ORG_A, row.id, { label: "v2" }, 1);
  assert.equal(updated.version, 2);
  await assert.rejects(
    () => r.update(ORG_A, row.id, { label: "v3" }, 1),
    (e) => e.code === TENANT_REPOSITORY_ERROR_CODE.VERSION_CONFLICT,
  );
});

test("soft delete hides the row from reads", async () => {
  const r = repo();
  const row = await r.create(ORG_A, { label: "x" });
  await r.softDelete(ORG_A, row.id, 1);
  assert.equal(await r.find(ORG_A, row.id), undefined);
  await assert.rejects(
    () => r.get(ORG_A, row.id),
    (e) => e.code === TENANT_REPOSITORY_ERROR_CODE.NOT_FOUND,
  );
});

test("keyset pagination is bounded and yields a stable non-overlapping cursor", async () => {
  const r = repo();
  for (let i = 0; i < 5; i++) await r.create(ORG_A, { label: `w${i}` });

  const page1 = await r.list(ORG_A, { limit: 2 });
  assert.equal(page1.items.length, 2);
  assert.ok(page1.nextCursor, "more pages exist");

  const page2 = await r.list(ORG_A, { cursor: page1.nextCursor, limit: 2 });
  assert.equal(page2.items.length, 2);
  // No overlap between pages.
  const ids = new Set(page1.items.map((i) => i.id));
  assert.ok(page2.items.every((i) => !ids.has(i.id)));

  // Over-large limits are rejected (no unbounded scans).
  await assert.rejects(
    () => r.list(ORG_A, { limit: 999 }),
    (e) => e.code === TENANT_REPOSITORY_ERROR_CODE.INVALID_INPUT,
  );
});

test("list is tenant-scoped: it never returns another tenant's rows", async () => {
  const r = repo();
  await r.create(ORG_A, { label: "a" });
  await r.create(ORG_B, { label: "b" });
  const page = await r.list(ORG_A, { limit: 5 });
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].label, "a");
});
