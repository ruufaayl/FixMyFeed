/**
 * StatusDot component (task T100).
 *
 * A tone dot paired with a text label — status is never color-only. The dot is
 * `aria-hidden`; the label carries the meaning for assistive technology.
 */
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn.js";
import type { Tone } from "../tokens/index.js";

const DOT_TONE: Readonly<Record<Tone, string>> = {
  healthy: "bg-[var(--fmf-healthy)]",
  info: "bg-[var(--fmf-info)]",
  warning: "bg-[var(--fmf-warning)]",
  critical: "bg-[var(--fmf-critical)]",
  neutral: "bg-[var(--fmf-neutral)]",
  brand: "bg-[var(--fmf-brand)]",
};

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone: Tone;
  readonly label: string;
}

export function StatusDot({ tone, label, className, ...props }: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[14px]", className)} {...props}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_TONE[tone])} aria-hidden="true" />
      <span className="text-[var(--fmf-text)]">{label}</span>
    </span>
  );
}
