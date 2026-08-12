/**
 * Issue center (task T153) — live data.
 *
 * Server component: resolves context and reads issue groups (by root cause)
 * through the typed boundary, then hands DTOs to the client `IssuesView`. No
 * sample-data fallback; unauthenticated/error requests render explicit states.
 */
import Link from "next/link";
import { EmptyState, buttonVariants } from "@fixmyfeed/ui";
import { getServerContext, services } from "@/lib/server/runtime";
import { isAppError } from "@/lib/server/errors";
import type { IssueGroupDTO } from "@/lib/server/dto";
import { IssuesView } from "./issues-view";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  const context = await getServerContext();
  if (context === null) {
    return (
      <EmptyState
        kind="no-permission"
        title="Sign in to view issues"
        action={
          <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        }
      />
    );
  }

  let groups: readonly IssueGroupDTO[];
  try {
    groups = await services().issues.listGroups(context);
  } catch (error) {
    const message = isAppError(error) ? error.message : "Could not load issues";
    return <EmptyState kind="unavailable" title="Issues unavailable" description={message} />;
  }

  return <IssuesView groups={groups} />;
}
