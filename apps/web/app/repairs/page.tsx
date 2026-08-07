/**
 * Repair workspace + history (task T106).
 *
 * The repair hero experience: a change-set diff, a deny-by-default approval panel
 * (impact, risk, reversibility, Preview → Approve), live execution progress, and
 * the repair history timeline. Sample data; wired to the repair engine (E09) in a
 * later task. Server component — actions are links; approval submits in a later task.
 */
import Link from "next/link";
import {
  RepairDiff,
  ApprovalPanel,
  Progress,
  Timeline,
  Surface,
  Badge,
  buttonVariants,
} from "@fixmyfeed/ui";

export default function RepairsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">
          Repair — Price mismatch
        </h1>
        <Badge tone="brand">Pending approval</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">Proposed changes</h2>
          <Surface padding="sm">
            <RepairDiff
              changes={[
                { field: "price", before: "$49.99", after: "$59.99" },
                { field: "availability", before: "out_of_stock", after: "in_stock" },
              ]}
            />
          </Surface>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">Review</h2>
          <ApprovalPanel
            stats={[
              { label: "Affected products", value: "312" },
              { label: "Destination", value: "Shopify" },
              { label: "Confidence", value: "High" },
              { label: "Risk", value: "Low" },
            ]}
            reversible
            preview={
              <Link
                href="/catalog"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Preview 312 changes
              </Link>
            }
            approve={<span className={buttonVariants({ size: "sm" })}>Approve repair</span>}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">Execution</h2>
        <Surface>
          <Progress value={87} max={312} label="Applying repair" />
          <p className="mt-2 text-[12px] text-[var(--fmf-text-muted)]">
            Completed 87 · Queued 225 · Failed 0 — verification begins automatically afterward.
          </p>
        </Surface>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">History</h2>
        <Surface>
          <Timeline
            items={[
              {
                id: "1",
                title: "Repair proposed",
                meta: "312 products",
                time: "10m ago",
                tone: "brand",
              },
              { id: "2", title: "Approved by A. Rivera", time: "6m ago", tone: "info" },
              {
                id: "3",
                title: "Applying changes",
                meta: "87 / 312",
                time: "now",
                tone: "warning",
              },
            ]}
          />
        </Surface>
      </div>
    </div>
  );
}
