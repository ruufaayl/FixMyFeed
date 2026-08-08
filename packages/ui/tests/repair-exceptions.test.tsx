/**
 * Repair Exceptions pattern tests (E11 T156).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RepairExceptions } from "../dist/index.js";

const items = [
  {
    itemId: "i1",
    productExternalId: "SKU-1",
    field: "title",
    status: "failed" as const,
    error: "connector rejected value",
    proposed: "Nike Trail Shoe",
    observed: null,
  },
  {
    itemId: "i2",
    productExternalId: "SKU-2",
    field: "price",
    status: "not_verified" as const,
    error: null,
    proposed: "$59.99",
    observed: "$54.99",
  },
];

describe("RepairExceptions", () => {
  it("renders each exception with its evidence and recovery actions", () => {
    const onRetry = vi.fn();
    const onRetryAll = vi.fn();
    const onRollbackAll = vi.fn();
    const { container } = render(
      <RepairExceptions
        exceptions={items}
        onRetry={onRetry}
        onRetryAll={onRetryAll}
        onRollbackAll={onRollbackAll}
      />,
    );

    expect(
      container.querySelector("[data-exception-count]")?.getAttribute("data-exception-count"),
    ).toBe("2");
    expect(screen.getByText("connector rejected value")).toBeTruthy();
    expect(screen.getByText("observed $54.99")).toBeTruthy();
    expect(screen.getByText("Write failed")).toBeTruthy();
    expect(screen.getByText("Not verified")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry all" }));
    expect(onRetryAll).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Roll back all" }));
    expect(onRollbackAll).toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[0]);
    expect(onRetry).toHaveBeenCalledWith("i1");
  });

  it("disables actions while busy", () => {
    render(<RepairExceptions exceptions={items} onRetryAll={() => {}} busy />);
    expect((screen.getByRole("button", { name: "Retry all" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("shows an empty state when there are no exceptions", () => {
    render(<RepairExceptions exceptions={[]} />);
    expect(screen.getByText("No exceptions")).toBeTruthy();
  });
});
