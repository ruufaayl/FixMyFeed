"use client";

/**
 * Catalog explorer view (task T152) — client.
 *
 * Renders the live catalog through the E10 Signal Interface (DataTable + Inspector
 * + SourceComparison). Data arrives as DTOs from the server; the inspector is
 * loaded on demand via a server action. Design is unchanged from E10.
 */
import { useState } from "react";
import {
  DataTable,
  Inspector,
  SourceComparison,
  Badge,
  IssueBadge,
  EmptyState,
  Button,
  type Column,
} from "@fixmyfeed/ui";
import type { CatalogProductDTO, ProductInspectorDTO } from "@/lib/server/dto";
import { loadProductInspector } from "./actions";

const columns: Column<CatalogProductDTO>[] = [
  { id: "title", header: "Product", cell: (p) => p.title, sortValue: (p) => p.title },
  {
    id: "sku",
    header: "SKU",
    cell: (p) => p.sku ?? "—",
    mono: true,
    sortValue: (p) => p.sku ?? "",
  },
  {
    id: "price",
    header: "Price",
    align: "right",
    cell: (p) => (p.price ? `$${p.price}` : "—"),
    sortValue: (p) => Number(p.price ?? 0),
  },
  {
    id: "availability",
    header: "Availability",
    cell: (p) => (
      <Badge tone={p.availability === "in_stock" ? "healthy" : "neutral"}>
        {p.availability === "in_stock"
          ? "In stock"
          : p.availability === "out_of_stock"
            ? "Out of stock"
            : "Unknown"}
      </Badge>
    ),
  },
  {
    id: "issues",
    header: "Issues",
    align: "right",
    cell: (p) => (p.worstSeverity ? <IssueBadge severity={p.worstSeverity} /> : <span>—</span>),
    sortValue: (p) => p.issueCount,
  },
];

export function CatalogView({ products }: { products: readonly CatalogProductDTO[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inspector, setInspector] = useState<ProductInspectorDTO | null>(null);
  const [inspectorError, setInspectorError] = useState<string | null>(null);

  async function openInspector(product: CatalogProductDTO) {
    setInspector(null);
    setInspectorError(null);
    const result = await loadProductInspector(product.id);
    if (result.ok) setInspector(result.data);
    else setInspectorError(result.error.message);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Catalog</h1>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 text-[13px] text-[var(--fmf-text-muted)]">
            {selected.size} selected
            <Button size="sm" variant="secondary">
              Bulk validate
            </Button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={products}
        rowId={(p) => p.id}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        onRowActivate={(p) => {
          void openInspector(p);
        }}
        emptyState={
          <EmptyState
            kind="not-synced"
            title="No products synced yet"
            description="Connect a store and run a scan to populate your catalog."
          />
        }
      />

      <Inspector
        open={inspector !== null || inspectorError !== null}
        onClose={() => {
          setInspector(null);
          setInspectorError(null);
        }}
        title={inspector?.title ?? "Product"}
      >
        {inspectorError !== null ? (
          <EmptyState
            kind="unavailable"
            title="Could not load product"
            description={inspectorError}
          />
        ) : inspector !== null ? (
          <SourceComparison sources={inspector.sources} rows={inspector.comparison} />
        ) : null}
      </Inspector>
    </div>
  );
}
