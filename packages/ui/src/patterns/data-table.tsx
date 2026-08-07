"use client";

/**
 * Data table (task T104).
 *
 * The catalog explorer's grid foundation: typed columns, click-to-sort, optional
 * multi-select, and row-density selection over accessible native table markup.
 * Sorting is a pure function (`sortRows`) so ordering is unit-testable without a
 * DOM. Rows are keyboard-activatable; the caller opens a side inspector rather
 * than navigating away.
 */
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type SortDirection = "asc" | "desc";

export interface Column<Row> {
  readonly id: string;
  readonly header: string;
  readonly cell: (row: Row) => ReactNode;
  /** Comparable value enabling sort; omit to make the column unsortable. */
  readonly sortValue?: (row: Row) => string | number;
  readonly align?: "left" | "right";
  /** Render cells in the monospace face (SKUs, GTINs, ids). */
  readonly mono?: boolean;
}

/** Pure, stable sort of rows by a column's `sortValue` in the given direction. */
export function sortRows<Row>(
  rows: readonly Row[],
  column: Column<Row> | undefined,
  direction: SortDirection,
): Row[] {
  if (!column?.sortValue) return [...rows];
  const sortValue = column.sortValue;
  const factor = direction === "asc" ? 1 : -1;
  return [...rows]
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const av = sortValue(a.row);
      const bv = sortValue(b.row);
      if (av < bv) return -1 * factor;
      if (av > bv) return 1 * factor;
      return a.index - b.index; // stable
    })
    .map((entry) => entry.row);
}

export interface DataTableProps<Row> {
  readonly columns: readonly Column<Row>[];
  readonly rows: readonly Row[];
  readonly rowId: (row: Row) => string;
  readonly selectable?: boolean;
  readonly selectedIds?: ReadonlySet<string>;
  readonly onSelectionChange?: (ids: Set<string>) => void;
  readonly onRowActivate?: (row: Row) => void;
  readonly density?: "comfortable" | "compact";
  readonly emptyState?: ReactNode;
  readonly className?: string;
}

export function DataTable<Row>({
  columns,
  rows,
  rowId,
  selectable = false,
  selectedIds,
  onSelectionChange,
  onRowActivate,
  density = "comfortable",
  emptyState,
  className,
}: DataTableProps<Row>) {
  const [sortColumnId, setSortColumnId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortColumn = columns.find((column) => column.id === sortColumnId);
  const sorted = useMemo(
    () => sortRows(rows, sortColumn, sortDirection),
    [rows, sortColumn, sortDirection],
  );

  const selected = selectedIds ?? new Set<string>();
  const allSelected = sorted.length > 0 && sorted.every((row) => selected.has(rowId(row)));

  const toggleSort = (column: Column<Row>) => {
    if (!column.sortValue) return;
    if (sortColumnId === column.id) {
      setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortColumnId(column.id);
      setSortDirection("asc");
    }
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? new Set() : new Set(sorted.map(rowId)));
  };

  const cellPad = density === "compact" ? "px-3 py-1.5" : "px-3 py-2.5";

  if (rows.length === 0 && emptyState !== undefined) {
    return <>{emptyState}</>;
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[var(--fmf-radius-lg)] border border-[var(--fmf-border)]",
        className,
      )}
    >
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[var(--fmf-border)] bg-[var(--fmf-fog-50)]">
            {selectable && (
              <th className={cn("w-10", cellPad)}>
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map((column) => {
              const isSorted = sortColumnId === column.id;
              return (
                <th
                  key={column.id}
                  aria-sort={
                    isSorted ? (sortDirection === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={cn(
                    "font-medium text-[var(--fmf-text-subtle)]",
                    column.align === "right" ? "text-right" : "text-left",
                    cellPad,
                  )}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="inline-flex items-center gap-1 outline-none hover:text-[var(--fmf-text)] focus-visible:ring-2 focus-visible:ring-[var(--fmf-focus-ring)]"
                    >
                      {column.header}
                      <span aria-hidden="true" className="text-[10px]">
                        {isSorted ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const id = rowId(row);
            const isSelected = selected.has(id);
            return (
              <tr
                key={id}
                aria-selected={selectable ? isSelected : undefined}
                tabIndex={onRowActivate ? 0 : undefined}
                onClick={onRowActivate ? () => onRowActivate(row) : undefined}
                onKeyDown={
                  onRowActivate
                    ? (event) => {
                        if (event.key === "Enter") onRowActivate(row);
                      }
                    : undefined
                }
                className={cn(
                  "border-b border-[var(--fmf-border)] last:border-0 outline-none",
                  onRowActivate && "cursor-pointer focus-visible:bg-[var(--fmf-fog-100)]",
                  isSelected ? "bg-[var(--fmf-brand-soft)]" : "hover:bg-[var(--fmf-fog-50)]",
                )}
              >
                {selectable && (
                  <td className={cellPad} onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select row ${id}`}
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      "text-[var(--fmf-text)]",
                      column.align === "right" ? "text-right" : "text-left",
                      column.mono && "font-mono text-[12px]",
                      cellPad,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
