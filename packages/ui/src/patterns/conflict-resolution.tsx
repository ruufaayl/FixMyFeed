/**
 * Conflict Resolution pattern (task T154) — approved new E10 pattern.
 *
 * Surfaces a repair change that conflicts with the live catalog (the product
 * changed under the plan, or a concurrent edit) and offers an explicit choice —
 * keep the proposed value, take the live value, or skip — so a repair never
 * silently clobbers a merchant edit. Presentational; the caller performs the
 * chosen resolution.
 */
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Badge } from "../primitives/Badge.js";
import { Button } from "../primitives/Button.js";

export const CONFLICT_REASONS = ["concurrent_edit", "product_changed", "missing_product"] as const;
export type ConflictReason = (typeof CONFLICT_REASONS)[number];

const REASON_LABEL: Readonly<Record<ConflictReason, string>> = {
  concurrent_edit: "Changed since planned",
  product_changed: "Product changed",
  missing_product: "Product missing",
};

export interface ConflictResolutionProps {
  readonly field: string;
  readonly reason: ConflictReason;
  /** The value the plan proposed to write. */
  readonly proposedValue: string | null;
  /** The current live value in the catalog. */
  readonly liveValue: string | null;
  readonly onKeepProposed?: () => void;
  readonly onUseLive?: () => void;
  readonly onSkip?: () => void;
  readonly hint?: ReactNode;
  readonly className?: string;
}

function ValueBlock({ label, value, tone }: { label: string; value: string | null; tone: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[12px] text-[var(--fmf-text-subtle)]">{label}</span>
      <span className={cn("font-mono text-[13px]", tone)}>{value ?? "—"}</span>
    </div>
  );
}

export function ConflictResolution({
  field,
  reason,
  proposedValue,
  liveValue,
  onKeepProposed,
  onUseLive,
  onSkip,
  hint,
  className,
}: ConflictResolutionProps) {
  const missing = reason === "missing_product";
  return (
    <div
      data-conflict-field={field}
      data-conflict-reason={reason}
      className={cn(
        "flex flex-col gap-3 rounded-[var(--fmf-radius-lg)] border border-[var(--fmf-border)] bg-[var(--fmf-surface)] p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-[var(--fmf-text)]">{field}</span>
        <Badge tone="warning">{REASON_LABEL[reason]}</Badge>
      </div>
      {hint !== undefined && <p className="text-[12px] text-[var(--fmf-text-muted)]">{hint}</p>}
      <div className="grid grid-cols-2 gap-4">
        <ValueBlock label="Proposed" value={proposedValue} tone="text-[var(--fmf-brand)]" />
        <ValueBlock label="Live" value={liveValue} tone="text-[var(--fmf-text)]" />
      </div>
      <div className="flex items-center justify-end gap-2">
        {onSkip !== undefined && (
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip
          </Button>
        )}
        {onUseLive !== undefined && (
          <Button variant="secondary" size="sm" onClick={onUseLive} disabled={missing}>
            Keep live
          </Button>
        )}
        {onKeepProposed !== undefined && (
          <Button size="sm" onClick={onKeepProposed} disabled={missing}>
            Apply proposed
          </Button>
        )}
      </div>
    </div>
  );
}
