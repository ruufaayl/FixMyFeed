/**
 * Reports & exports (task T107).
 *
 * Downloadable report summaries. Export controls are permission-gated and produce
 * the file server-side (wired in a later task); rendered here as actions.
 */
import Link from "next/link";
import { ReportCard, buttonVariants } from "@fixmyfeed/ui";

export default function ReportsPage() {
  const exportAction = (
    <Link href="/reports" className={buttonVariants({ variant: "secondary", size: "sm" })}>
      Export CSV
    </Link>
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Reports</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ReportCard
          title="Catalog health"
          description="Health score over time"
          stat="82"
          actions={exportAction}
        />
        <ReportCard
          title="Open issues"
          description="By severity and root cause"
          stat="1,248"
          actions={exportAction}
        />
        <ReportCard
          title="Repairs applied"
          description="Last 30 days"
          stat="3,912"
          actions={exportAction}
        />
      </div>
    </div>
  );
}
