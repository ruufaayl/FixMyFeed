/**
 * Issue-center patterns (task T105).
 *
 * `FilterBar` renders labeled filter selects plus saved-view chips for the issue
 * list. `EvidencePanel` is the "why did FixMyFeed flag this?" surface — per-source
 * observed values with timestamps, a plain-language explanation, why it matters,
 * and the recommended repair. Evidence-based, presentational, framework-agnostic.
 */
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

export interface FilterControl {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly FilterOption[];
  readonly onChange: (value: string) => void;
}

export interface SavedView {
  readonly id: string;
  readonly label: string;
  readonly active?: boolean;
  readonly onSelect: () => void;
}

export interface FilterBarProps {
  readonly filters: readonly FilterControl[];
  readonly savedViews?: readonly SavedView[];
  readonly className?: string;
}

export function FilterBar({ filters, savedViews, className }: FilterBarProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {savedViews !== undefined && savedViews.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Saved views">
          {savedViews.map((view) => (
            <button
              key={view.id}
              type="button"
              aria-pressed={view.active ?? false}
              onClick={view.onSelect}
              className={cn(
                "rounded-[var(--fmf-radius-sm)] px-2.5 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--fmf-focus-ring)]",
                view.active
                  ? "bg-[var(--fmf-brand-soft)] font-medium text-[var(--fmf-brand)]"
                  : "text-[var(--fmf-text-muted)] hover:bg-[var(--fmf-fog-100)]",
              )}
            >
              {view.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <label key={filter.id} className="flex items-center gap-1.5 text-[13px]">
            <span className="text-[var(--fmf-text-subtle)]">{filter.label}</span>
            <select
              value={filter.value}
              onChange={(event) => filter.onChange(event.target.value)}
              className="h-8 rounded-[var(--fmf-radius-md)] border border-[var(--fmf-border)] bg-[var(--fmf-surface)] px-2 text-[13px] text-[var(--fmf-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--fmf-focus-ring)]"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

export interface EvidenceEntry {
  readonly source: string;
  readonly value: string;
  readonly observedAt: string;
  readonly mismatch?: boolean;
}

export interface EvidencePanelProps {
  readonly evidence: readonly EvidenceEntry[];
  readonly explanation?: ReactNode;
  readonly whyItMatters?: ReactNode;
  readonly recommendedRepair?: ReactNode;
  readonly className?: string;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-[12px] font-medium uppercase tracking-wide text-[var(--fmf-text-subtle)]">
        {title}
      </h4>
      <div className="text-[14px] text-[var(--fmf-text)]">{children}</div>
    </div>
  );
}

export function EvidencePanel({
  evidence,
  explanation,
  whyItMatters,
  recommendedRepair,
  className,
}: EvidencePanelProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Section title="Evidence">
        <ul className="flex flex-col gap-2">
          {evidence.map((entry) => (
            <li key={entry.source} className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-[var(--fmf-text-muted)]">{entry.source}</span>
              <span
                className={cn(
                  "font-mono text-[13px]",
                  entry.mismatch
                    ? "font-semibold text-[var(--fmf-critical)]"
                    : "text-[var(--fmf-text)]",
                )}
              >
                {entry.value}
              </span>
              <span className="shrink-0 text-[12px] text-[var(--fmf-text-subtle)]">
                {entry.observedAt}
              </span>
            </li>
          ))}
        </ul>
      </Section>
      {explanation !== undefined && <Section title="Explanation">{explanation}</Section>}
      {whyItMatters !== undefined && <Section title="Why it matters">{whyItMatters}</Section>}
      {recommendedRepair !== undefined && (
        <Section title="Recommended repair">{recommendedRepair}</Section>
      )}
    </div>
  );
}
