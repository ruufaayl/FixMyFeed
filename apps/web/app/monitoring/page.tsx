/**
 * Monitoring (task T107).
 *
 * Operational health: queue/throughput/error metrics and the recent monitoring
 * event feed. Sample data; wired to observability metrics + monitoring events in
 * a later task.
 */
import { Metric, Surface, Timeline } from "@fixmyfeed/ui";

export default function MonitoringPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Monitoring</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Surface>
          <Metric label="Queue age (p95)" value="4s" caption="within SLO" />
        </Surface>
        <Surface>
          <Metric label="Throughput" value="1,204/min" caption="scans + repairs" />
        </Surface>
        <Surface>
          <Metric label="Error rate" value="0.2%" caption="last hour" />
        </Surface>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">Recent events</h2>
        <Surface>
          <Timeline
            items={[
              {
                id: "1",
                title: "Scan completed",
                meta: "8,429 products",
                time: "2m ago",
                tone: "healthy",
              },
              { id: "2", title: "Google quota at 60%", time: "20m ago", tone: "warning" },
              {
                id: "3",
                title: "Shopify webhook received",
                meta: "products/update",
                time: "31m ago",
                tone: "info",
              },
            ]}
          />
        </Surface>
      </div>
    </div>
  );
}
