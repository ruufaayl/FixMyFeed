/**
 * Issue-center pattern tests (task T105).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar, EvidencePanel } from "../dist/index.js";

describe("FilterBar", () => {
  it("renders filters and saved views; fires change + select", () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <FilterBar
        filters={[
          {
            id: "severity",
            label: "Severity",
            value: "all",
            options: [
              { value: "all", label: "All" },
              { value: "critical", label: "Critical" },
            ],
            onChange,
          },
        ]}
        savedViews={[
          { id: "crit", label: "Critical", active: true, onSelect },
          { id: "new", label: "New today", onSelect },
        ]}
      />,
    );
    // active saved view is pressed
    expect(screen.getByRole("button", { name: "Critical" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "New today" }));
    expect(onSelect).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Severity"), { target: { value: "critical" } });
    expect(onChange).toHaveBeenCalledWith("critical");
  });
});

describe("EvidencePanel", () => {
  it("shows per-source evidence with mismatch emphasis and the explanation sections", () => {
    render(
      <EvidencePanel
        evidence={[
          { source: "Landing page", value: "$59.99", observedAt: "14:23:02", mismatch: true },
          { source: "Google", value: "$49.99", observedAt: "14:27:40" },
        ]}
        explanation="Prices differ."
        whyItMatters="Google expects matching prices."
        recommendedRepair="Align the landing page price."
      />,
    );
    expect(screen.getByText("Evidence")).toBeTruthy();
    expect(screen.getByText("Why it matters")).toBeTruthy();
    expect(screen.getByText("Recommended repair")).toBeTruthy();
    expect(screen.getByText("$59.99").className).toContain("var(--fmf-critical)");
    expect(screen.getByText("14:27:40")).toBeTruthy();
  });
});
