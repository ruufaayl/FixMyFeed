"use client";

/**
 * Repair rules view (task T157) — client.
 *
 * Lists auto-remediation rules and authors them with the E10 Rule Builder pattern
 * (#4). Create / edit / enable-disable / delete and a dry-run simulation, all via
 * server actions through the typed boundary. Maps the builder's plain value to the
 * RuleDraftDTO; design unchanged from E10.
 */
import { useState, useTransition } from "react";
import {
  RuleBuilder,
  Surface,
  Badge,
  Button,
  EmptyState,
  Metric,
  type RuleBuilderValue,
} from "@fixmyfeed/ui";
import type { RepairRuleDTO, RuleDraftDTO, RuleSimulationDTO } from "@/lib/server/dto";
import { createRule, updateRule, setRuleEnabled, removeRule, runSimulation } from "./actions";

const ACTION_LABEL: Record<string, string> = {
  auto_apply: "Auto-apply",
  flag: "Flag",
  ignore: "Ignore",
};

function toDraft(value: RuleBuilderValue): RuleDraftDTO {
  return {
    name: value.name,
    enabled: value.enabled,
    priority: value.priority,
    definition: {
      match: value.match,
      action: value.action,
      conditions: value.conditions.map((c) => ({
        field: c.field,
        op: c.op,
        values:
          c.op === "in"
            ? c.value
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s !== "")
            : [c.value],
      })),
    },
  };
}

function toBuilderValue(rule: RepairRuleDTO): RuleBuilderValue {
  return {
    name: rule.name,
    enabled: rule.enabled,
    priority: rule.priority,
    match: rule.definition.match,
    action: rule.definition.action,
    conditions: rule.definition.conditions.map((c) => ({
      field: c.field,
      op: c.op,
      value: c.values.join(", "),
    })),
  };
}

function describe(rule: RepairRuleDTO): string {
  const parts = rule.definition.conditions.map(
    (c) => `${c.field} ${c.op === "in" ? "in" : "="} ${c.values.join(" | ")}`,
  );
  return `${rule.definition.match === "any" ? "any" : "all"}: ${parts.join(rule.definition.match === "any" ? " or " : " and ")}`;
}

export function RulesView({ rules }: { rules: readonly RepairRuleDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [simulation, setSimulation] = useState<RuleSimulationDTO | null>(null);

  function run(
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
    done?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error?.message ?? "Action failed");
      else done?.();
    });
  }

  function simulate() {
    setError(null);
    startTransition(async () => {
      const result = await runSimulation();
      if (!result.ok) setError(result.error.message);
      else setSimulation(result.simulation);
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6" aria-busy={pending}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Repair rules</h1>
          <p className="text-[13px] text-[var(--fmf-text-muted)]">
            Automate how recurring issues are handled. Rules never run without your policy.
          </p>
        </div>
        {!creating && (
          <Button size="sm" disabled={pending} onClick={() => setCreating(true)}>
            New rule
          </Button>
        )}
      </div>

      {error !== null && (
        <EmptyState kind="unavailable" title="Could not save rule" description={error} />
      )}

      {creating && (
        <RuleBuilder
          submitLabel="Create rule"
          busy={pending}
          onCancel={() => setCreating(false)}
          onSubmit={(value) =>
            run(
              () => createRule(toDraft(value)),
              () => setCreating(false),
            )
          }
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">
          {rules.length} rule{rules.length === 1 ? "" : "s"}
        </h2>
        <Button variant="secondary" size="sm" disabled={pending} onClick={simulate}>
          Run simulation
        </Button>
      </div>

      {simulation !== null && (
        <Surface padding="sm">
          <div className="flex flex-wrap gap-6">
            <Metric label="Issues matched" value={String(simulation.matchedIssues)} />
            <Metric label="Open issues" value={String(simulation.totalIssues)} />
            <Metric label="Rules fired" value={String(simulation.entries.length)} />
          </div>
          {simulation.entries.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-[12px] text-[var(--fmf-text-muted)]">
              {simulation.entries.map((e) => (
                <li key={e.ruleId}>
                  <span className="text-[var(--fmf-text)]">{e.ruleName}</span> →{" "}
                  {ACTION_LABEL[e.action] ?? e.action} · {e.matchedCount} matched
                  {e.sampleCodes.length > 0 && ` (${e.sampleCodes.join(", ")})`}
                </li>
              ))}
            </ul>
          )}
        </Surface>
      )}

      {rules.length === 0 && !creating ? (
        <EmptyState
          kind="no-data"
          title="No rules yet"
          description="Create a rule to automate how recurring issues are triaged and repaired."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rules.map((rule) =>
            editingId === rule.id ? (
              <RuleBuilder
                key={rule.id}
                initialValue={toBuilderValue(rule)}
                submitLabel="Save changes"
                busy={pending}
                onCancel={() => setEditingId(null)}
                onSubmit={(value) =>
                  run(
                    () => updateRule(rule.id, toDraft(value)),
                    () => setEditingId(null),
                  )
                }
              />
            ) : (
              <Surface key={rule.id} padding="sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-[var(--fmf-text)]">
                        {rule.name}
                      </span>
                      <Badge tone={rule.enabled ? "brand" : "neutral"}>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <Badge tone="neutral">{ACTION_LABEL[rule.definition.action]}</Badge>
                    </div>
                    <p className="mt-1 font-mono text-[12px] text-[var(--fmf-text-muted)]">
                      {describe(rule)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => setRuleEnabled(rule.id, !rule.enabled))}
                    >
                      {rule.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => setEditingId(rule.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => removeRule(rule.id))}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Surface>
            ),
          )}
        </div>
      )}
    </div>
  );
}
