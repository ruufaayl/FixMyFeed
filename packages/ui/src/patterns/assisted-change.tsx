"use client";

/**
 * Assisted Change pattern (task T154) — approved new E10 pattern.
 *
 * Collects a human-supplied value for a repair change the engine cannot compute
 * on its own (assisted or manual remediations). Shows the current value and a
 * pre-filled suggestion; the operator confirms or edits before it enters the
 * plan. Never auto-applies — the value is only proposed on submit.
 */
import { useState, type ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Button } from "../primitives/Button.js";
import { Input } from "../primitives/Input.js";

export interface AssistedChangeProps {
  readonly field: string;
  readonly currentValue: string | null;
  /** Optional engine suggestion pre-filled into the input. */
  readonly suggestedValue?: string | null;
  readonly onSubmit: (value: string) => void;
  readonly onSkip?: () => void;
  readonly hint?: ReactNode;
  readonly className?: string;
}

export function AssistedChange({
  field,
  currentValue,
  suggestedValue,
  onSubmit,
  onSkip,
  hint,
  className,
}: AssistedChangeProps) {
  const [value, setValue] = useState(suggestedValue ?? "");
  const trimmed = value.trim();

  return (
    <div
      data-assisted-field={field}
      className={cn(
        "flex flex-col gap-3 rounded-[var(--fmf-radius-lg)] border border-[var(--fmf-border)] bg-[var(--fmf-surface)] p-4",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-[var(--fmf-text)]">{field}</span>
        <span className="font-mono text-[12px] text-[var(--fmf-text-subtle)]">
          {currentValue ?? "—"}
        </span>
      </div>
      {hint !== undefined && <p className="text-[12px] text-[var(--fmf-text-muted)]">{hint}</p>}
      <label className="flex flex-col gap-1">
        <span className="sr-only">{`New value for ${field}`}</span>
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={`New ${field}`}
          aria-label={`New value for ${field}`}
        />
      </label>
      <div className="flex items-center justify-end gap-2">
        {onSkip !== undefined && (
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip
          </Button>
        )}
        <Button size="sm" disabled={trimmed === ""} onClick={() => onSubmit(trimmed)}>
          Apply value
        </Button>
      </div>
    </div>
  );
}
