/**
 * Repair Exceptions pattern (task T156) — approved new E10 pattern.
 *
 * Lists the changes from an execution that failed to write or did not verify,
 * with their evidence (error, proposed → observed) and explicit recovery actions:
 * retry a single item, retry all, or roll back the whole execution. Presentational
 * — the caller performs the recovery. Preserves partial success (successful items
 * are not shown here).
 */
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Badge } from "../primitives/Badge.js";
import { Button } from "../primitives/Button.js";
import { EmptyState } from "../components/EmptyState.js";

export type ExceptionStatus = "failed" | "not_verified";

export interface RepairExceptionItem {
  readonly itemId: string;
  readonly productExternalId: string;
  readonly field: string;
  readonly status: ExceptionStatus;
  readonly error: string | null;
  readonly proposed: string | null;
  readonly observed: string | null;
}

export interface RepairExceptionsProps {
  readonly exceptions: readonly RepairExceptionItem[];
  readonly onRetry?: (itemId: string) => void;
  readonly onRetryAll?: () => void;
  readonly onRollbackAll?: () => void;
  readonly busy?: boolean;
  readonly emptyLabel?: ReactNode;
  readonly className?: string;
}

const STATUS_LABEL: Readonly<Record<ExceptionStatus, string>> = {
  failed: "Write failed",
  not_verified: "Not verified",
};

export function RepairExceptions({
  exceptions,
  onRetry,
  onRetryAll,
  onRollbackAll,
  busy = false,
  emptyLabel,
  className,
}: RepairExceptionsProps) {
  if (exceptions.length === 0) {
    return (
      <EmptyState
        kind="no-data"
        title={typeof emptyLabel === "string" ? emptyLabel : "No exceptions"}
        description="Every applied change verified successfully."
        className={className}
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)} data-exception-count={exceptions.length}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-medium text-[var(--fmf-text)]">
          {exceptions.length} require review
        </span>
        <div className="flex gap-2">
          {onRollbackAll !== undefined && (
            <Button variant="secondary" size="sm" disabled={busy} onClick={onRollbackAll}>
              Roll back all
            </Button>
          )}
          {onRetryAll !== undefined && (
            <Button size="sm" disabled={busy} onClick={onRetryAll}>
              Retry all
            </Button>
          )}
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-[var(--fmf-border)] rounded-[var(--fmf-radius-lg)] border border-[var(--fmf-border)]">
        {exceptions.map((item) => (
          <li key={item.itemId} className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-[var(--fmf-text-muted)]">
                  {item.productExternalId}
                </span>
                <span className="text-[13px] text-[var(--fmf-text)]">{item.field}</span>
                <Badge tone="critical">{STATUS_LABEL[item.status]}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[12px]">
                <span className="text-[var(--fmf-brand)]">→ {item.proposed ?? "—"}</span>
                {item.observed !== null && (
                  <span className="text-[var(--fmf-text-muted)]">observed {item.observed}</span>
                )}
              </div>
              {item.error !== null && (
                <div className="mt-1 text-[12px] text-[var(--fmf-critical)]">{item.error}</div>
              )}
            </div>
            {onRetry !== undefined && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => onRetry(item.itemId)}
              >
                Retry
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
