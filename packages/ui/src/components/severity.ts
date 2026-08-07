/**
 * Issue severity presentation (task T100).
 *
 * Maps diagnostic severities (E08: critical/error/warning/info) to a Signal
 * Interface tone plus a human label and sort rank. Components pair the tone with
 * the label and an icon so severity is never communicated by color alone
 * (WCAG 2.2 AA).
 */
import type { Tone } from "../tokens/index.js";

export const ISSUE_SEVERITIES = ["critical", "error", "warning", "info"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export interface SeverityPresentation {
  readonly tone: Tone;
  readonly label: string;
  /** Lower ranks are more severe (sort ascending). */
  readonly rank: number;
}

export const SEVERITY_PRESENTATION: Readonly<Record<IssueSeverity, SeverityPresentation>> = {
  critical: { tone: "critical", label: "Critical", rank: 0 },
  error: { tone: "critical", label: "Error", rank: 1 },
  warning: { tone: "warning", label: "Warning", rank: 2 },
  info: { tone: "info", label: "Info", rank: 3 },
};

export function severityTone(severity: IssueSeverity): Tone {
  return SEVERITY_PRESENTATION[severity].tone;
}

export function severityLabel(severity: IssueSeverity): string {
  return SEVERITY_PRESENTATION[severity].label;
}

/** Comparator ordering severities most-severe first. */
export function compareSeverity(a: IssueSeverity, b: IssueSeverity): number {
  return SEVERITY_PRESENTATION[a].rank - SEVERITY_PRESENTATION[b].rank;
}
