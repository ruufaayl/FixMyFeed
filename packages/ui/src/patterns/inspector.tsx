"use client";

/**
 * Inspector drawer + source comparison (task T104).
 *
 * `Inspector` is the right-side detail drawer (440–520px) that opens on row
 * selection instead of navigating away, preserving list context. Escape closes
 * it; it is a labeled dialog. `SourceComparison` is the attribute × source matrix
 * (Shopify / Feed / Landing page / Google) that visually emphasizes mismatched
 * values — one of the product's strongest differentiators.
 */
import { useEffect, type ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface InspectorProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Inspector({ open, onClose, title, children, className }: InspectorProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" aria-hidden="true" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Inspector"}
        className={cn(
          "relative flex h-full w-full max-w-[480px] flex-col border-l border-[var(--fmf-border)] bg-[var(--fmf-surface)] shadow-[var(--fmf-shadow-modal)]",
          className,
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--fmf-border)] px-4">
          <div className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--fmf-text)]">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--fmf-radius-md)] text-[var(--fmf-text-muted)] outline-none hover:bg-[var(--fmf-fog-100)] focus-visible:ring-2 focus-visible:ring-[var(--fmf-focus-ring)]"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

export interface ComparisonRow {
  readonly attribute: string;
  /** Value per source; keys correspond to `sources`. */
  readonly values: Readonly<Record<string, string | null>>;
  /** Marks the attribute as disagreeing across sources. */
  readonly mismatch?: boolean;
}

export interface SourceComparisonProps {
  readonly sources: readonly string[];
  readonly rows: readonly ComparisonRow[];
  readonly className?: string;
}

export function SourceComparison({ sources, rows, className }: SourceComparisonProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[var(--fmf-border)]">
            <th className="px-2 py-2 text-left font-medium text-[var(--fmf-text-subtle)]">
              Attribute
            </th>
            {sources.map((source) => (
              <th
                key={source}
                className="px-2 py-2 text-left font-medium text-[var(--fmf-text-subtle)]"
              >
                {source}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.attribute}
              data-mismatch={row.mismatch ? "true" : "false"}
              className="border-b border-[var(--fmf-border)] last:border-0"
            >
              <td className="px-2 py-2 text-[var(--fmf-text-muted)]">{row.attribute}</td>
              {sources.map((source) => {
                const value = row.values[source] ?? "—";
                return (
                  <td
                    key={source}
                    className={cn(
                      "px-2 py-2 font-mono text-[12px]",
                      row.mismatch
                        ? "font-semibold text-[var(--fmf-critical)]"
                        : "text-[var(--fmf-text)]",
                    )}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
