/**
 * Input primitive (task T100).
 *
 * Text input with token-driven surface/border, visible focus ring, and an
 * `invalid` state that also sets `aria-invalid` for assistive technology.
 */
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/cn.js";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, "aria-invalid": ariaInvalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={ariaInvalid ?? invalid ?? undefined}
      className={cn(
        "h-9 w-full rounded-[var(--fmf-radius-md)] border bg-[var(--fmf-surface)] px-3 text-[14px] text-[var(--fmf-text)]",
        "placeholder:text-[var(--fmf-text-subtle)] outline-none transition-colors [transition-duration:var(--fmf-motion-control)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--fmf-focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--fmf-surface)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid
          ? "border-[var(--fmf-critical)] focus-visible:ring-[var(--fmf-critical)]"
          : "border-[var(--fmf-border)]",
        className,
      )}
      {...props}
    />
  );
});
