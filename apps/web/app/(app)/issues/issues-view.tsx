"use client";

/**
 * Issue center view (task T153) — client.
 *
 * Renders live issue groups (by root cause) through the E10 Signal Interface:
 * FilterBar + saved views + HealthSignal per group, with an Inspector + evidence
 * panel loaded on demand via a server action. Design unchanged from E10; the small
 * group set is filtered client-side.
 */
import { useMemo, useState } from "react";
import {
  FilterBar,
  EvidencePanel,
  HealthSignal,
  Inspector,
  Button,
  EmptyState,
} from "@fixmyfeed/ui";
import type { EvidenceDTO, IssueGroupDTO } from "@/lib/server/dto";
import { loadEvidence } from "./actions";

export function IssuesView({ groups }: { groups: readonly IssueGroupDTO[] }) {
  const [severity, setSeverity] = useState("all");
  const [view, setView] = useState("all");
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceDTO | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      groups.filter(
        (g) =>
          (severity === "all" || g.severity === severity) &&
          (view !== "repairable" || g.repairable),
      ),
    [groups, severity, view],
  );

  async function openEvidence(group: IssueGroupDTO) {
    setActiveTitle(group.title);
    setEvidence(null);
    setEvidenceError(null);
    const result = await loadEvidence(group.code);
    if (result.ok) setEvidence(result.data);
    else setEvidenceError(result.error.message);
  }

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
        {visible.length === 0 ? (
          <EmptyState
            kind="filtered"
            title="No matching issues"
            description="Your catalog has no issues in this view."
          />
        ) : (
          visible.map((group) => (
            <HealthSignal
              key={group.id}
              title={group.title}
              severity={group.severity}
              affectedCount={group.affectedCount.value}
              confidence={group.confidence ?? undefined}
              actions={
                <Button size="sm" variant="secondary" onClick={() => void openEvidence(group)}>
                  View evidence
                </Button>
              }
            />
          ))
        )}
      </div>

      <Inspector
        open={evidence !== null || evidenceError !== null}
        onClose={() => {
          setEvidence(null);
          setEvidenceError(null);
        }}
        title={activeTitle ?? "Evidence"}
      >
        {evidenceError !== null ? (
          <EmptyState
            kind="unavailable"
            title="Could not load evidence"
            description={evidenceError}
          />
        ) : evidence !== null ? (
          <EvidencePanel
            evidence={evidence.entries}
            explanation={evidence.explanation}
            whyItMatters={evidence.whyItMatters}
            recommendedRepair={evidence.recommendedRepair ?? undefined}
          />
        ) : null}
      </Inspector>
    </div>
  );
}
