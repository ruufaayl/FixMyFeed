/**
 * Application shell + workspace context tests (task T101).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar, TopBar, AppShell, WorkspaceProvider, WorkspaceSwitcher } from "../dist/index.js";

const sections = [
  {
    id: "main",
    label: "Workspace",
    items: [
      { id: "overview", label: "Overview", href: "/overview" },
      { id: "issues", label: "Issues", href: "/issues", badge: <span>37</span> },
    ],
  },
];

describe("Sidebar", () => {
  it("marks the active item with aria-current and renders nav landmark", () => {
    render(<Sidebar sections={sections} activeId="issues" />);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    const issues = screen.getByText("Issues").closest("[aria-current]");
    expect(issues?.getAttribute("aria-current")).toBe("page");
    // Inactive items render no aria-current attribute at all.
    expect(screen.getByText("Overview").closest("[aria-current]")).toBeNull();
  });

  it("uses the supplied renderLink for router integration", () => {
    render(
      <Sidebar
        sections={sections}
        activeId="overview"
        renderLink={(item, className, children) => (
          <a data-testid={`link-${item.id}`} href={item.href} className={className}>
            {children}
          </a>
        )}
      />,
    );
    expect(screen.getByTestId("link-overview")).toBeTruthy();
    expect(screen.getByTestId("link-issues").getAttribute("href")).toBe("/issues");
  });

  it("collapses to icon rail", () => {
    render(<Sidebar sections={sections} activeId="overview" collapsed />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav.getAttribute("data-collapsed")).toBe("true");
  });
});

describe("WorkspaceProvider + WorkspaceSwitcher", () => {
  it("shows the active workspace and calls onSwitch on change", () => {
    const onSwitch = vi.fn();
    render(
      <WorkspaceProvider
        workspaces={[
          { id: "w1", name: "Acme Store" },
          { id: "w2", name: "Globex" },
        ]}
        activeWorkspaceId="w1"
        onSwitch={onSwitch}
      >
        <WorkspaceSwitcher />
      </WorkspaceProvider>,
    );
    const select = screen.getByLabelText("Active workspace") as HTMLSelectElement;
    expect(select.value).toBe("w1");
    fireEvent.change(select, { target: { value: "w2" } });
    expect(onSwitch).toHaveBeenCalledWith("w2");
  });
});

describe("AppShell", () => {
  it("composes sidebar, top bar, and main content", () => {
    render(
      <AppShell
        sidebar={<Sidebar sections={sections} activeId="overview" />}
        topBar={<TopBar title="Catalog health" />}
      >
        <div>Body content</div>
      </AppShell>,
    );
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByText("Body content")).toBeTruthy();
    expect(screen.getByText("Catalog health")).toBeTruthy();
  });
});
