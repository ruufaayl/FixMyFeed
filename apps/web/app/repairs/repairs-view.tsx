"use client";

/**
 * Repair workspace view (task T154) — client.
 *
 * Renders a live repair plan through the E10 Signal Interface: ready changes as a
 * RepairDiff, `needs_input` as AssistedChange, `conflict` as ConflictResolution
 * (T154), plus approve/reject and asynchronous execute actions with live
 * execution progress (T155). Approval and execution are separate explicit actions;
 * all mutations go through server actions. Terminology distinguishes "applied"
 * (T155) from "verified" (T156). Design unchanged from E10.
 */
import { useState, useTransition } from "react";
import {
  RepairDiff,
  ApprovalPanel,
  Progress,
  Surface,
  Badge,
  Button,
  AssistedChange,
  ConflictResolution,
  EmptyState,
  type FieldChange,
} from "@fixmyfeed/ui";
import type { RepairPlanDTO } from "@/lib/server/dto";
import { resolveRepairChange, decidePlan, requestExecution } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  executing: "Executing",
  completed: "Completed",
  partially_completed: "Partially completed",
  failed: "Failed",
  rolled_back: "Rolled back",
};

export function RepairsView({ plan }: { plan: RepairPlanDTO }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Stable idempotency key per page load — duplicate submits reuse it, so a
  // double-click/network retry never creates a second execution.
  const [idempotencyKey] = useState(() => globalThis.crypto.randomUUID());

  function resolve(productExternalId: string, field: string, value: string) {
    setError(null);
    startTransition(async () => {
      const result = await resolveRepairChange(plan.id, productExternalId, field, value);
      if (!result.ok) setError(result.error.message);
    });
  }

  function decide(decision: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      const result = await decidePlan(plan.id, decision);
      if (!result.ok) setError(result.error.message);
    });
  }

  function execute() {
    setError(null);
    startTransition(async () => {
      const result = await requestExecution(plan.id, idempotencyKey);
      if (!result.ok) setError(result.error.message);
    });
  }

  const ready = plan.preview.filter((e) => e.status === "ready");
  const needsInput = plan.preview.filter((e) => e.status === "needs_input");
  const conflicts = plan.preview.filter((e) => e.status === "conflict");
  const canApprove = plan.status === "draft" || plan.status === "pending_approval";
  const canExecute =
    plan.status === "approved" && needsInput.length === 0 && conflicts.length === 0;
  const execution = plan.execution;

  const diffChanges: FieldChange[] = ready.map((e) => ({
    field: e.change.field,
    before: e.change.currentValue,
    after: e.change.proposedValue ?? "",
  }));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6" aria-busy={pending}>
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Repair</h1>
        <Badge tone="brand">{STATUS_LABEL[plan.status] ?? plan.status}</Badge>
      </div>

      {error !== null && (
        <EmptyState kind="unavailable" title="Could not apply change" description={error} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">Proposed changes</h2>
          <Surface padding="sm">
            {diffChanges.length === 0 ? (
              <EmptyState kind="no-data" title="No ready changes" />
            ) : (
              <RepairDiff changes={diffChanges} />
            )}
          </Surface>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">Review</h2>
          <ApprovalPanel
            stats={[
              { label: "Ready", value: ready.length },
              { label: "Needs input", value: needsInput.length },
              { label: "Conflicts", value: conflicts.length },
              { label: "Approvals", value: `${plan.approvals.length} / ${plan.requiredApprovals}` },
            ]}
            reversible
            preview={
              canApprove ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() => decide("reject")}
                >
                  Reject
                </Button>
              ) : undefined
            }
            approve={
              canApprove ? (
                <Button size="sm" disabled={pending} onClick={() => decide("approve")}>
                  Approve
                </Button>
              ) : plan.status === "approved" ? (
                <Button size="sm" disabled={pending || !canExecute} onClick={execute}>
                  Execute repair
                </Button>
              ) : undefined
            }
          />
        </div>
      </div>

      {execution !== null && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">Execution</h2>
          <Surface>
            <Progress
              value={execution.succeeded + execution.failed}
              max={execution.total}
              label={`Applying repair — ${execution.status.replace("_", " ")}`}
              tone={execution.status === "failed" ? "critical" : "brand"}
            />
            <p className="mt-2 text-[12px] text-[var(--fmf-text-muted)]">
              {execution.succeeded} changes applied · {execution.failed} failed · {execution.total}{" "}
              total. Verification runs separately.
            </p>
          </Surface>
        </div>
      )}

      {needsInput.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">Assisted changes</h2>
          <div className="flex flex-col gap-3">
            {needsInput.map((e) => (
              <AssistedChange
                key={`${e.change.productExternalId}:${e.change.field}`}
                field={e.change.field}
                currentValue={e.change.currentValue}
                suggestedValue={e.change.proposedValue}
                hint={`For product ${e.change.productExternalId}`}
                onSubmit={(value) => resolve(e.change.productExternalId, e.change.field, value)}
              />
            ))}
          </div>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">Conflicts</h2>
          <div className="flex flex-col gap-3">
            {conflicts.map((e) => (
              <ConflictResolution
                key={`${e.change.productExternalId}:${e.change.field}`}
                field={e.change.field}
                reason={e.conflictReason ?? "concurrent_edit"}
                proposedValue={e.change.proposedValue}
                liveValue={e.liveValue}
                hint={`Product ${e.change.productExternalId}`}
                onKeepProposed={() =>
                  resolve(e.change.productExternalId, e.change.field, e.change.proposedValue ?? "")
                }
                onUseLive={() =>
                  resolve(e.change.productExternalId, e.change.field, e.liveValue ?? "")
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
