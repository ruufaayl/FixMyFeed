/**
 * Dashboard / Overview (task T103).
 *
 * Answers the five headline questions at a glance — is my catalog healthy, how
 * many products are affected, what's urgent, what's repairable, is everything
 * connected — then the highest-impact signals and recent activity. Sample data
 * for now; wired to the diagnostics engine in a later task.
 */
import Link from "next/link";
import {
  HealthScore,
  Metric,
  Surface,
  IntegrationStatus,
  HealthSignal,
  ActivityItem,
  buttonVariants,
} from "@fixmyfeed/ui";

export default function OverviewPage() {
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
          <HealthScore score={82} delta={3} />
        </Surface>
        <Surface>
          <Metric label="Products affected" value="1,248" caption="need attention" />
        </Surface>
        <Surface>
          <Metric label="Critical issues" value={37} caption="across all sources" />
        </Surface>
        <Surface>
          <Metric label="Repairable now" value={624} caption="with safe writeback" />
        </Surface>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <h2 className="text-[18px] font-semibold text-[var(--fmf-text)]">
            Highest-impact problems
          </h2>
          <HealthSignal
            title="Price mismatch"
            severity="critical"
            affectedCount={312}
            exposure="$18,420/mo"
            confidence={99}
            detectedLabel="8 minutes ago"
            sources={[
              { label: "Shopify", value: "$49.99" },
              { label: "Feed", value: "$49.99" },
              { label: "Landing page", value: "$59.99", mismatch: true },
              { label: "Google", value: "$49.99" },
            ]}
            actions={
              <>
                <Link
                  href="/issues"
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  View affected products
                </Link>
                <Link href="/repairs" className={buttonVariants({ size: "sm" })}>
                  Preview repair
                </Link>
              </>
            }
          />
          <HealthSignal
            title="Broken product URLs"
            severity="error"
            affectedCount={42}
            exposure="$7,200/mo"
            confidence={100}
            detectedLabel="1 hour ago"
            actions={
              <Link href="/issues" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                View affected products
              </Link>
            }
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-[18px] font-semibold text-[var(--fmf-text)]">Integrations</h2>
            <Surface>
              <IntegrationStatus
                integrations={[
                  { id: "shopify", name: "Shopify", tone: "healthy", status: "Healthy" },
                  { id: "google", name: "Google Merchant", tone: "healthy", status: "Healthy" },
                  { id: "sync", name: "Feed sync", tone: "info", status: "2 min ago" },
                  { id: "monitoring", name: "Monitoring", tone: "healthy", status: "Active" },
                ]}
              />
            </Surface>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-[18px] font-semibold text-[var(--fmf-text)]">Recent repairs</h2>
            <Surface>
              <div className="flex flex-col divide-y divide-[var(--fmf-border)]">
                <ActivityItem
                  title="Upgraded 128 image URLs to HTTPS"
                  meta="Verified"
                  time="12m ago"
                />
                <ActivityItem title="Trimmed 44 over-length titles" meta="Approved" time="3h ago" />
                <ActivityItem title="Full scan completed" meta="8,429 products" time="Today" />
              </div>
            </Surface>
          </div>
        </div>
      </div>
    </div>
  );
}
