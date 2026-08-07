/**
 * EmptyState component (task T100).
 *
 * Teaching empty states that distinguish *why* there is no data and offer the
 * single safest next step. The `kind` communicates the reason (no data, not yet
 * synced, filtered to zero, insufficient permission, unavailable integration).
 */
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export const EMPTY_STATE_KINDS = [
  "no-data",
  "not-synced",
  "filtered",
  "no-permission",
  "unavailable",
] as const;
export type EmptyStateKind = (typeof EMPTY_STATE_KINDS)[number];

export interface EmptyStateProps {
  readonly kind?: EmptyStateKind;
  readonly title: string;
  readonly description?: ReactNode;
  /** The single safest next action (e.g. a Button). */
  readonly action?: ReactNode;
  readonly icon?: ReactNode;
  readonly className?: string;
}

export function EmptyState({
  kind = "no-data",
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      data-empty-kind={kind}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--fmf-radius-lg)] border border-dashed border-[var(--fmf-border)] bg-[var(--fmf-surface)] px-6 py-12 text-center",
        className,
      )}
    >
      {icon !== undefined && <div className="text-[var(--fmf-text-subtle)]">{icon}</div>}
      <h3 className="text-[16px] font-semibold text-[var(--fmf-text)]">{title}</h3>
      {description !== undefined && (
        <p className="max-w-md text-[14px] text-[var(--fmf-text-muted)]">{description}</p>
      )}
      {action !== undefined && <div className="mt-1">{action}</div>}
    </div>
  );
}
