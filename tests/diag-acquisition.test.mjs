/**
 * Feed upload / remote acquisition tests (task T070).
 *
 * Traceability: docs/05-integrations/google-merchant-center/api-migration-runbook.md
 * (n/a), docs/07-data-architecture/large-catalog-storage.md, feed acquisition specs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FEED_FORMATS,
  MAX_FEED_BYTES,
  validateFeedUrl,
  detectFeedFormat,
  validateFeedSource,
  DiagnosticsError,
} from "../packages/diagnostics/dist/index.js";

test("validateFeedUrl: https only, rejects internal/private hosts", () => {
  assert.equal(
    validateFeedUrl("https://feeds.example.com/products.xml"),
    "https://feeds.example.com/products.xml",
  );
  for (const bad of [
    "",
    "http://feeds.example.com/x", // not https
    "https://localhost/x",
    "https://127.0.0.1/x",
    "https://192.168.0.1/x",
    "https://169.254.169.254/x",
    "not a url",
  ]) {
    assert.throws(() => validateFeedUrl(bad), DiagnosticsError, `expected "${bad}" rejected`);
  }
});

test("detectFeedFormat: from content type and filename", () => {
  assert.equal(detectFeedFormat("application/json"), "json");
  assert.equal(detectFeedFormat("application/rss+xml"), "xml");
  assert.equal(detectFeedFormat("text/csv"), "csv");
  assert.equal(detectFeedFormat("text/tab-separated-values"), "tsv");
  assert.equal(detectFeedFormat(null, "products.xml"), "xml");
  assert.equal(detectFeedFormat(null, "feed.tsv"), "tsv");
  assert.equal(detectFeedFormat(null, "unknown.bin"), null);
  assert.ok(FEED_FORMATS.includes("csv"));
});

test("validateFeedSource: upload + url, format resolution, size cap, SSRF", () => {
  const upload = validateFeedSource({ kind: "upload", filename: "products.csv", sizeBytes: 1000 });
  assert.equal(upload.format, "csv");
  assert.equal(upload.url, null);

  const url = validateFeedSource({ kind: "url", url: "https://feeds.example.com/f.xml" });
  assert.equal(url.format, "xml");
  assert.equal(url.url, "https://feeds.example.com/f.xml");

  assert.throws(
    () => validateFeedSource({ kind: "url", url: "http://localhost/x" }),
    DiagnosticsError,
  );
  assert.throws(() => validateFeedSource({ kind: "upload", filename: "x.bin" }), DiagnosticsError); // unknown format
  assert.throws(
    () => validateFeedSource({ kind: "upload", format: "csv", sizeBytes: MAX_FEED_BYTES + 1 }),
    DiagnosticsError,
  );
  assert.throws(() => validateFeedSource({ kind: "bogus" }), DiagnosticsError);
});
