/**
 * Shopify repair-loop certification — deterministic CI layer (task T165-A).
 *
 * Drives the REAL port stack — the T160 Admin client, the T161 WritebackPort, the
 * T162 fresh-read ObserveValue, the T164 bounded retry, and the T094/T095/T096
 * executor/verification/rollback — over a SIMULATED Shopify transport. Only the
 * external Shopify HTTP boundary is replaced; the repair engine is the production
 * code. Covers the required scenarios: successful writeback, fresh verification,
 * rollback, deleted product, unsupported field, revoked token, throttling, and a
 * concurrent edit / stale baseline — plus idempotency and no-credential-leakage.
 *
 * Records CI_CERTIFIED. Live-dev-store certification (T165-B) is a separate,
 * owner-run gate; unrestricted production writeback stays disabled until it passes.
 */
import { describe, it, expect, vi } from "vitest";
import { shopify, ConnectorError } from "@fixmyfeed/connectors";

type ShopifyHttpRequest = shopify.ShopifyHttpRequest;
type ShopifyHttpResponse = shopify.ShopifyHttpResponse;
import {
  executeWriteback,
  verifyExecution,
  buildRollbackInstructions,
  executeRollback,
  type WritebackInstruction,
} from "@fixmyfeed/repairs";
import { createShopifyWritebackPort } from "../lib/server/adapters/shopify-writeback-adapter";
import { createShopifyObservePort } from "../lib/server/adapters/shopify-observe-adapter";
import { withBoundedRetry } from "../lib/server/adapters/writeback-failures";

const TOKEN = "shpat_cert_secret";
const SHOP = "cert-store.myshopify.com";
const PRODUCT = "gid://shopify/Product/100";

/** In-memory Shopify store + scriptable behaviors, behind a fake HTTP transport. */
function simulatedShopify(initial: Record<string, string>) {
  const product: Record<string, string> | null = { ...initial };
  const state = {
    product: product as Record<string, string> | null,
    partnerDevelopment: true,
    /** Force HTTP responses for the next N mutation calls (e.g. 429, 401, 500). */
    forcedStatuses: [] as number[],
    /** When true, mutations report success but do not change the value. */
    silentNoop: false,
    calls: [] as ShopifyHttpRequest[],
  };

  function pairs(input: string): Record<string, string> {
    const out: Record<string, string> = {};
    const re = /(\w+):\s*("(?:\\.|[^"\\])*")/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) out[m[1]!] = JSON.parse(m[2]!) as string;
    return out;
  }

  const transport = {
    async send(request: ShopifyHttpRequest): Promise<ShopifyHttpResponse> {
      state.calls.push(request);
      // Credential must be present in the header (proves it is used) …
      if (request.headers["X-Shopify-Access-Token"] !== TOKEN) {
        return jsonResponse(401, {});
      }
      const body = JSON.parse(request.body) as { query: string };
      const q = body.query;

      const forced = state.forcedStatuses.shift();
      if (forced !== undefined && forced !== 200) return jsonResponse(forced, {});

      if (q.includes("partnerDevelopment")) {
        return jsonResponse(200, {
          data: { shop: { plan: { partnerDevelopment: state.partnerDevelopment } } },
        });
      }
      if (q.includes("product(id:")) {
        return jsonResponse(200, { data: { product: state.product } });
      }
      if (q.includes("productUpdate(")) {
        const input = pairs(q);
        if (state.product !== null && !state.silentNoop) {
          for (const [k, v] of Object.entries(input)) if (k !== "id") state.product[k] = v;
        }
        return jsonResponse(200, { data: { productUpdate: { userErrors: [] } } });
      }
      return jsonResponse(200, { data: {} });
    },
  };

  return { state, transport };
}

function jsonResponse(status: number, body: unknown): ShopifyHttpResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    header: () => null,
    json: () => Promise.resolve(body),
  };
}

function client(transport: { send: (r: ShopifyHttpRequest) => Promise<ShopifyHttpResponse> }) {
  return shopify.createShopifyAdminClient({ shop: SHOP, accessToken: TOKEN, transport });
}

const instruction = (over: Partial<WritebackInstruction> = {}): WritebackInstruction => ({
  productExternalId: PRODUCT,
  variantExternalId: null,
  field: "title",
  before: "Old title",
  after: "New title",
  ...over,
});

/** Runs apply → fresh verification over the real ports (no DB). */
async function applyAndVerify(
  transport: { send: (r: ShopifyHttpRequest) => Promise<ShopifyHttpResponse> },
  instr: WritebackInstruction,
) {
  const admin = client(transport);
  const writeback = withBoundedRetry(
    createShopifyWritebackPort(admin, { executionId: "cert-exec" }),
    {
      sleep: () => Promise.resolve(),
    },
  );
  const observe = createShopifyObservePort(admin);
  const outcome = await executeWriteback([instr], writeback);
  const observed = new Map<string, string | null>();
  for (const item of outcome.items) {
    if (item.status === "succeeded")
      observed.set(item.instruction.field, await observe.observe(item.instruction));
  }
  const verification = verifyExecution(outcome, (i) =>
    observed.has(i.field) ? (observed.get(i.field) ?? null) : null,
  );
  return { outcome, verification };
}

describe("Shopify certification (CI, simulated transport)", () => {
  it("1. successful writeback verifies via a fresh read", async () => {
    const sim = simulatedShopify({ title: "Old title" });
    const { outcome, verification } = await applyAndVerify(sim.transport, instruction());
    expect(outcome.status).toBe("completed");
    expect(sim.state.product?.title).toBe("New title");
    expect(verification.verified).toBe(1);
    expect(verification.failed).toBe(0);
  });

  it("2. a silent no-op mutation is NOT treated as verified", async () => {
    const sim = simulatedShopify({ title: "Old title" });
    sim.state.silentNoop = true; // mutation reports success but changes nothing
    const { outcome, verification } = await applyAndVerify(sim.transport, instruction());
    expect(outcome.succeeded).toBe(1); // write "succeeded"
    expect(verification.verified).toBe(0); // but verification (fresh read) fails
    expect(verification.failed).toBe(1);
  });

  it("3. rollback restores the prior value", async () => {
    const sim = simulatedShopify({ title: "Old title" });
    const { verification } = await applyAndVerify(sim.transport, instruction());
    expect(verification.items[0]!.status).toBe("verified");
    const admin = client(sim.transport);
    const writeback = createShopifyWritebackPort(admin, { executionId: "cert-rollback" });
    const rollback = buildRollbackInstructions([
      {
        productExternalId: PRODUCT,
        variantExternalId: null,
        field: "title",
        afterValue: "New title",
        beforeValue: "Old title",
        status: "verified",
      },
    ]);
    const outcome = await executeRollback(rollback, writeback);
    expect(outcome.status).toBe("completed");
    expect(sim.state.product?.title).toBe("Old title");
  });

  it("4. a deleted product is reported, not created", async () => {
    const sim = simulatedShopify({ title: "Old title" });
    sim.state.product = null;
    const { outcome } = await applyAndVerify(sim.transport, instruction());
    expect(outcome.items[0]).toMatchObject({ status: "failed" });
    expect(sim.state.product).toBeNull();
  });

  it("5. an unsupported field is rejected without any Shopify call", async () => {
    const sim = simulatedShopify({ title: "Old title" });
    const { outcome } = await applyAndVerify(sim.transport, instruction({ field: "images" }));
    expect(outcome.items[0]).toMatchObject({ status: "failed" });
    expect(sim.state.calls).toHaveLength(0);
  });

  it("6. a revoked/invalid token surfaces as an auth failure (no retry)", async () => {
    const sim = simulatedShopify({ title: "Old title" });
    sim.state.forcedStatuses = [401, 401, 401];
    const admin = client(sim.transport);
    const retries = vi.fn(() => Promise.resolve());
    const writeback = withBoundedRetry(createShopifyWritebackPort(admin, { executionId: "e" }), {
      sleep: retries,
    });
    const outcome = await executeWriteback([instruction()], writeback);
    expect(outcome.items[0]).toMatchObject({ status: "failed" });
    expect(retries).not.toHaveBeenCalled(); // reconnect disposition — not retried
  });

  it("7. throttling is retried within bounds then succeeds", async () => {
    const sim = simulatedShopify({ title: "Old title" });
    sim.state.forcedStatuses = [429]; // first mutation throttled, then OK
    const admin = client(sim.transport);
    const writeback = withBoundedRetry(createShopifyWritebackPort(admin, { executionId: "e" }), {
      sleep: () => Promise.resolve(),
    });
    const outcome = await executeWriteback([instruction()], writeback);
    expect(outcome.status).toBe("completed");
    expect(sim.state.product?.title).toBe("New title");
  });

  it("8. a concurrent edit / stale baseline blocks the write", async () => {
    const sim = simulatedShopify({ title: "Merchant edited this" });
    const { outcome } = await applyAndVerify(sim.transport, instruction());
    expect(outcome.items[0]).toMatchObject({ status: "failed" });
    // The value the merchant set is untouched.
    expect(sim.state.product?.title).toBe("Merchant edited this");
    expect(sim.state.calls.some((c) => JSON.parse(c.body).query.includes("productUpdate("))).toBe(
      false,
    );
  });

  it("idempotency: applying the same instruction twice converges to one value", async () => {
    const sim = simulatedShopify({ title: "Old title" });
    await applyAndVerify(sim.transport, instruction());
    // Second apply now sees the live value == after; treated as a stale baseline
    // (already applied) and does not double-write.
    const second = await applyAndVerify(sim.transport, instruction());
    expect(sim.state.product?.title).toBe("New title");
    expect(second.outcome.items[0]).toMatchObject({ status: "failed" }); // no-op, not a second write
  });

  it("no credential leakage: a 500 error never contains the token", async () => {
    const sim = simulatedShopify({ title: "Old title" });
    sim.state.forcedStatuses = [500];
    const admin = client(sim.transport);
    await expect(admin.graphql("query { shop { id } }")).rejects.toSatisfy(
      (e: unknown) => e instanceof ConnectorError && !String((e as Error).message).includes(TOKEN),
    );
  });
});
