/**
 * Pure issue/evidence mapper tests (task T153).
 */
import { describe, it, expect } from "vitest";
import {
  severityFromRank,
  humanizeCode,
  toEvidenceEntries,
  explainCode,
} from "../lib/server/adapters/issue-mappers";

describe("severityFromRank", () => {
  it("maps ranks and clamps unknown to info", () => {
    expect(severityFromRank(0)).toBe("critical");
    expect(severityFromRank(2)).toBe("warning");
    expect(severityFromRank(9)).toBe("info");
  });
});

describe("humanizeCode", () => {
  it("turns a code into a readable title", () => {
    expect(humanizeCode("insecure_image_url")).toBe("Insecure image url");
    expect(humanizeCode("")).toBe("");
  });
});

describe("toEvidenceEntries", () => {
  it("maps affected issues to per-source entries, flagging critical", () => {
    const entries = toEvidenceEntries([
      {
        productExternalId: "p1",
        message: "http image",
        lastSeenAt: "2026-08-08T00:00:00.000Z",
        severity: "critical",
      },
      {
        productExternalId: null,
        message: "no product",
        lastSeenAt: "2026-08-08T00:00:00.000Z",
        severity: "warning",
      },
    ]);
    expect(entries[0]).toMatchObject({ source: "p1", value: "http image", mismatch: true });
    expect(entries[1]).toMatchObject({ source: "—", mismatch: false });
  });
});

describe("explainCode", () => {
  it("returns known explanations and a generic fallback", () => {
    expect(explainCode("missing_title").explanation).toMatch(/title/i);
    const fallback = explainCode("some_new_code");
    expect(fallback.explanation).toMatch(/Some new code/);
    expect(fallback.whyItMatters).toMatch(/catalog health/i);
  });
});
