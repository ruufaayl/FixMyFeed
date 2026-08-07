/**
 * Feed parser tests (task T071) — CSV/TSV/XML/JSON.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCsv,
  parseTsv,
  parseJson,
  parseXml,
  parseFeed,
  DiagnosticsError,
} from "../packages/diagnostics/dist/index.js";

test("parseCsv: header keying, quoted fields, embedded delimiters/newlines", () => {
  const csv =
    "id,title,price\n" +
    '1,"Red, Large","9.99"\n' +
    '2,"He said ""hi""","5.00"\n' +
    '3,"multi\nline",1.00\n';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { id: "1", title: "Red, Large", price: "9.99" });
  assert.equal(rows[1].title, 'He said "hi"');
  assert.equal(rows[2].title, "multi\nline");
  assert.deepEqual(parseCsv(""), []);
});

test("parseTsv: tab-delimited", () => {
  const rows = parseTsv("id\ttitle\n1\tWidget\n2\tGadget");
  assert.deepEqual(rows, [
    { id: "1", title: "Widget" },
    { id: "2", title: "Gadget" },
  ]);
});

test("parseJson: array or {products|items}", () => {
  assert.deepEqual(parseJson('[{"id":1,"title":"A"}]'), [{ id: "1", title: "A" }]);
  assert.deepEqual(parseJson('{"products":[{"id":2}]}'), [{ id: "2" }]);
  // nested objects are ignored (flat scalar fields only)
  assert.deepEqual(parseJson('[{"id":3,"nested":{"x":1}}]'), [{ id: "3" }]);
  assert.throws(() => parseJson("{not json}"), DiagnosticsError);
  assert.throws(() => parseJson('{"foo":1}'), DiagnosticsError); // no array
});

test("parseXml: RSS items with g: namespace, entities, CDATA", () => {
  const xml = `<?xml version="1.0"?>
  <rss><channel>
    <item>
      <g:id>SKU-1</g:id>
      <title>Red &amp; Blue</title>
      <g:price>9.99 USD</g:price>
      <description><![CDATA[<b>Great</b> product]]></description>
    </item>
    <item><g:id>SKU-2</g:id><title>Second</title></item>
  </channel></rss>`;
  const rows = parseXml(xml);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, "SKU-1"); // g: stripped
  assert.equal(rows[0].title, "Red & Blue"); // entity decoded
  assert.equal(rows[0].price, "9.99 USD");
  assert.equal(rows[0].description, "<b>Great</b> product"); // CDATA unwrapped
  assert.equal(rows[1].id, "SKU-2");
  assert.deepEqual(parseXml("<rss></rss>"), []);
});

test("parseFeed: dispatches by format", () => {
  assert.equal(parseFeed("csv", "id\n1").length, 1);
  assert.equal(parseFeed("xml", "<item><g:id>1</g:id></item>").length, 1);
  assert.throws(() => parseFeed("bogus", "x"), DiagnosticsError);
});
