/**
 * Button primitive (task T100).
 *
 * Accessible, variant-driven button. Visible focus ring, disabled handling, and
 * a default `type="button"` to avoid accidental form submission. Motion uses the
 * control-duration token (auto-zeroed under reduced motion).
 */
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn.js";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none font-medium",
    "outline-none transition-colors [transition-duration:var(--fmf-motion-control)]",
    "focus-visible:ring-2 focus-visible:ring-[var(--fmf-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--fmf-surface)]",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--fmf-brand)] text-[var(--fmf-brand-contrast)] hover:bg-[var(--fmf-brand-strong)]",
        secondary:
          "border border-[var(--fmf-border)] bg-[var(--fmf-surface)] text-[var(--fmf-text)] hover:bg-[var(--fmf-fog-100)]",
        ghost:
          "bg-transparent text-[var(--fmf-text-muted)] hover:bg-[var(--fmf-fog-100)] hover:text-[var(--fmf-text)]",
        danger: "bg-[var(--fmf-critical)] text-white hover:brightness-95",
      },
      size: {
        sm: "h-8 rounded-[var(--fmf-radius-sm)] px-3 text-[13px]",
        md: "h-9 rounded-[var(--fmf-radius-md)] px-4 text-[14px]",
        icon: "h-9 w-9 rounded-[var(--fmf-radius-md)]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});
