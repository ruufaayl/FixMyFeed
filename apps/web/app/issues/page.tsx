"use client";

/**
 * Issue center (task T105).
 *
 * Issues grouped by root cause rather than an endless error list: each group is
 * a HealthSignal (count, exposure, confidence) with filters and saved views.
 * Opening a group shows its evidence panel. Sample data; wired to the diagnostics
 * engine (E08 issues) in a later task.
 */
import { useState } from "react";
import {
  FilterBar,
  EvidencePanel,
  HealthSignal,
  Inspector,
  Button,
  type IssueSeverity,
} from "@fixmyfeed/ui";

interface IssueGroup {
  readonly id: string;
  readonly title: string;
  readonly severity: IssueSeverity;
  readonly affected: number;
  readonly exposure: string;
  readonly confidence: number;
}

const GROUPS: IssueGroup[] = [
  {
    id: "price",
    title: "Price mismatch",
    severity: "critical",
    affected: 312,
    exposure: "$18,420/mo",
    confidence: 99,
  },
  {
    id: "url",
    title: "Broken product URLs",
    severity: "error",
    affected: 42,
    exposure: "$7,200/mo",
    confidence: 100,
  },
  {
    id: "gtin",
    title: "Missing GTIN",
    severity: "warning",
    affected: 918,
    exposure: "$11,800/mo",
    confidence: 92,
  },
];

export default function IssuesPage() {
  const [severity, setSeverity] = useState("all");
  const [view, setView] = useState("all");
  const [active, setActive] = useState<IssueGroup | null>(null);

  const visible = GROUPS.filter((g) => severity === "all" || g.severity === severity);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Issues</h1>

      <FilterBar
        savedViews={[
          { id: "all", label: "All", active: view === "all", onSelect: () => setView("all") },
          {
            id: "repairable",
            label: "Repairable now",
            active: view === "repairable",
            onSelect: () => setView("repairable"),
          },
          {
            id: "google",
            label: "Google disapprovals",
            active: view === "google",
            onSelect: () => setView("google"),
          },
        ]}
        filters={[
          {
            id: "severity",
            label: "Severity",
            value: severity,
            onChange: setSeverity,
            options: [
              { value: "all", label: "All" },
              { value: "critical", label: "Critical" },
              { value: "error", label: "Error" },
              { value: "warning", label: "Warning" },
            ],
          },
        ]}
      />

      <div className="flex flex-col gap-3">
        {visible.map((group) => (
          <HealthSignal
            key={group.id}
            title={group.title}
            severity={group.severity}
            affectedCount={group.affected}
            exposure={group.exposure}
            confidence={group.confidence}
            actions={
              <Button size="sm" variant="secondary" onClick={() => setActive(group)}>
                View evidence
              </Button>
            }
          />
        ))}
      </div>

      <Inspector open={active !== null} onClose={() => setActive(null)} title={active?.title ?? ""}>
        {active !== null && (
          <EvidencePanel
            evidence={[
              { source: "Shopify Admin", value: "$49.99", observedAt: "14:21:08" },
              { source: "Submitted feed", value: "$49.99", observedAt: "14:22:11" },
              { source: "Landing page", value: "$59.99", observedAt: "14:23:02", mismatch: true },
              { source: "Google Merchant", value: "$49.99", observedAt: "14:27:40" },
            ]}
            explanation="The visible price on the product page differs from the price submitted to Google."
            whyItMatters="Google expects submitted prices to match the shopper-visible landing page price."
            recommendedRepair={
              <Button size="sm">Preview repair for {active.affected} products</Button>
            }
          />
        )}
      </Inspector>
    </div>
  );
}
