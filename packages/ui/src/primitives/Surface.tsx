/**
 * Surface + Separator primitives (task T100).
 *
 * `Surface` is the base working panel (border-first elevation, minimal shadow).
 * `Separator` is a theme-aware divider with the correct ARIA role/orientation.
 */
import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn.js";

export const surfaceVariants = cva("bg-[var(--fmf-surface)] text-[var(--fmf-text)]", {
  variants: {
    level: {
      flat: "border border-[var(--fmf-border)]",
      raised:
        "border border-[var(--fmf-border)] bg-[var(--fmf-surface-raised)] shadow-[var(--fmf-shadow-popover)]",
    },
    radius: {
      md: "rounded-[var(--fmf-radius-md)]",
      lg: "rounded-[var(--fmf-radius-lg)]",
      xl: "rounded-[var(--fmf-radius-xl)]",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    },
  },
  defaultVariants: { level: "flat", radius: "lg", padding: "md" },
});

export interface SurfaceProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof surfaceVariants> {}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { className, level, radius, padding, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(surfaceVariants({ level, radius, padding }), className)}
      {...props}
    />
  );
});

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  readonly orientation?: "horizontal" | "vertical";
  /** Purely decorative separators are hidden from assistive tech. */
  readonly decorative?: boolean;
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(function Separator(
  { className, orientation = "horizontal", decorative = true, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "bg-[var(--fmf-border)]",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
});
