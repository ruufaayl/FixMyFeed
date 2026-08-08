/**
 * Assisted Change + Conflict Resolution pattern tests (E11 T154).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssistedChange, ConflictResolution } from "../dist/index.js";

describe("AssistedChange", () => {
  it("pre-fills the suggestion and submits the edited value", () => {
    const onSubmit = vi.fn();
    render(
      <AssistedChange
        field="title"
        currentValue={null}
        suggestedValue="Nike Shoe"
        onSubmit={onSubmit}
      />,
    );
    const input = screen.getByLabelText("New value for title") as HTMLInputElement;
    expect(input.value).toBe("Nike Shoe");
    fireEvent.change(input, { target: { value: "Nike Trail Shoe" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply value" }));
    expect(onSubmit).toHaveBeenCalledWith("Nike Trail Shoe");
  });

  it("disables apply when the value is empty and supports skip", () => {
    const onSkip = vi.fn();
    render(
      <AssistedChange
        field="description"
        currentValue={null}
        onSubmit={() => {}}
        onSkip={onSkip}
      />,
    );
    expect(
      (screen.getByRole("button", { name: "Apply value" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onSkip).toHaveBeenCalled();
  });
});

describe("ConflictResolution", () => {
  it("shows proposed vs live and offers explicit choices", () => {
    const onKeepProposed = vi.fn();
    const onUseLive = vi.fn();
    render(
      <ConflictResolution
        field="price"
        reason="concurrent_edit"
        proposedValue="$59.99"
        liveValue="$54.99"
        onKeepProposed={onKeepProposed}
        onUseLive={onUseLive}
      />,
    );
    expect(screen.getByText("$59.99")).toBeTruthy();
    expect(screen.getByText("$54.99")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Apply proposed" }));
    expect(onKeepProposed).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep live" }));
    expect(onUseLive).toHaveBeenCalled();
  });

  it("disables resolution actions for a missing product", () => {
    render(
      <ConflictResolution
        field="title"
        reason="missing_product"
        proposedValue="X"
        liveValue={null}
        onKeepProposed={() => {}}
        onUseLive={() => {}}
      />,
    );
    const card = screen.getByText("title").closest("[data-conflict-reason]");
    expect(card?.getAttribute("data-conflict-reason")).toBe("missing_product");
    expect(
      (screen.getByRole("button", { name: "Apply proposed" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
