/**
 * Repair patterns (task T106).
 *
 * The repair workspace: `RepairDiff` (before → after per field, GitHub-PR feel),
 * `ApprovalPanel` (impact stats + reversibility + Preview/Approve, deny-by-default),
 * `Progress` (live execution + verification), and `Timeline` (repair history).
 * Presentational and framework-agnostic; approval is never implied by the UI.
 */
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import type { Tone } from "../tokens/index.js";

export interface FieldChange {
  readonly field: string;
  readonly before: string | null;
  readonly after: string;
}

export interface RepairDiffProps {
  readonly changes: readonly FieldChange[];
  readonly className?: string;
}

export function RepairDiff({ changes, className }: RepairDiffProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {changes.map((change) => (
        <div
          key={change.field}
          className="grid grid-cols-[100px_1fr] gap-2 rounded-[var(--fmf-radius-md)] border border-[var(--fmf-border)] p-2"
        >
          <span className="text-[12px] font-medium text-[var(--fmf-text-subtle)]">
            {change.field}
          </span>
          <div className="flex flex-col gap-1 font-mono text-[12px]">
            <span className="text-[var(--fmf-critical)] line-through">{change.before ?? "—"}</span>
            <span className="text-[var(--fmf-healthy)]">{change.after}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface ApprovalStat {
  readonly label: string;
  readonly value: ReactNode;
}

export interface ApprovalPanelProps {
  readonly stats: readonly ApprovalStat[];
  readonly reversible: boolean;
  readonly preview?: ReactNode;
  readonly approve?: ReactNode;
  readonly className?: string;
}

export function ApprovalPanel({
  stats,
  reversible,
  preview,
  approve,
  className,
}: ApprovalPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[var(--fmf-radius-lg)] border border-[var(--fmf-border)] bg-[var(--fmf-surface)] p-4",
        className,
      )}
    >
      <dl className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col">
            <dt className="text-[12px] text-[var(--fmf-text-subtle)]">{stat.label}</dt>
            <dd className="text-[14px] font-medium text-[var(--fmf-text)]">{stat.value}</dd>
          </div>
        ))}
        <div className="flex flex-col">
          <dt className="text-[12px] text-[var(--fmf-text-subtle)]">Reversible</dt>
          <dd
            className={cn(
              "text-[14px] font-medium",
              reversible ? "text-[var(--fmf-healthy)]" : "text-[var(--fmf-warning)]",
            )}
          >
            {reversible ? "Yes" : "No"}
          </dd>
        </div>
      </dl>
      <div className="flex items-center justify-end gap-2">
        {preview}
        {approve}
      </div>
    </div>
  );
}

export interface ProgressProps {
  readonly value: number;
  readonly max: number;
  readonly label?: ReactNode;
  readonly tone?: Tone;
  readonly className?: string;
}

const TONE_BG: Readonly<Record<Tone, string>> = {
  healthy: "bg-[var(--fmf-healthy)]",
  info: "bg-[var(--fmf-info)]",
  warning: "bg-[var(--fmf-warning)]",
  critical: "bg-[var(--fmf-critical)]",
  neutral: "bg-[var(--fmf-neutral)]",
  brand: "bg-[var(--fmf-brand)]",
};

export function Progress({ value, max, label, tone = "brand", className }: ProgressProps) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label !== undefined && (
        <div className="flex items-center justify-between text-[13px] text-[var(--fmf-text-muted)]">
          <span>{label}</span>
          <span className="tabular-nums">
            {value} / {max}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--fmf-fog-100)]"
      >
        <div
          className={cn("h-full rounded-full transition-[width]", TONE_BG[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export interface TimelineItem {
  readonly id: string;
  readonly title: ReactNode;
  readonly meta?: ReactNode;
  readonly time?: string;
  readonly tone?: Tone;
}

export interface TimelineProps {
  readonly items: readonly TimelineItem[];
  readonly className?: string;
}

const TONE_DOT: Readonly<Record<Tone, string>> = TONE_BG;

export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className={cn("mt-1.5 h-2 w-2 rounded-full", TONE_DOT[item.tone ?? "neutral"])}
            />
            {index < items.length - 1 && <span className="w-px flex-1 bg-[var(--fmf-border)]" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] text-[var(--fmf-text)]">{item.title}</span>
              {item.time !== undefined && (
                <span className="shrink-0 text-[12px] text-[var(--fmf-text-subtle)]">
                  {item.time}
                </span>
              )}
            </div>
            {item.meta !== undefined && (
              <div className="text-[12px] text-[var(--fmf-text-muted)]">{item.meta}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
