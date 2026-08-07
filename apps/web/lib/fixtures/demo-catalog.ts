/**
 * Explicit demo catalog fixture (task T152).
 *
 * Sample catalog rows for demos/tests only — never a production fallback. The
 * live `/catalog` screen renders real data (or an empty state) via the boundary.
 */
import type { CatalogProductDTO } from "../server/dto";

export const DEMO_CATALOG_PRODUCTS: readonly CatalogProductDTO[] = [
  {
    id: "1",
    title: "Trail Runner Shoe",
    sku: "TRS-01",
    price: "129.00",
    availability: "in_stock",
    issueCount: 2,
    worstSeverity: "critical",
  },
  {
    id: "2",
    title: "Merino Wool Sock",
    sku: "MWS-22",
    price: "18.00",
    availability: "in_stock",
    issueCount: 0,
    worstSeverity: null,
  },
  {
    id: "3",
    title: "Rain Jacket",
    sku: "RJ-90",
    price: "199.00",
    availability: "out_of_stock",
    issueCount: 1,
    worstSeverity: "warning",
  },
];
