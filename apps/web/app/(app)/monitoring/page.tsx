/**
 * Monitoring (task T158) — live data.
 *
 * Server component: resolves context and reads the live monitoring snapshot
 * (derived metrics + merged event feed) through the typed boundary, then hands it
 * to the client `MonitoringView` (which supports async refresh). No sample-data
 * fallback; unauthenticated / error requests render explicit states.
 */
import Link from "next/link";
import { EmptyState, buttonVariants } from "@fixmyfeed/ui";
import { getServerContext, services } from "@/lib/server/runtime";
import { isAppError } from "@/lib/server/errors";
import type { MonitoringDTO } from "@/lib/server/dto";
import { MonitoringView } from "./monitoring-view";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const context = await getServerContext();
  if (context === null) {
    return (
      <EmptyState
        kind="no-permission"
        title="Sign in to view monitoring"
        action={
          <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        }
      />
    );
  }

  let monitoring: MonitoringDTO;
  try {
    monitoring = await services().monitoring.getMonitoring(context, {});
  } catch (error) {
    const message = isAppError(error) ? error.message : "Could not load monitoring";
    return <EmptyState kind="unavailable" title="Monitoring unavailable" description={message} />;
  }

  return <MonitoringView initial={monitoring} />;
}
