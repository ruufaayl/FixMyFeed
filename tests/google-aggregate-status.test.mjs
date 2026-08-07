/**
 * Google Merchant aggregate status + product data tests (task T062).
 *
 * Traceability: docs/05-integrations/google-merchant-center/{aggregate-product-
 * status-integration,products-api-integration,destination-and-country-model}.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { google, ConnectorError } from "../packages/connectors/dist/index.js";

const {
  buildAggregateStatusRequest,
  parseAggregateStatuses,
  buildProductsRequest,
  mapGoogleProduct,
} = google;

test("aggregate status: request + per-destination/country parsing", () => {
  assert.match(
    buildAggregateStatusRequest("12345", "tok").url,
    /accounts\/12345\/aggregateProductStatuses\?pageToken=tok$/,
  );
  assert.throws(() => buildAggregateStatusRequest(""), ConnectorError);

  const rows = parseAggregateStatuses({
    aggregateProductStatuses: [
      {
        reportingContext: "SHOPPING_ADS",
        country: "US",
        stats: { activeCount: "120", pendingCount: 5, disapprovedCount: "12", expiringCount: 1 },
        itemLevelIssues: [
          { code: "missing_gtin", servability: "disapproved", attribute: "gtin", count: "8" },
        ],
      },
    ],
  });
  assert.equal(rows[0].destination, "SHOPPING_ADS");
  assert.equal(rows[0].country, "US");
  assert.equal(rows[0].active, 120);
  assert.equal(rows[0].disapproved, 12);
  assert.equal(rows[0].issues[0].code, "missing_gtin");
  assert.equal(rows[0].issues[0].count, 8);
  assert.deepEqual(parseAggregateStatuses({}), []);
});

test("product data: request + normalization (price micros -> decimal)", () => {
  assert.match(buildProductsRequest("12345", { pageSize: 100 }).url, /\/products\?pageSize=100$/);
  const p = mapGoogleProduct({
    offerId: "sku-1",
    attributes: {
      title: "Widget",
      gtin: "0123456789012",
      price: { amountMicros: 9990000, currencyCode: "USD" },
      availability: "in_stock",
      link: "https://shop/x",
      imageLink: "https://cdn/x.jpg",
    },
  });
  assert.equal(p.offerId, "sku-1");
  assert.equal(p.gtin, "0123456789012");
  assert.equal(p.price, "9.99 USD");
  assert.equal(p.availability, "in_stock");
  assert.throws(() => mapGoogleProduct({}), ConnectorError);
});
