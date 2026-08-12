/**
 * Dashboard / Overview (task T152) — live data.
 *
 * Server component: resolves the request's application context and reads the
 * Overview DTO through the typed boundary, then renders the E10 Signal Interface.
 * No sample-data fallback — an unauthenticated request or an error renders an
 * explicit state. Dynamic (per-request), never statically prerendered.
 */
import Link from "next/link";
import {
  HealthScore,
  Metric,
  Surface,
  IntegrationStatus,
  HealthSignal,
  EmptyState,
  buttonVariants,
} from "@fixmyfeed/ui";
import { getServerContext, services } from "@/lib/server/runtime";
import { isAppError } from "@/lib/server/errors";
import type { OverviewDTO } from "@/lib/server/dto";

export const dynamic = "force-dynamic";

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export default async function OverviewPage() {
  const context = await getServerContext();
  if (context === null) {
    return (
      <EmptyState
        kind="no-permission"
        title="Sign in to view your catalog"
        description="Connect your store to see catalog health across your sources and destinations."
        action={
          <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        }
      />
    );
  }

  let overview: OverviewDTO;
  try {
    overview = await services().overview.getOverview(context);
  } catch (error) {
    const message = isAppError(error) ? error.message : "Could not load overview";
    return <EmptyState kind="unavailable" title="Overview unavailable" description={message} />;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Overview</h1>
        <p className="text-[14px] text-[var(--fmf-text-muted)]">
          Catalog health across your connected sources and destinations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Surface>
          <span className="mb-2 block text-[12px] font-medium uppercase tracking-wide text-[var(--fmf-text-subtle)]">
            Catalog health
          </span>
          <HealthScore score={overview.healthScore.value} />
        </Surface>
        <Surface>
          <Metric
            label="Products affected"
            value={overview.productsAffected.value.toLocaleString()}
          />
        </Surface>
        <Surface>
          <Metric label="Critical issues" value={overview.criticalIssues.value.toLocaleString()} />
        </Surface>
        <Surface>
          <Metric label="Repairable now" value={overview.repairable.value.toLocaleString()} />
        </Surface>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <h2 className="text-[18px] font-semibold text-[var(--fmf-text)]">
            Highest-impact problems
          </h2>
          {overview.topSignals.length === 0 ? (
            <EmptyState
              kind="no-data"
              title="Your catalog is healthy"
              description="No high-impact issues were found in the latest scan."
            />
          ) : (
            overview.topSignals.map((signal) => (
              <HealthSignal
                key={signal.id}
                title={signal.title}
                severity={signal.severity}
                affectedCount={signal.affectedCount.value}
                exposure={signal.exposure ? `${formatMoney(signal.exposure.value)}/mo` : undefined}
                confidence={signal.confidence ?? undefined}
                actions={
                  <Link
                    href="/issues"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    View affected products
                  </Link>
                }
              />
            ))
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-[18px] font-semibold text-[var(--fmf-text)]">Integrations</h2>
          <Surface>
            {overview.integrations.length === 0 ? (
              <EmptyState
                kind="unavailable"
                title="No integrations connected"
                description="Connect a store to start diagnosing your feed."
              />
            ) : (
              <IntegrationStatus integrations={overview.integrations} />
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}
