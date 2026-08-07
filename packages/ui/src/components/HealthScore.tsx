/**
 * HealthScore component (task T100).
 *
 * The catalog's headline 0–100 health score. The tone is derived from the score
 * (healthy ≥ 80, warning ≥ 50, else critical) and paired with a text label, so
 * the score's meaning is not conveyed by color alone.
 */
import { cn } from "../lib/cn.js";
import type { Tone } from "../tokens/index.js";

export function healthScoreTone(score: number): Tone {
  if (score >= 80) return "healthy";
  if (score >= 50) return "warning";
  return "critical";
}

export function healthScoreLabel(score: number): string {
  if (score >= 80) return "Healthy";
  if (score >= 50) return "Needs attention";
  return "Critical";
}

const TONE_TEXT: Readonly<Record<Tone, string>> = {
  healthy: "text-[var(--fmf-healthy)]",
  info: "text-[var(--fmf-info)]",
  warning: "text-[var(--fmf-warning)]",
  critical: "text-[var(--fmf-critical)]",
  neutral: "text-[var(--fmf-neutral)]",
  brand: "text-[var(--fmf-brand)]",
};

export interface HealthScoreProps {
  /** 0–100; clamped for display. */
  readonly score: number;
  /** Optional week-over-week delta shown as ±n. */
  readonly delta?: number;
  readonly className?: string;
}

export function HealthScore({ score, delta, className }: HealthScoreProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tone = healthScoreTone(clamped);
  const label = healthScoreLabel(clamped);
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-baseline gap-2">
        <span
          className={cn("text-[32px] font-semibold leading-none tabular-nums", TONE_TEXT[tone])}
          aria-label={`Catalog health ${clamped} out of 100`}
        >
          {clamped}
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              "text-[13px] font-medium tabular-nums",
              delta >= 0 ? "text-[var(--fmf-healthy)]" : "text-[var(--fmf-critical)]",
            )}
          >
            {delta >= 0 ? `+${delta}` : `${delta}`}
          </span>
        )}
      </div>
      <span className="text-[13px] text-[var(--fmf-text-muted)]">{label}</span>
    </div>
  );
}
