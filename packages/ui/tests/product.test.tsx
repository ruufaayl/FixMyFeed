/**
 * Product signal pattern tests (task T103).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthSignal, IntegrationStatus, ActivityItem } from "../dist/index.js";

describe("HealthSignal", () => {
  it("renders title, severity, affected count, exposure, and mismatched source", () => {
    render(
      <HealthSignal
        title="Price mismatch"
        severity="critical"
        affectedCount={312}
        exposure="$18,420/mo"
        confidence={99}
        detectedLabel="8 minutes ago"
        sources={[
          { label: "Shopify", value: "$49.99" },
          { label: "Landing page", value: "$59.99", mismatch: true },
        ]}
      />,
    );
    expect(screen.getByText("Price mismatch")).toBeTruthy();
    expect(screen.getByText("Critical")).toBeTruthy();
    expect(screen.getByText("312")).toBeTruthy();
    expect(screen.getByText(/\$18,420\/mo/)).toBeTruthy();
    expect(screen.getByText("Confidence 99%")).toBeTruthy();
    const mismatch = screen.getByText("$59.99");
    expect(mismatch.className).toContain("var(--fmf-critical)");
  });
});

describe("IntegrationStatus", () => {
  it("lists integrations with their status label", () => {
    render(
      <IntegrationStatus
        integrations={[
          { id: "shopify", name: "Shopify", tone: "healthy", status: "Healthy" },
          { id: "google", name: "Google", tone: "warning", status: "Degraded" },
        ]}
      />,
    );
    expect(screen.getByText("Shopify")).toBeTruthy();
    expect(screen.getByText("Healthy")).toBeTruthy();
    expect(screen.getByText("Degraded")).toBeTruthy();
  });
});

describe("ActivityItem", () => {
  it("renders title, meta, and time", () => {
    render(<ActivityItem title="Repair applied" meta="312 products" time="2m ago" />);
    expect(screen.getByText("Repair applied")).toBeTruthy();
    expect(screen.getByText("312 products")).toBeTruthy();
    expect(screen.getByText("2m ago")).toBeTruthy();
  });
});
