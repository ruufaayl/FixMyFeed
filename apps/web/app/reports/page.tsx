/**
 * Reports & exports (task T158) — live data.
 *
 * Server component: resolves context and reads live report summaries (derived
 * aggregates) through the typed boundary, then hands them to the client
 * `ReportsView` (which handles the permission-gated CSV export). No sample-data
 * fallback; unauthenticated / error requests render explicit states.
 */
import Link from "next/link";
import { EmptyState, buttonVariants } from "@fixmyfeed/ui";
import { getServerContext, services } from "@/lib/server/runtime";
import { isAppError } from "@/lib/server/errors";
import type { ReportSummaryDTO } from "@/lib/server/dto";
import { ReportsView } from "./reports-view";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const context = await getServerContext();
  if (context === null) {
    return (
      <EmptyState
        kind="no-permission"
        title="Sign in to view reports"
        action={
          <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        }
      />
    );
  }

  let reports: readonly ReportSummaryDTO[];
  try {
    reports = await services().reports.listReports(context);
  } catch (error) {
    const message = isAppError(error) ? error.message : "Could not load reports";
    return <EmptyState kind="unavailable" title="Reports unavailable" description={message} />;
  }

  return <ReportsView reports={reports} />;
}
