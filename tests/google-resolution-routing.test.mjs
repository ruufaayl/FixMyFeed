/**
 * Issue resolution capability routing tests (task T065).
 *
 * Traceability: docs/05-integrations/google-merchant-center/{issue-resolution-
 * integration,google-appeal-workflow,restricted-actions-and-allowlists}.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { google } from "../packages/connectors/dist/index.js";

const { RESOLUTION_KINDS, routeIssueResolution, routeProductIssues } = google;

test("routeIssueResolution: attribute auto-fixes", () => {
  assert.ok(RESOLUTION_KINDS.includes("auto_fix"));
  assert.deepEqual(routeIssueResolution({ code: "missing_gtin", attributeName: "gtin" }), {
    kind: "auto_fix",
    attribute: "gtin",
    reason: "missing/invalid product identifier",
  });
  assert.equal(routeIssueResolution({ code: "missing_value_title" }).attribute, "title");
  assert.equal(routeIssueResolution({ code: "description_too_long" }).attribute, "description");
  assert.equal(
    routeIssueResolution({ code: "invalid_price", attributeName: "price" }).attribute,
    "price",
  );
});

test("routeIssueResolution: manual / appeal / unsupported", () => {
  assert.equal(routeIssueResolution({ code: "image_low_quality" }).kind, "manual");
  assert.equal(routeIssueResolution({ code: "landing_page_error" }).kind, "manual");
  assert.equal(
    routeIssueResolution({ code: "out_of_stock", attributeName: "availability" }).kind,
    "manual",
  );
  assert.equal(routeIssueResolution({ code: "policy_violation_editorial" }).kind, "appeal");
  assert.equal(routeIssueResolution({ code: "counterfeit_product" }).kind, "appeal");
  // deny-by-default: unknown -> unsupported (never silently auto-fixed)
  assert.equal(routeIssueResolution({ code: "some_new_unknown_issue" }).kind, "unsupported");
});

test("routeIssueResolution: policy wins over attribute match", () => {
  // an issue mentioning both 'title' and 'policy' must route to appeal, not auto_fix
  const plan = routeIssueResolution({
    code: "policy_title_misrepresentation",
    attributeName: "title",
  });
  assert.equal(plan.kind, "appeal");
});

test("routeProductIssues: summarizes auto-fixability", () => {
  const result = routeProductIssues({
    productId: "p1",
    title: "Widget",
    issues: [
      {
        code: "missing_gtin",
        attributeName: "gtin",
        severity: "error",
        servability: "disapproved",
        resolution: "merchant_action",
        description: "x",
        detail: null,
        documentationUrl: null,
        destination: null,
        affectedCountries: [],
      },
      {
        code: "image_low_quality",
        attributeName: "image_link",
        severity: "warning",
        servability: "demoted",
        resolution: "merchant_action",
        description: "y",
        detail: null,
        documentationUrl: null,
        destination: null,
        affectedCountries: [],
      },
    ],
  });
  assert.equal(result.productId, "p1");
  assert.equal(result.plans.length, 2);
  assert.equal(result.plans[0].code, "missing_gtin");
  assert.equal(result.plans[0].kind, "auto_fix");
  assert.equal(result.plans[1].kind, "manual");
  assert.equal(result.autoFixable, true);
});
