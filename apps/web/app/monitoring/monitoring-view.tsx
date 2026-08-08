"use client";

/**
 * Monitoring view (task T158) — client.
 *
 * Renders the live monitoring snapshot (derived metrics + merged event feed) and
 * supports async refresh: a Refresh button re-reads the snapshot through a server
 * action without a full navigation. Design unchanged from E10.
 */
import { useState, useTransition } from "react";
import { Metric, Surface, Timeline, Button, EmptyState } from "@fixmyfeed/ui";
import type { MonitoringDTO } from "@/lib/server/dto";
import { refreshMonitoring } from "./actions";

/** Compact relative time (e.g. "2m ago"); falls back to a locale date. */
function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return iso;
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(then).toLocaleDateString();
}

export function MonitoringView({ initial }: { initial: MonitoringDTO }) {
  const [monitoring, setMonitoring] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setError(null);
    startTransition(async () => {
      const result = await refreshMonitoring();
      if (result.ok) setMonitoring(result.monitoring);
      else setError(result.error.message);
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6" aria-busy={pending}>
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold text-[var(--fmf-text)]">Monitoring</h1>
        <Button variant="secondary" size="sm" disabled={pending} onClick={refresh}>
          {pending ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error !== null && (
        <EmptyState kind="unavailable" title="Could not refresh" description={error} />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {monitoring.metrics.map((m) => (
          <Surface key={m.id}>
            <Metric label={m.label} value={m.value.value} caption={m.caption ?? undefined} />
          </Surface>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[16px] font-semibold text-[var(--fmf-text)]">Recent events</h2>
        <Surface>
          {monitoring.events.length === 0 ? (
            <EmptyState kind="no-data" title="No recent activity" />
          ) : (
            <Timeline
              items={monitoring.events.map((e) => ({
                id: e.id,
                title: e.title,
                meta: e.meta ?? undefined,
                time: relativeTime(e.at),
                tone: e.tone,
              }))}
            />
          )}
        </Surface>
      </div>
    </div>
  );
}
