/**
 * Google Merchant product/account issue ingestion tests (task T061).
 *
 * Traceability: docs/05-integrations/google-merchant-center/{product-issues-
 * integration,account-issues-integration,issue-rendering-integration}.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { google, ConnectorError } from "../packages/connectors/dist/index.js";

const {
  buildProductStatusesRequest,
  mapProductStatus,
  parseProductStatuses,
  buildAccountIssuesRequest,
  parseAccountIssues,
} = google;

test("buildProductStatusesRequest: Merchant API productStatuses with paging", () => {
  const req = buildProductStatusesRequest("12345", { pageSize: 250, pageToken: "tok" });
  assert.equal(req.method, "GET");
  assert.match(req.url, /accounts\/12345\/productStatuses/);
  assert.match(req.url, /pageSize=250/);
  assert.match(req.url, /pageToken=tok/);
  assert.throws(() => buildProductStatusesRequest(""), ConnectorError);
});

test("mapProductStatus / parseProductStatuses: normalize item-level issues + severity", () => {
  const norm = mapProductStatus({
    productId: "online:en:US:sku-1",
    title: "Widget",
    itemLevelIssues: [
      {
        code: "missing_gtin",
        servability: "disapproved",
        resolution: "merchant_action",
        description: "Missing GTIN",
        detail: "Add a valid GTIN",
        documentation: "https://support.google.com/x",
        attributeName: "gtin",
        destination: "Shopping ads",
        applicableCountries: ["US", "CA"],
      },
      {
        code: "image_low_quality",
        servability: "demoted",
        resolution: "merchant_action",
        description: "Low-res image",
      },
    ],
  });
  assert.equal(norm.productId, "online:en:US:sku-1");
  assert.equal(norm.issues[0].code, "missing_gtin");
  assert.equal(norm.issues[0].severity, "error"); // disapproved
  assert.equal(norm.issues[0].attributeName, "gtin");
  assert.deepEqual([...norm.issues[0].affectedCountries], ["US", "CA"]);
  assert.equal(norm.issues[1].severity, "warning"); // demoted

  const all = parseProductStatuses({
    productStatuses: [{ productId: "p1" }, { name: "accounts/1/products/p2" }],
  });
  assert.equal(all.length, 2);
  assert.equal(all[1].productId, "accounts/1/products/p2");
  assert.throws(() => mapProductStatus({}), ConnectorError); // no id
});

test("account issues: request + parser", () => {
  assert.match(buildAccountIssuesRequest("12345").url, /accounts\/12345\/issues$/);
  const issues = parseAccountIssues({
    accountIssues: [
      {
        name: "accounts/1/issues/EDITORIAL_AND_PROFESSIONAL_STANDARDS",
        title: "Policy violation",
        severity: "critical",
        documentationUri: "https://support.google.com/y",
        impactedDestinations: [{ reportingContext: "SHOPPING_ADS" }],
        applicableCountries: ["US"],
      },
    ],
  });
  assert.equal(issues[0].code, "EDITORIAL_AND_PROFESSIONAL_STANDARDS");
  assert.equal(issues[0].severity, "error");
  assert.equal(issues[0].destination, "SHOPPING_ADS");
  assert.deepEqual(parseAccountIssues({}), []);
});
