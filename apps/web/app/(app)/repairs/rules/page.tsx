/**
 * Repair rules workspace (task T157) — live data.
 *
 * Server component: resolves context and reads the workspace's auto-remediation
 * rules through the typed boundary, then hands the DTOs to the client
 * `RulesView`. No sample-data fallback; unauthenticated / error requests render
 * explicit states. Simulation runs on demand from the client.
 */
import Link from "next/link";
import { EmptyState, buttonVariants } from "@fixmyfeed/ui";
import { getServerContext, services } from "@/lib/server/runtime";
import { isAppError } from "@/lib/server/errors";
import type { RepairRuleDTO } from "@/lib/server/dto";
import { RulesView } from "./rules-view";

export const dynamic = "force-dynamic";

export default async function RepairRulesPage() {
  const context = await getServerContext();
  if (context === null) {
    return (
      <EmptyState
        kind="no-permission"
        title="Sign in to manage repair rules"
        action={
          <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        }
      />
    );
  }

  let rules: readonly RepairRuleDTO[];
  try {
    rules = await services().repairRules.list(context);
  } catch (error) {
    const message = isAppError(error) ? error.message : "Could not load rules";
    return <EmptyState kind="unavailable" title="Rules unavailable" description={message} />;
  }

  return <RulesView rules={rules} />;
}
