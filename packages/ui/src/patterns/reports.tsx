/**
 * Report card (task T107).
 *
 * A compact report summary with a headline stat and its export/download actions.
 * Presentational; the app supplies the export controls (which enforce permissions
 * and produce the actual file server-side).
 */
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface ReportCardProps {
  readonly title: string;
  readonly description?: ReactNode;
  readonly stat?: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
}

export function ReportCard({ title, description, stat, actions, className }: ReportCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--fmf-radius-lg)] border border-[var(--fmf-border)] bg-[var(--fmf-surface)] p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[15px] font-semibold text-[var(--fmf-text)]">{title}</h3>
        {description !== undefined && (
          <p className="text-[13px] text-[var(--fmf-text-muted)]">{description}</p>
        )}
      </div>
      {stat !== undefined && (
        <div className="text-[24px] font-semibold tabular-nums text-[var(--fmf-text)]">{stat}</div>
      )}
      {actions !== undefined && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
