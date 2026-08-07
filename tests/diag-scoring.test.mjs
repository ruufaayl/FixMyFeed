/**
 * Evidence / confidence / impact / prioritization tests (task T086).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scoreIssue,
  prioritizeIssues,
  summarizeScan,
  issueConfidence,
  issueImpact,
} from "../packages/diagnostics/dist/index.js";

const norm = (o = {}) => ({
  code: "x",
  severity: "warning",
  productExternalId: "p",
  variantExternalId: null,
  field: null,
  message: "m",
  fingerprint: o.fingerprint ?? `fp-${o.code ?? "x"}-${o.productExternalId ?? "p"}`,
  ...o,
});

test("confidence: network-derived codes are less certain", () => {
  assert.equal(issueConfidence(norm({ code: "missing_title" })), 1);
  assert.equal(issueConfidence(norm({ code: "image_unreachable" })), 0.8);
});

test("impact: blocking codes are maximal regardless of severity weight", () => {
  assert.equal(issueImpact(norm({ code: "missing_price", severity: "critical" })), 1);
  assert.equal(issueImpact(norm({ code: "title_too_long", severity: "info" })), 0.15);
});

test("scoreIssue: priority = severityWeight × impact × confidence", () => {
  const blockingCritical = scoreIssue(norm({ code: "missing_title", severity: "critical" }));
  assert.equal(blockingCritical.priorityScore, 1); // 1 * 1 * 1
  const networkError = scoreIssue(norm({ code: "image_unreachable", severity: "error" }));
  // severityWeight(error)=0.7, impact(blocking)=1, confidence=0.8 -> 0.56
  assert.equal(networkError.priorityScore, 0.56);
  const info = scoreIssue(norm({ code: "title_too_long", severity: "info" }));
  // 0.15 * 0.15 * 1 = 0.0225
  assert.equal(info.priorityScore, 0.0225);
});

test("prioritizeIssues: highest priority first, deterministic ties", () => {
  const issues = [
    norm({ code: "title_too_long", severity: "info", productExternalId: "p3" }),
    norm({ code: "missing_title", severity: "critical", productExternalId: "p1" }),
    norm({ code: "missing_image", severity: "critical", productExternalId: "p2" }),
  ];
  const ordered = prioritizeIssues(issues).map((i) => i.code);
  assert.equal(ordered[ordered.length - 1], "title_too_long");
  // the two critical blocking issues tie on score -> ordered by code asc
  assert.deepEqual(ordered.slice(0, 2), ["missing_image", "missing_title"]);
});

test("summarizeScan: totals, per-severity, per-code, top N", () => {
  const issues = [
    norm({ code: "missing_title", severity: "critical", productExternalId: "a" }),
    norm({ code: "missing_title", severity: "critical", productExternalId: "b" }),
    norm({ code: "title_too_long", severity: "info", productExternalId: "a" }),
  ];
  const { summary } = summarizeScan(issues, 2);
  assert.equal(summary.total, 3);
  assert.equal(summary.bySeverity.critical, 2);
  assert.equal(summary.bySeverity.info, 1);
  assert.equal(summary.byCode.missing_title, 2);
  assert.equal(summary.topIssues.length, 2);
  assert.equal(summary.topIssues[0].severity, "critical");
});
