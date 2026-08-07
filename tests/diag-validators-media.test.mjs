/**
 * Image + URL acquisition validator tests (task T083).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mediaValidators,
  isHttpUrl,
  checkUrlAcquisition,
  runValidators,
} from "../packages/diagnostics/dist/index.js";

const image = (url, altText = "alt") => ({ externalId: "i", url, altText });
const product = (externalId, o = {}) => ({
  externalId,
  handle: null,
  title: "P",
  description: null,
  productType: null,
  vendor: null,
  status: "active",
  tags: [],
  onlineStoreUrl: "https://shop.example/p",
  images: [image("https://cdn.example/i.jpg")],
  variants: [],
  ...o,
});

const codes = (products) => runValidators(mediaValidators, { products }).issues.map((i) => i.code);

test("isHttpUrl: absolute http(s) only", () => {
  assert.equal(isHttpUrl("https://a.example/x"), true);
  assert.equal(isHttpUrl("http://a.example"), true);
  assert.equal(isHttpUrl("ftp://a.example"), false);
  assert.equal(isHttpUrl("/relative"), false);
  assert.equal(isHttpUrl(null), false);
});

test("media structural: clean product yields no issues", () => {
  assert.deepEqual(codes([product("p1")]), []);
});

test("media structural: invalid/insecure image + link, missing alt", () => {
  const p = product("p1", {
    onlineStoreUrl: "http://shop.example/p", // insecure
    images: [image("not a url", null), image("http://cdn.example/i.jpg", null)], // invalid + insecure + no alt
  });
  const found = codes([p]).sort();
  assert.deepEqual(found, [
    "insecure_image_url",
    "insecure_link_url",
    "invalid_image_url",
    "missing_image_alt",
    "missing_image_alt",
  ]);
});

test("checkUrlAcquisition: unreachable image/link and bad content type", async () => {
  const probe = {
    async probe(url) {
      if (url.includes("dead")) return { ok: false, status: 404, contentType: null };
      if (url.includes("html")) return { ok: true, status: 200, contentType: "text/html" };
      return { ok: true, status: 200, contentType: "image/jpeg" };
    },
  };
  const products = [
    product("a", {
      onlineStoreUrl: "https://shop.example/dead-page",
      images: [image("https://cdn.example/dead.jpg"), image("https://cdn.example/html")],
    }),
    product("b", { images: [image("https://cdn.example/ok.jpg")] }),
  ];
  const issues = await checkUrlAcquisition(products, probe);
  const codes2 = issues.map((i) => i.code);
  assert.ok(codes2.includes("image_unreachable"));
  assert.ok(codes2.includes("image_bad_content_type"));
  assert.ok(codes2.includes("link_unreachable"));
  // product b's ok image produced nothing
  assert.equal(issues.filter((i) => i.productExternalId === "b").length, 0);
});

test("checkUrlAcquisition: each distinct URL probed once", async () => {
  let calls = 0;
  const probe = {
    async probe() {
      calls += 1;
      return { ok: true, status: 200, contentType: "image/png" };
    },
  };
  const shared = "https://cdn.example/shared.png";
  await checkUrlAcquisition(
    [
      product("a", { onlineStoreUrl: null, images: [image(shared)] }),
      product("b", { onlineStoreUrl: null, images: [image(shared)] }),
    ],
    probe,
  );
  assert.equal(calls, 1);
});
