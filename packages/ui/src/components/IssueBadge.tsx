/**
 * IssueBadge component (task T100).
 *
 * Renders a diagnostic severity as a toned badge with its text label (and an
 * `aria-hidden` glyph), so severity is conveyed by shape + text, not color alone.
 */
import { Badge } from "../primitives/Badge.js";
import { severityTone, severityLabel, type IssueSeverity } from "./severity.js";

const SEVERITY_GLYPH: Readonly<Record<IssueSeverity, string>> = {
  critical: "●",
  error: "▲",
  warning: "▲",
  info: "●",
};

export interface IssueBadgeProps {
  readonly severity: IssueSeverity;
  readonly className?: string;
}

export function IssueBadge({ severity, className }: IssueBadgeProps) {
  return (
    <Badge tone={severityTone(severity)} className={className}>
      <span aria-hidden="true">{SEVERITY_GLYPH[severity]}</span>
      {severityLabel(severity)}
    </Badge>
  );
}
