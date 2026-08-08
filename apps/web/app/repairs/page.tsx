/**
 * Repair workspace (task T154) — live data.
 *
 * Server component: resolves context and reads the latest repair plan through the
 * typed boundary, then hands the DTO to the client `RepairsView`. No sample-data
 * fallback; unauthenticated/empty/error requests render explicit states.
 */
import Link from "next/link";
import { EmptyState, buttonVariants } from "@fixmyfeed/ui";
import { getServerContext, services } from "@/lib/server/runtime";
import { isAppError } from "@/lib/server/errors";
import type { RepairPlanDTO } from "@/lib/server/dto";
import { RepairsView } from "./repairs-view";

export const dynamic = "force-dynamic";

export default async function RepairsPage() {
  const context = await getServerContext();
  if (context === null) {
    return (
      <EmptyState
        kind="no-permission"
        title="Sign in to view repairs"
        action={
          <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        }
      />
    );
  }

  let plan: RepairPlanDTO | null;
  try {
    plan = await services().repairs.getLatestPlan(context);
  } catch (error) {
    const message = isAppError(error) ? error.message : "Could not load repairs";
    return <EmptyState kind="unavailable" title="Repairs unavailable" description={message} />;
  }

  if (plan === null) {
    return (
      <EmptyState
        kind="no-data"
        title="No repairs yet"
        description="Repair plans appear here once you propose fixes from the Issues center."
        action={
          <Link href="/issues" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Go to Issues
          </Link>
        }
      />
    );
  }

  return <RepairsView plan={plan} />;
}
