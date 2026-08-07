/**
 * Google Merchant data source + destination ingestion tests (task T063).
 *
 * Traceability: docs/05-integrations/google-merchant-center/{data-sources-
 * integration,destination-and-country-model}.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { google, ConnectorError } from "../packages/connectors/dist/index.js";

const { GOOGLE_DESTINATIONS, normalizeDestination, buildDataSourcesRequest, parseDataSources } =
  google;

test("normalizeDestination: known contexts + OTHER fallback", () => {
  assert.ok(GOOGLE_DESTINATIONS.includes("SHOPPING_ADS"));
  assert.equal(normalizeDestination("shopping_ads"), "SHOPPING_ADS");
  assert.equal(normalizeDestination("FREE_LISTINGS"), "FREE_LISTINGS");
  assert.equal(normalizeDestination("something_new"), "OTHER");
  assert.equal(normalizeDestination(undefined), "OTHER");
});

test("data sources: request + parse primary/supplemental with destinations", () => {
  assert.match(
    buildDataSourcesRequest("12345", "tok").url,
    /accounts\/12345\/dataSources\?pageToken=tok$/,
  );
  assert.throws(() => buildDataSourcesRequest(""), ConnectorError);

  const sources = parseDataSources({
    dataSources: [
      {
        name: "accounts/1/dataSources/900",
        displayName: "Primary Feed",
        input: "API",
        primaryProductDataSource: {
          feedLabel: "US",
          contentLanguage: "en",
          countries: ["US", "CA"],
          destinations: [{ destination: "SHOPPING_ADS" }, { destination: "free_listings" }],
        },
      },
      {
        dataSourceId: 901,
        supplementalProductDataSource: { feedLabel: "US" },
      },
    ],
  });
  assert.equal(sources[0].dataSourceId, "900");
  assert.equal(sources[0].type, "primary");
  assert.equal(sources[0].input, "API");
  assert.deepEqual([...sources[0].countries], ["US", "CA"]);
  assert.deepEqual([...sources[0].destinations], ["SHOPPING_ADS", "FREE_LISTINGS"]);
  assert.equal(sources[1].dataSourceId, "901");
  assert.equal(sources[1].type, "supplemental");
  assert.deepEqual(parseDataSources({}), []);
});
