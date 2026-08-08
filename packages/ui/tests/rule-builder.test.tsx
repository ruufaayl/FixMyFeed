/**
 * Rule Builder pattern tests (E11 T157).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RuleBuilder } from "../dist/index.js";

describe("RuleBuilder", () => {
  it("submits an authored rule with its condition and action", () => {
    const onSubmit = vi.fn();
    render(<RuleBuilder onSubmit={onSubmit} submitLabel="Create rule" />);

    fireEvent.change(screen.getByLabelText("Rule name"), {
      target: { value: "Fix insecure links" },
    });
    fireEvent.change(screen.getByLabelText("Condition 1 value"), {
      target: { value: "insecure_link_url" },
    });
    fireEvent.change(screen.getByLabelText("Rule action"), { target: { value: "auto_apply" } });

    fireEvent.click(screen.getByRole("button", { name: "Create rule" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const value = onSubmit.mock.calls[0][0];
    expect(value).toMatchObject({
      name: "Fix insecure links",
      action: "auto_apply",
      match: "all",
      conditions: [{ field: "code", op: "eq", value: "insecure_link_url" }],
    });
  });

  it("disables submit until every condition has a value", () => {
    render(<RuleBuilder onSubmit={() => {}} submitLabel="Save rule" />);
    fireEvent.change(screen.getByLabelText("Rule name"), { target: { value: "R" } });
    expect((screen.getByRole("button", { name: "Save rule" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.change(screen.getByLabelText("Condition 1 value"), { target: { value: "x" } });
    expect((screen.getByRole("button", { name: "Save rule" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("adds and removes conditions", () => {
    render(<RuleBuilder onSubmit={() => {}} />);
    expect(screen.getByLabelText("Condition 1 value")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    expect(screen.getByLabelText("Condition 2 value")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove condition 2" }));
    expect(screen.queryByLabelText("Condition 2 value")).toBeNull();
  });

  it("pre-fills from an initial value for editing", () => {
    render(
      <RuleBuilder
        onSubmit={() => {}}
        initialValue={{
          name: "Existing",
          match: "any",
          action: "ignore",
          conditions: [{ field: "severity", op: "in", value: "critical, warning" }],
        }}
      />,
    );
    expect((screen.getByLabelText("Rule name") as HTMLInputElement).value).toBe("Existing");
    expect((screen.getByLabelText("Condition 1 value") as HTMLInputElement).value).toBe(
      "critical, warning",
    );
  });
});
