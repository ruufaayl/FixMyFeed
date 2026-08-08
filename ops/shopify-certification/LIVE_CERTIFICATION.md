# Shopify Live Dev-Store Certification (T165-B)

The deterministic CI certification (`ci_certified`) proves the repair loop over a
**simulated** Shopify transport. Before enabling any wider writeback, run this
**live** certification against a real Shopify **development** store and record the
result.

## Prerequisites

1. A Shopify **Partner development store** (never a live merchant store).
2. An Admin API access token for that store with `read_products, write_products`
   scopes — either:
   - a **custom app** created in the dev store (Settings → Apps and sales channels
     → Develop apps → create app → Admin API access token), or
   - the token already stored by the app's OAuth install.
3. A fixture product in that store whose title may be changed and restored. Copy
   its GID (Product → ⋯ → copy, or from the Admin API): `gid://shopify/Product/…`.

## Run

The script reads credentials from the environment (never hardcoded) and asks for
confirmation before every destructive step:

```bash
SHOPIFY_DEV_STORE_DOMAIN=my-dev-store.myshopify.com \
SHOPIFY_DEV_STORE_TOKEN=shpat_xxx \
SHOPIFY_CERT_PRODUCT_GID=gid://shopify/Product/1234567890 \
node tools/shopify-live-cert.mjs
```

Add `CERT_YES=1` only for a fully non-interactive run (it skips the confirmation
prompts — use with care).

## What it certifies

| Scenario          | Expectation                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| OAuth + read      | Token authenticates; `shop` query returns; store is a dev store              |
| Fixture product   | The `SHOPIFY_CERT_PRODUCT_GID` product is found                              |
| Write + verify    | Title write succeeds and a **fresh re-read** returns the new value           |
| Rollback          | The original title is restored and re-verified                               |
| Concurrent edit   | After you edit the product in Admin, the stale-baseline write is **blocked** |
| Deleted product   | A missing product GID returns null (handled safely, never created)           |
| Unsupported field | A non-allow-listed field (e.g. `onlineStoreUrl`) is not writable             |
| Invalid token     | A bad token fails with an `authentication`/`authorization` category          |

Throttling/retry is exercised deterministically in the CI harness (429 → bounded
retry) and honored live via `Retry-After`; it is not force-triggered here.

## Recording the result

The script writes `ops/shopify-certification/reports/live-cert-<timestamp>.{json,md}`.
After a clean **PASS with no skipped scenarios**, review the report and set in
`ops/shopify-certification/status.json`:

```json
"live_dev_store_certified": true
```

Only then consider `WRITEBACK_SAFETY_MODE=allowlisted` (with `WRITEBACK_ALLOWED_SHOPS`)
or `production`. The default remains `dev_store_only`.
