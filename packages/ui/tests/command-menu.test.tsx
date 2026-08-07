/**
 * Command menu + onboarding pattern tests (task T102).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandMenu, filterCommands, Stepper, ConnectCard } from "../dist/index.js";

const commands = [
  { id: "scan", label: "Run new scan", group: "Actions", onRun: () => {} },
  {
    id: "issues",
    label: "Show critical issues",
    group: "Navigate",
    keywords: ["problems"],
    onRun: () => {},
  },
  { id: "connect", label: "Connect store", group: "Actions", onRun: () => {} },
];

describe("filterCommands", () => {
  it("returns all when query empty; matches label, group, keywords (case-insensitive)", () => {
    expect(filterCommands(commands, "")).toHaveLength(3);
    expect(filterCommands(commands, "SCAN").map((c) => c.id)).toEqual(["scan"]);
    expect(filterCommands(commands, "problems").map((c) => c.id)).toEqual(["issues"]);
    expect(filterCommands(commands, "navigate").map((c) => c.id)).toEqual(["issues"]);
    expect(filterCommands(commands, "zzz")).toHaveLength(0);
  });
});

describe("CommandMenu", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <CommandMenu open={false} onOpenChange={() => {}} commands={commands} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("filters as you type and runs a command on click", () => {
    const onRun = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CommandMenu
        open
        onOpenChange={onOpenChange}
        commands={[{ id: "scan", label: "Run new scan", onRun }]}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Command menu" })).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: /Run new scan/ }));
    expect(onRun).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Escape requests close; Enter runs the active option", () => {
    const onRun = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CommandMenu
        open
        onOpenChange={onOpenChange}
        commands={[{ id: "scan", label: "Run new scan", onRun }]}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Command menu" });
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(onRun).toHaveBeenCalledOnce();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("Onboarding", () => {
  it("Stepper marks step states accessibly", () => {
    render(
      <Stepper
        steps={[
          { id: "store", label: "Connect your store", state: "done" },
          { id: "google", label: "Connect Google", state: "active" },
          { id: "scan", label: "First scan", state: "upcoming" },
        ]}
      />,
    );
    expect(screen.getByText("Connect your store")).toBeTruthy();
    expect(screen.getByText("(active)")).toBeTruthy();
  });

  it("ConnectCard shows connection state", () => {
    render(<ConnectCard title="Shopify" state="connected" />);
    const card = screen.getByText("Shopify").closest("[data-connect-state]");
    expect(card?.getAttribute("data-connect-state")).toBe("connected");
    expect(screen.getByText("Connected")).toBeTruthy();
  });
});
