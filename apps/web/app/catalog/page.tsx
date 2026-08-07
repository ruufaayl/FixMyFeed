"use client";

/**
 * Catalog explorer (task T104).
 *
 * The data-grid screen: a sortable, multi-selectable product table whose rows
 * open a right-side inspector (source comparison) instead of navigating away.
 * Sample data for now; wired to the normalized catalog (E07) in a later task.
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

interface Product {
  readonly id: string;
  readonly title: string;
  readonly sku: string;
  readonly price: number;
  readonly availability: "in_stock" | "out_of_stock";
  readonly issues: number;
  readonly worstSeverity: "critical" | "error" | "warning" | "info" | null;
}

const PRODUCTS: Product[] = [
  {
    id: "1",
    title: "Trail Runner Shoe",
    sku: "TRS-01",
    price: 129,
    availability: "in_stock",
    issues: 2,
    worstSeverity: "critical",
  },
  {
    id: "2",
    title: "Merino Wool Sock",
    sku: "MWS-22",
    price: 18,
    availability: "in_stock",
    issues: 0,
    worstSeverity: null,
  },
  {
    id: "3",
    title: "Rain Jacket",
    sku: "RJ-90",
    price: 199,
    availability: "out_of_stock",
    issues: 1,
    worstSeverity: "warning",
  },
];

export default function CatalogPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Product | null>(null);

  const columns: Column<Product>[] = [
    { id: "title", header: "Product", cell: (p) => p.title, sortValue: (p) => p.title },
    { id: "sku", header: "SKU", cell: (p) => p.sku, mono: true, sortValue: (p) => p.sku },
    {
      id: "price",
      header: "Price",
      align: "right",
      cell: (p) => `$${p.price}`,
      sortValue: (p) => p.price,
    },
    {
      id: "availability",
      header: "Availability",
      cell: (p) => (
        <Badge tone={p.availability === "in_stock" ? "healthy" : "neutral"}>
          {p.availability === "in_stock" ? "In stock" : "Out of stock"}
        </Badge>
      ),
    },
    {
      id: "issues",
      header: "Issues",
      align: "right",
      cell: (p) => (p.worstSeverity ? <IssueBadge severity={p.worstSeverity} /> : <span>—</span>),
      sortValue: (p) => p.issues,
    },
  ];

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
        rows={PRODUCTS}
        rowId={(p) => p.id}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        onRowActivate={setActive}
        emptyState={<EmptyState kind="not-synced" title="No products synced yet" />}
      />

      <Inspector open={active !== null} onClose={() => setActive(null)} title={active?.title ?? ""}>
        {active !== null && (
          <SourceComparison
            sources={["Shopify", "Feed", "Landing page", "Google"]}
            rows={[
              {
                attribute: "Price",
                values: {
                  Shopify: `$${active.price}`,
                  Feed: `$${active.price}`,
                  "Landing page": `$${active.price + 10}`,
                  Google: `$${active.price}`,
                },
                mismatch: true,
              },
              {
                attribute: "GTIN",
                values: { Shopify: "—", Feed: "—", "Landing page": "—", Google: "Missing" },
                mismatch: true,
              },
              {
                attribute: "Availability",
                values: {
                  Shopify: active.availability,
                  Feed: active.availability,
                  "Landing page": active.availability,
                  Google: active.availability,
                },
              },
            ]}
          />
        )}
      </Inspector>
    </div>
  );
}
