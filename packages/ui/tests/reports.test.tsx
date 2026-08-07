/**
 * Report card tests (task T107).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportCard } from "../dist/index.js";

describe("ReportCard", () => {
  it("renders title, description, stat, and actions", () => {
    render(
      <ReportCard
        title="Catalog health report"
        description="Weekly summary"
        stat="82"
        actions={<button type="button">Export CSV</button>}
      />,
    );
    expect(screen.getByText("Catalog health report")).toBeTruthy();
    expect(screen.getByText("Weekly summary")).toBeTruthy();
    expect(screen.getByText("82")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeTruthy();
  });
});
