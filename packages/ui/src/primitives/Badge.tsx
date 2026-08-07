/**
 * Badge primitive (task T100).
 *
 * Compact tone-driven label. Tones use both a soft background and foreground
 * color; callers pair it with text/icon so meaning never relies on color alone.
 */
import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn.js";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[var(--fmf-radius-sm)] px-2 py-0.5 text-[12px] font-medium leading-5",
  {
    variants: {
      tone: {
        healthy: "bg-[var(--fmf-healthy-soft)] text-[var(--fmf-healthy)]",
        info: "bg-[var(--fmf-info-soft)] text-[var(--fmf-info)]",
        warning: "bg-[var(--fmf-warning-soft)] text-[var(--fmf-warning)]",
        critical: "bg-[var(--fmf-critical-soft)] text-[var(--fmf-critical)]",
        neutral: "bg-[var(--fmf-neutral-soft)] text-[var(--fmf-neutral)]",
        brand: "bg-[var(--fmf-brand-soft)] text-[var(--fmf-brand)]",
      },
      variant: {
        soft: "",
        outline: "bg-transparent ring-1 ring-inset ring-current/30",
      },
    },
    defaultVariants: { tone: "neutral", variant: "soft" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, variant, ...props },
  ref,
) {
  return <span ref={ref} className={cn(badgeVariants({ tone, variant }), className)} {...props} />;
});
