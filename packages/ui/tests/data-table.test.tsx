/**
 * Data table + inspector + source comparison tests (task T104).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DataTable, sortRows, Inspector, SourceComparison } from "../dist/index.js";

const rows = [
  { id: "b", title: "Banana", price: 3 },
  { id: "a", title: "Apple", price: 1 },
  { id: "c", title: "Cherry", price: 2 },
];
const columns = [
  { id: "title", header: "Product", cell: (r) => r.title, sortValue: (r) => r.title },
  {
    id: "price",
    header: "Price",
    cell: (r) => `$${r.price}`,
    sortValue: (r) => r.price,
    align: "right",
  },
];

describe("sortRows", () => {
  it("sorts ascending/descending and is stable/pure", () => {
    const byPriceAsc = sortRows(rows, columns[1], "asc").map((r) => r.id);
    expect(byPriceAsc).toEqual(["a", "c", "b"]);
    const byPriceDesc = sortRows(rows, columns[1], "desc").map((r) => r.id);
    expect(byPriceDesc).toEqual(["b", "c", "a"]);
    // original untouched
    expect(rows.map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("returns a copy when the column is unsortable", () => {
    const noSort = { id: "x", header: "X", cell: () => "x" };
    expect(sortRows(rows, noSort, "asc").map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
});

describe("DataTable", () => {
  it("renders rows and sorts on header click", () => {
    render(<DataTable columns={columns} rows={rows} rowId={(r) => r.id} />);
    fireEvent.click(screen.getByRole("button", { name: /Product/ }));
    const cells = screen
      .getAllByRole("cell")
      .filter((c) => /Apple|Banana|Cherry/.test(c.textContent ?? ""));
    expect(cells[0].textContent).toBe("Apple");
    // header carries aria-sort
    expect(screen.getByRole("columnheader", { name: /Product/ }).getAttribute("aria-sort")).toBe(
      "ascending",
    );
  });

  it("supports multi-select including select-all", () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowId={(r) => r.id}
        selectable
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.click(screen.getByLabelText("Select all rows"));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["b", "a", "c"]));
  });

  it("activates a row via click and Enter", () => {
    const onRowActivate = vi.fn();
    render(
      <DataTable columns={columns} rows={rows} rowId={(r) => r.id} onRowActivate={onRowActivate} />,
    );
    const firstRow = screen.getAllByRole("row")[1];
    fireEvent.click(firstRow);
    fireEvent.keyDown(firstRow, { key: "Enter" });
    expect(onRowActivate).toHaveBeenCalledTimes(2);
  });

  it("renders the empty state when there are no rows", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowId={(r) => r.id}
        emptyState={<div>Nothing here</div>}
      />,
    );
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });
});

describe("Inspector", () => {
  it("renders when open and closes on Escape + button", () => {
    const onClose = vi.fn();
    render(
      <Inspector open onClose={onClose} title="Widget">
        <div>Body</div>
      </Inspector>,
    );
    expect(screen.getByRole("dialog", { name: "Widget" })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Close inspector"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <Inspector open={false} onClose={() => {}} title="Widget">
        <div>Body</div>
      </Inspector>,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("SourceComparison", () => {
  it("emphasizes mismatched attribute rows", () => {
    render(
      <SourceComparison
        sources={["Shopify", "Google"]}
        rows={[
          { attribute: "Price", values: { Shopify: "$49.99", Google: "$59.99" }, mismatch: true },
          { attribute: "Title", values: { Shopify: "Nike", Google: "Nike" } },
        ]}
      />,
    );
    const priceRow = screen.getByText("Price").closest("[data-mismatch]");
    expect(priceRow?.getAttribute("data-mismatch")).toBe("true");
    const titleRow = screen.getByText("Title").closest("[data-mismatch]");
    expect(titleRow?.getAttribute("data-mismatch")).toBe("false");
    expect(within(priceRow).getByText("$59.99").className).toContain("var(--fmf-critical)");
  });
});
