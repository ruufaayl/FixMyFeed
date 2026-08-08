"use client";

/**
 * Rule Builder pattern (task T157) — approved new E10 pattern.
 *
 * Authors a safe, declarative auto-remediation rule: a name, an action, a match
 * mode (all / any), and one or more conditions over an issue's code / severity /
 * field. Emits a plain value on submit — the caller validates and persists it
 * through the typed boundary. Never executes anything itself. Self-contained
 * (no app types), so the design system owns the visual contract.
 */
import { useState } from "react";
import { cn } from "../lib/cn.js";
import { Button } from "../primitives/Button.js";
import { Input } from "../primitives/Input.js";

export type RuleBuilderField = "code" | "severity" | "field";
export type RuleBuilderOperator = "eq" | "in";
export type RuleBuilderAction = "auto_apply" | "flag" | "ignore";
export type RuleBuilderMatch = "all" | "any";

export interface RuleBuilderCondition {
  readonly field: RuleBuilderField;
  readonly op: RuleBuilderOperator;
  /** Raw value; for `in`, a comma-separated list the caller splits. */
  readonly value: string;
}

export interface RuleBuilderValue {
  readonly name: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly match: RuleBuilderMatch;
  readonly action: RuleBuilderAction;
  readonly conditions: readonly RuleBuilderCondition[];
}

export interface RuleBuilderProps {
  readonly initialValue?: Partial<RuleBuilderValue>;
  readonly onSubmit: (value: RuleBuilderValue) => void;
  readonly onCancel?: () => void;
  readonly submitLabel?: string;
  readonly busy?: boolean;
  readonly className?: string;
}

const FIELD_OPTIONS: readonly RuleBuilderField[] = ["code", "severity", "field"];
const OP_OPTIONS: readonly { value: RuleBuilderOperator; label: string }[] = [
  { value: "eq", label: "is" },
  { value: "in", label: "is any of" },
];
const ACTION_OPTIONS: readonly { value: RuleBuilderAction; label: string }[] = [
  { value: "auto_apply", label: "Auto-apply fix" },
  { value: "flag", label: "Flag for review" },
  { value: "ignore", label: "Ignore" },
];

const EMPTY_CONDITION: RuleBuilderCondition = { field: "code", op: "eq", value: "" };

const selectClass =
  "h-9 rounded-[var(--fmf-radius-md)] border border-[var(--fmf-border)] bg-[var(--fmf-surface)] px-2 text-[13px] text-[var(--fmf-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fmf-brand)]";

export function RuleBuilder({
  initialValue,
  onSubmit,
  onCancel,
  submitLabel = "Save rule",
  busy = false,
  className,
}: RuleBuilderProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [enabled, setEnabled] = useState(initialValue?.enabled ?? true);
  const [priority, setPriority] = useState(String(initialValue?.priority ?? 0));
  const [match, setMatch] = useState<RuleBuilderMatch>(initialValue?.match ?? "all");
  const [action, setAction] = useState<RuleBuilderAction>(initialValue?.action ?? "flag");
  const [conditions, setConditions] = useState<RuleBuilderCondition[]>(
    initialValue?.conditions && initialValue.conditions.length > 0
      ? initialValue.conditions.map((c) => ({ ...c }))
      : [{ ...EMPTY_CONDITION }],
  );

  function updateCondition(index: number, patch: Partial<RuleBuilderCondition>) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  const nameOk = name.trim() !== "";
  const conditionsOk = conditions.every((c) => c.value.trim() !== "");
  const canSubmit = nameOk && conditionsOk && !busy;

  function submit() {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      enabled,
      priority: Number.parseInt(priority, 10) || 0,
      match,
      action,
      conditions: conditions.map((c) => ({ ...c, value: c.value.trim() })),
    });
  }

  return (
    <div
      data-rule-builder
      className={cn(
        "flex flex-col gap-4 rounded-[var(--fmf-radius-lg)] border border-[var(--fmf-border)] bg-[var(--fmf-surface)] p-4",
        className,
      )}
    >
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-[var(--fmf-text)]">Rule name</span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Auto-fix insecure image links"
          aria-label="Rule name"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--fmf-text-muted)]">
        <span>Match</span>
        <select
          className={selectClass}
          value={match}
          onChange={(event) => setMatch(event.target.value as RuleBuilderMatch)}
          aria-label="Match mode"
        >
          <option value="all">all conditions</option>
          <option value="any">any condition</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        {conditions.map((condition, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select
              className={selectClass}
              value={condition.field}
              onChange={(event) =>
                updateCondition(index, { field: event.target.value as RuleBuilderField })
              }
              aria-label={`Condition ${index + 1} field`}
            >
              {FIELD_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={condition.op}
              onChange={(event) =>
                updateCondition(index, { op: event.target.value as RuleBuilderOperator })
              }
              aria-label={`Condition ${index + 1} operator`}
            >
              {OP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Input
              value={condition.value}
              onChange={(event) => updateCondition(index, { value: event.target.value })}
              placeholder={condition.op === "in" ? "value1, value2" : "value"}
              aria-label={`Condition ${index + 1} value`}
              className="min-w-[10rem] flex-1"
            />
            {conditions.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setConditions((prev) => prev.filter((_, i) => i !== index))}
                aria-label={`Remove condition ${index + 1}`}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        <div>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => setConditions((prev) => [...prev, { ...EMPTY_CONDITION }])}
          >
            Add condition
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[13px] text-[var(--fmf-text-muted)]">
          <span>Then</span>
          <select
            className={selectClass}
            value={action}
            onChange={(event) => setAction(event.target.value as RuleBuilderAction)}
            aria-label="Rule action"
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[var(--fmf-text-muted)]">
          <span>Priority</span>
          <Input
            type="number"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            aria-label="Rule priority"
            className="w-20"
          />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[var(--fmf-text-muted)]">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            aria-label="Rule enabled"
          />
          <span>Enabled</span>
        </label>
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel !== undefined && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button size="sm" disabled={!canSubmit} onClick={submit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
