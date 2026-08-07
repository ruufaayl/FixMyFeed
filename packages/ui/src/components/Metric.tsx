/**
 * Metric component (task T100).
 *
 * A labeled headline number for the dashboard's key questions (products
 * affected, critical issues, repairable). Optional supporting caption; values
 * use tabular numerals for stable alignment.
 */
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface MetricProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly caption?: ReactNode;
  readonly className?: string;
}

export function Metric({ label, value, caption, className }: MetricProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[12px] font-medium uppercase tracking-wide text-[var(--fmf-text-subtle)]">
        {label}
      </span>
      <span className="text-[24px] font-semibold leading-tight tabular-nums text-[var(--fmf-text)]">
        {value}
      </span>
      {caption !== undefined && (
        <span className="text-[13px] text-[var(--fmf-text-muted)]">{caption}</span>
      )}
    </div>
  );
}
