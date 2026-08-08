"use client";

/**
 * Reports view (task T158) — client.
 *
 * Renders live report summaries (derived aggregates) and exports them as CSV
 * server-side (permission-gated). The CSV is produced through a server action and
 * downloaded client-side. Design unchanged from E10.
 */
import { useState, useTransition } from "react";
import { ReportCard, Button, EmptyState } from "@fixmyfeed/ui";
import type { ReportSummaryDTO } from "@/lib/server/dto";
import { exportReportsCsv } from "./actions";

export function ReportsView({ reports }: { reports: readonly ReportSummaryDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function exportCsv() {
    setError(null);
    startTransition(async () => {
      const result = await exportReportsCsv();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "fixmyfeed-reports.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6" aria-busy={pending}>
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Reports</h1>
        <Button variant="secondary" size="sm" disabled={pending} onClick={exportCsv}>
          {pending ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      {error !== null && (
        <EmptyState kind="unavailable" title="Could not export" description={error} />
      )}

      {reports.length === 0 ? (
        <EmptyState
          kind="no-data"
          title="No reports yet"
          description="Reports appear once your catalog has been scanned."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              title={r.title}
              description={r.description ?? undefined}
              stat={r.stat.value}
            />
          ))}
        </div>
      )}
    </div>
  );
}
