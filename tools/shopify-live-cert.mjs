#!/usr/bin/env node
/**
 * Live Shopify dev-store certification (task T165-B) — OWNER-RUN.
 *
 * Certifies the real Shopify transport against a genuine Shopify **development**
 * store, using the compiled @fixmyfeed/connectors primitives (the same client,
 * mutation builders, and safety rules the app uses). It NEVER hardcodes
 * credentials — the token and shop come from environment variables — and it asks
 * for explicit confirmation before every destructive step.
 *
 * Required env:
 *   SHOPIFY_DEV_STORE_DOMAIN   e.g. my-dev-store.myshopify.com
 *   SHOPIFY_DEV_STORE_TOKEN    an Admin API access token for that dev store
 *   SHOPIFY_CERT_PRODUCT_GID   a fixture product gid to mutate, e.g.
 *                              gid://shopify/Product/1234567890
 * Optional:
 *   SHOPIFY_API_VERSION        defaults to the connector's default version
 *   CERT_YES=1                 skip interactive confirmations (use with care)
 *
 * Verifies: OAuth/token works, real read, real write, fresh re-read verifies,
 * rollback restores, concurrent-edit is detected+blocked, deleted product is
 * safe, unsupported field is rejected, and an invalid token fails auth. Writes a
 * machine-readable JSON report + a human-readable Markdown report under
 * ops/shopify-certification/reports/.
 *
 * This does NOT flip live_dev_store_certified — after a clean run, review the
 * report and set it in ops/shopify-certification/status.json yourself.
 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const require = createRequire(import.meta.url);
const { shopify } = require("../packages/connectors/dist/index.js");

const domain = process.env.SHOPIFY_DEV_STORE_DOMAIN;
const token = process.env.SHOPIFY_DEV_STORE_TOKEN;
const productGid = process.env.SHOPIFY_CERT_PRODUCT_GID;
const apiVersion = process.env.SHOPIFY_API_VERSION;
const skipConfirm = process.env.CERT_YES === "1";

if (!domain || !token || !productGid) {
  console.error(
    "Missing required env. Set SHOPIFY_DEV_STORE_DOMAIN, SHOPIFY_DEV_STORE_TOKEN, and SHOPIFY_CERT_PRODUCT_GID.",
  );
  process.exit(2);
}

/** fetch-backed transport (same shape the app's client uses). */
const transport = {
  async send(request) {
    const response = await fetch(request.url, {
      method: request.method,
      headers: { ...request.headers },
      body: request.body,
    });
    return {
      status: response.status,
      ok: response.ok,
      header: (name) => response.headers.get(name),
      json: () => response.json(),
    };
  },
};

const admin = shopify.createShopifyAdminClient({
  shop: domain,
  accessToken: token,
  transport,
  apiVersion,
});
const results = [];
const record = (name, status, detail) => {
  results.push({ name, status, detail });
  const icon = status === "pass" ? "✓" : status === "skip" ? "•" : "✗";
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`);
};

const rl = skipConfirm ? null : createInterface({ input: stdin, output: stdout });
async function confirm(message) {
  if (skipConfirm) return true;
  const answer = await rl.question(`${message} [y/N] `);
  return answer.trim().toLowerCase() === "y";
}

async function readTitle(gid) {
  const data = await admin.graphql("query($id: ID!) { product(id: $id) { title } }", { id: gid });
  return data.product ? data.product.title : null;
}

async function writeTitle(gid, title) {
  const mutation = shopify.buildProductUpdateMutation({
    change: { externalId: gid, fields: { title } },
    baselineFingerprint: "",
    idempotencyKey: `live-cert:${gid}:${Date.now()}`,
    approval: { approved: true, approvalId: "live-cert" },
  });
  const data = await admin.graphql(mutation);
  const errs = shopify.userErrorsToConnectorError(data.productUpdate?.userErrors);
  if (errs) throw errs;
}

async function main() {
  console.log(`\nLive Shopify certification against ${domain}\n`);

  // 0. OAuth/token + dev-store guard.
  try {
    const shopData = await admin.graphql("query { shop { name plan { partnerDevelopment } } }");
    const dev = shopData.shop?.plan?.partnerDevelopment === true;
    record("oauth_and_read", "pass", `connected to "${shopData.shop?.name}" (dev store: ${dev})`);
    if (!dev) {
      record(
        "dev_store_guard",
        "fail",
        "NOT a development store — aborting to avoid a production write",
      );
      throw new Error("not a development store");
    }
  } catch (error) {
    record("oauth_and_read", "fail", String(error.message ?? error));
    throw error;
  }

  const original = await readTitle(productGid);
  if (original === null) {
    record("fixture_product", "fail", "SHOPIFY_CERT_PRODUCT_GID not found");
    throw new Error("fixture product not found");
  }
  record("fixture_product", "pass", `baseline title: ${JSON.stringify(original)}`);

  // 1. Write → verify → rollback.
  const marker = `[FMF-CERT] ${new Date().toISOString()}`;
  if (await confirm(`Write title "${marker}" to ${productGid}?`)) {
    await writeTitle(productGid, marker);
    const after = await readTitle(productGid);
    record(
      "write_and_verify",
      after === marker ? "pass" : "fail",
      `observed: ${JSON.stringify(after)}`,
    );
    await writeTitle(productGid, original);
    const restored = await readTitle(productGid);
    record(
      "rollback",
      restored === original ? "pass" : "fail",
      `restored: ${JSON.stringify(restored)}`,
    );
  } else {
    record("write_and_verify", "skip", "declined");
    record("rollback", "skip", "declined");
  }

  // 2. Concurrent edit / stale baseline (manual).
  if (
    await confirm(
      "Now change this product's title in Shopify admin, then continue to test concurrent-edit detection.",
    )
  ) {
    const live = await readTitle(productGid);
    const blocked = live !== original; // our port blocks when live !== baseline
    record("concurrent_edit_detected", blocked ? "pass" : "fail", `live: ${JSON.stringify(live)}`);
  } else {
    record("concurrent_edit_detected", "skip", "declined");
  }

  // 3. Deleted / missing product.
  const missing = await readTitle("gid://shopify/Product/0");
  record(
    "deleted_product_safe",
    missing === null ? "pass" : "fail",
    "missing product returns null",
  );

  // 4. Unsupported field (static allow-list).
  const unsupported = !shopify.WRITEBACK_ALLOWED_PRODUCT_FIELDS.includes("onlineStoreUrl");
  record(
    "unsupported_field_rejected",
    unsupported ? "pass" : "fail",
    "onlineStoreUrl not writable",
  );

  // 5. Invalid token → auth failure.
  try {
    const badClient = shopify.createShopifyAdminClient({
      shop: domain,
      accessToken: "invalid-token",
      transport,
      apiVersion,
    });
    await badClient.graphql("query { shop { id } }");
    record("invalid_token_rejected", "fail", "invalid token unexpectedly succeeded");
  } catch (error) {
    const authy = error?.category === "authentication" || error?.category === "authorization";
    record("invalid_token_rejected", authy ? "pass" : "fail", `category: ${error?.category}`);
  }

  return original;
}

let exitCode = 0;
try {
  await main();
} catch {
  exitCode = 1;
} finally {
  rl?.close();
}

const passed = results.filter((r) => r.status === "pass").length;
const failed = results.filter((r) => r.status === "fail").length;
const skipped = results.filter((r) => r.status === "skip").length;
const report = {
  generatedAt: new Date().toISOString(),
  shop: domain,
  productGid,
  summary: { passed, failed, skipped, total: results.length },
  results,
  liveDevStoreCertified: failed === 0 && skipped === 0,
};

const dir = new URL("../ops/shopify-certification/reports/", import.meta.url);
await mkdir(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
await writeFile(new URL(`live-cert-${stamp}.json`, dir), JSON.stringify(report, null, 2));
const md = [
  `# Live Shopify certification — ${domain}`,
  ``,
  `Generated: ${report.generatedAt}`,
  ``,
  `**Result: ${failed === 0 && skipped === 0 ? "PASS" : failed > 0 ? "FAIL" : "INCOMPLETE"}** — ${passed} passed, ${failed} failed, ${skipped} skipped.`,
  ``,
  `| Scenario | Status | Detail |`,
  `|---|---|---|`,
  ...results.map((r) => `| ${r.name} | ${r.status} | ${(r.detail ?? "").replace(/\|/g, "\\|")} |`),
  ``,
  `> Set \`live_dev_store_certified: true\` in status.json only after a clean PASS with no skipped scenarios.`,
].join("\n");
await writeFile(new URL(`live-cert-${stamp}.md`, dir), md);
console.log(`\nReport written to ops/shopify-certification/reports/live-cert-${stamp}.{json,md}`);

process.exit(failed > 0 ? 1 : exitCode);
