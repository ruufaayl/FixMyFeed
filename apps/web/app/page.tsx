/**
 * Overview page (task T101 scaffold).
 *
 * A minimal Overview assembled from design-system components to prove the shell
 * end-to-end. The real dashboard (health trend, highest-impact problems, recent
 * repairs, monitoring) is assembled in T103.
 */
import { HealthScore, Metric, Surface } from "@fixmyfeed/ui";

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
    </div>
  );
}
