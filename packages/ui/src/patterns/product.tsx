/**
 * Product signal patterns (task T103).
 *
 * The dashboard's core objects. `HealthSignal` is FixMyFeed's central UX object —
 * a problem presented as a signal with evidence and actions, not a bare error
 * row. `IntegrationStatus` shows connected sources/destinations; `ActivityItem`
 * is one entry in the recent-activity feed. Presentational and framework-agnostic.
 */
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Badge } from "../primitives/Badge.js";
import { StatusDot } from "../components/StatusDot.js";
import { severityTone, severityLabel, type IssueSeverity } from "../components/severity.js";
import type { Tone } from "../tokens/index.js";

export interface SignalSource {
  readonly label: string;
  readonly value: string;
  /** Marks the source whose value disagrees with the others. */
  readonly mismatch?: boolean;
}

export interface HealthSignalProps {
  readonly title: string;
  readonly severity: IssueSeverity;
  readonly affectedCount: number;
  /** Optional human-readable revenue/impact exposure (e.g. "$18,420/mo"). */
  readonly exposure?: string;
  /** Per-source observed values (Shopify / Feed / Landing page / Google). */
  readonly sources?: readonly SignalSource[];
  readonly detectedLabel?: string;
  /** Confidence 0–100. */
  readonly confidence?: number;
  readonly actions?: ReactNode;
  readonly className?: string;
}

export function HealthSignal({
  title,
  severity,
  affectedCount,
  exposure,
  sources,
  detectedLabel,
  confidence,
  actions,
  className,
}: HealthSignalProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--fmf-radius-lg)] border border-[var(--fmf-border)] bg-[var(--fmf-surface)] p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-[var(--fmf-text)]">{title}</h3>
        <Badge tone={severityTone(severity)}>{severityLabel(severity)}</Badge>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[14px]">
        <span className="text-[var(--fmf-text)]">
          <span className="font-semibold tabular-nums">{affectedCount.toLocaleString()}</span>{" "}
          products affected
        </span>
        {exposure !== undefined && (
          <span className="text-[var(--fmf-text-muted)]">≈ {exposure} exposure</span>
        )}
      </div>

      {sources !== undefined && sources.length > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          {sources.map((source) => (
            <div key={source.label} className="flex flex-col">
              <dt className="text-[12px] text-[var(--fmf-text-subtle)]">{source.label}</dt>
              <dd
                className={cn(
                  "font-mono text-[13px]",
                  source.mismatch
                    ? "font-semibold text-[var(--fmf-critical)]"
                    : "text-[var(--fmf-text)]",
                )}
              >
                {source.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-[12px] text-[var(--fmf-text-subtle)]">
          {detectedLabel !== undefined && <span>Detected {detectedLabel}</span>}
          {confidence !== undefined && <span>Confidence {confidence}%</span>}
        </div>
        {actions !== undefined && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export interface IntegrationRow {
  readonly id: string;
  readonly name: string;
  readonly tone: Tone;
  readonly status: string;
}

export interface IntegrationStatusProps {
  readonly integrations: readonly IntegrationRow[];
  readonly className?: string;
}

export function IntegrationStatus({ integrations, className }: IntegrationStatusProps) {
  return (
    <ul className={cn("flex flex-col divide-y divide-[var(--fmf-border)]", className)}>
      {integrations.map((integration) => (
        <li key={integration.id} className="flex items-center justify-between gap-3 py-2">
          <span className="text-[14px] font-medium text-[var(--fmf-text)]">{integration.name}</span>
          <StatusDot tone={integration.tone} label={integration.status} />
        </li>
      ))}
    </ul>
  );
}

export interface ActivityItemProps {
  readonly icon?: ReactNode;
  readonly title: ReactNode;
  readonly meta?: ReactNode;
  readonly time?: string;
  readonly className?: string;
}

export function ActivityItem({ icon, title, meta, time, className }: ActivityItemProps) {
  return (
    <div className={cn("flex items-start gap-3 py-2", className)}>
      {icon !== undefined && (
        <span className="mt-0.5 shrink-0 text-[var(--fmf-text-subtle)]" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[14px] text-[var(--fmf-text)]">{title}</div>
        {meta !== undefined && (
          <div className="text-[12px] text-[var(--fmf-text-muted)]">{meta}</div>
        )}
      </div>
      {time !== undefined && (
        <span className="shrink-0 text-[12px] text-[var(--fmf-text-subtle)]">{time}</span>
      )}
    </div>
  );
}
