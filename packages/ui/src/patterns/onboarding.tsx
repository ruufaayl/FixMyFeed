/**
 * Onboarding patterns (task T102).
 *
 * A compact "connect → connect → scan" flow rather than a long wizard. `Stepper`
 * shows ordered progress (done / active / upcoming, not color-only); `ConnectCard`
 * is one connection step with its status and single safest action. Presentational
 * and framework-agnostic — the app supplies actions and connection state.
 */
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export const STEP_STATES = ["done", "active", "upcoming"] as const;
export type StepState = (typeof STEP_STATES)[number];

export interface Step {
  readonly id: string;
  readonly label: string;
  readonly state: StepState;
}

export interface StepperProps {
  readonly steps: readonly Step[];
  readonly className?: string;
}

export function Stepper({ steps, className }: StepperProps) {
  return (
    <ol className={cn("flex flex-col gap-2", className)}>
      {steps.map((step, index) => (
        <li key={step.id} className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
              step.state === "done" && "bg-[var(--fmf-healthy)] text-white",
              step.state === "active" && "bg-[var(--fmf-brand)] text-[var(--fmf-brand-contrast)]",
              step.state === "upcoming" && "bg-[var(--fmf-fog-100)] text-[var(--fmf-text-subtle)]",
            )}
          >
            {step.state === "done" ? "✓" : index + 1}
          </span>
          <span
            className={cn(
              "text-[14px]",
              step.state === "upcoming"
                ? "text-[var(--fmf-text-subtle)]"
                : "font-medium text-[var(--fmf-text)]",
            )}
          >
            {step.label}
          </span>
          <span className="sr-only">{`(${step.state})`}</span>
        </li>
      ))}
    </ol>
  );
}

export const CONNECT_STATES = ["not-connected", "connecting", "connected", "error"] as const;
export type ConnectState = (typeof CONNECT_STATES)[number];

export interface ConnectCardProps {
  readonly title: string;
  readonly description?: ReactNode;
  readonly state: ConnectState;
  readonly action?: ReactNode;
  readonly icon?: ReactNode;
  readonly className?: string;
}

const CONNECT_LABEL: Readonly<Record<ConnectState, string>> = {
  "not-connected": "Not connected",
  connecting: "Connecting…",
  connected: "Connected",
  error: "Connection failed",
};

const CONNECT_TONE: Readonly<Record<ConnectState, string>> = {
  "not-connected": "text-[var(--fmf-text-subtle)]",
  connecting: "text-[var(--fmf-info)]",
  connected: "text-[var(--fmf-healthy)]",
  error: "text-[var(--fmf-critical)]",
};

export function ConnectCard({
  title,
  description,
  state,
  action,
  icon,
  className,
}: ConnectCardProps) {
  return (
    <div
      data-connect-state={state}
      className={cn(
        "flex items-center gap-4 rounded-[var(--fmf-radius-lg)] border border-[var(--fmf-border)] bg-[var(--fmf-surface)] p-4",
        className,
      )}
    >
      {icon !== undefined && (
        <div className="shrink-0 text-[var(--fmf-text-muted)]" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-[var(--fmf-text)]">{title}</div>
        {description !== undefined && (
          <div className="mt-0.5 text-[13px] text-[var(--fmf-text-muted)]">{description}</div>
        )}
        <div className={cn("mt-1 text-[12px] font-medium", CONNECT_TONE[state])}>
          {CONNECT_LABEL[state]}
        </div>
      </div>
      {action !== undefined && <div className="shrink-0">{action}</div>}
    </div>
  );
}
