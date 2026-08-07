/**
 * Repair pattern tests (task T106).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RepairDiff, ApprovalPanel, Progress, Timeline } from "../dist/index.js";

describe("RepairDiff", () => {
  it("shows before (struck) and after per field", () => {
    render(<RepairDiff changes={[{ field: "price", before: "$49.99", after: "$59.99" }]} />);
    const before = screen.getByText("$49.99");
    expect(before.className).toContain("line-through");
    expect(screen.getByText("$59.99").className).toContain("var(--fmf-healthy)");
  });
});

describe("ApprovalPanel", () => {
  it("renders stats and reversibility", () => {
    render(
      <ApprovalPanel
        stats={[
          { label: "Affected products", value: 312 },
          { label: "Destination", value: "Shopify" },
        ]}
        reversible
      />,
    );
    expect(screen.getByText("Affected products")).toBeTruthy();
    expect(screen.getByText("Shopify")).toBeTruthy();
    expect(screen.getByText("Yes")).toBeTruthy();
  });
});

describe("Progress", () => {
  it("exposes an accessible progressbar with clamped percentage", () => {
    render(<Progress value={87} max={312} label="Applying repair" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("87");
    expect(bar.getAttribute("aria-valuemax")).toBe("312");
    expect(screen.getByText("87 / 312")).toBeTruthy();
  });
});

describe("Timeline", () => {
  it("renders ordered history items", () => {
    render(
      <Timeline
        items={[
          { id: "1", title: "Repair approved", time: "3h ago", tone: "brand" },
          {
            id: "2",
            title: "Repair verified",
            meta: "309 verified",
            time: "2h ago",
            tone: "healthy",
          },
        ]}
      />,
    );
    expect(screen.getByText("Repair approved")).toBeTruthy();
    expect(screen.getByText("309 verified")).toBeTruthy();
  });
});
