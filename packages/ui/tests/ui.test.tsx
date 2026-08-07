/**
 * Signal Interface design-system foundation tests (task T100).
 *
 * Exercises the built dist under Vitest + jsdom: rendering, accessibility
 * attributes, tone/severity mapping, and variant behavior.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Button,
  Badge,
  Input,
  HealthScore,
  healthScoreTone,
  IssueBadge,
  StatusDot,
  Metric,
  EmptyState,
  severityTone,
  compareSeverity,
  ISSUE_SEVERITIES,
} from "../dist/index.js";

describe("Button", () => {
  it("defaults to type=button and renders its label", () => {
    render(<Button>Run scan</Button>);
    const button = screen.getByRole("button", { name: "Run scan" });
    expect(button.getAttribute("type")).toBe("button");
  });

  it("applies variant + focus-ring classes", () => {
    render(<Button variant="danger">Delete</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("var(--fmf-critical)");
    expect(cls).toContain("focus-visible:ring-2");
  });
});

describe("Badge", () => {
  it("renders tone classes", () => {
    render(<Badge tone="healthy">OK</Badge>);
    expect(screen.getByText("OK").className).toContain("var(--fmf-healthy)");
  });
});

describe("Input", () => {
  it("sets aria-invalid when invalid", () => {
    render(<Input invalid aria-label="price" />);
    expect(screen.getByLabelText("price").getAttribute("aria-invalid")).toBe("true");
  });
});

describe("severity mapping", () => {
  it("maps severities to tones and orders most-severe first", () => {
    expect(severityTone("critical")).toBe("critical");
    expect(severityTone("warning")).toBe("warning");
    expect(severityTone("info")).toBe("info");
    const sorted = [...ISSUE_SEVERITIES].reverse().sort(compareSeverity);
    expect(sorted[0]).toBe("critical");
  });

  it("IssueBadge shows the severity label text (not color-only)", () => {
    render(<IssueBadge severity="warning" />);
    expect(screen.getByText("Warning")).toBeTruthy();
  });
});

describe("HealthScore", () => {
  it("derives tone from thresholds", () => {
    expect(healthScoreTone(90)).toBe("healthy");
    expect(healthScoreTone(60)).toBe("warning");
    expect(healthScoreTone(20)).toBe("critical");
  });

  it("clamps, labels, and exposes an accessible score", () => {
    render(<HealthScore score={82} delta={3} />);
    expect(screen.getByLabelText("Catalog health 82 out of 100")).toBeTruthy();
    expect(screen.getByText("Healthy")).toBeTruthy();
    expect(screen.getByText("+3")).toBeTruthy();
  });
});

describe("StatusDot + Metric", () => {
  it("StatusDot renders its text label", () => {
    render(<StatusDot tone="healthy" label="Connected" />);
    expect(screen.getByText("Connected")).toBeTruthy();
  });

  it("Metric renders label, value, caption", () => {
    render(<Metric label="Critical issues" value={37} caption="needs attention" />);
    expect(screen.getByText("Critical issues")).toBeTruthy();
    expect(screen.getByText("37")).toBeTruthy();
  });
});

describe("EmptyState", () => {
  it("carries role=status and the kind for teaching empty states", () => {
    render(<EmptyState kind="filtered" title="No matching issues" />);
    const el = screen.getByRole("status");
    expect(el.getAttribute("data-empty-kind")).toBe("filtered");
    expect(screen.getByText("No matching issues")).toBeTruthy();
  });
});
