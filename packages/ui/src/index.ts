/**
 * @fixmyfeed/ui — FixMyFeed "Signal Interface" design system (E10).
 *
 * Foundation layer (task T100): design tokens, class-name utility, accessible
 * React primitives, and product components. Light-first, one Electric Indigo
 * brand accent, dedicated semantic health colors, WCAG 2.2 AA from the primitive
 * layer. Later E10 tasks add the app shell, command palette, data grid, and the
 * assembled product screens.
 *
 * Import the token CSS once at the app root: `@fixmyfeed/ui/styles.css`.
 */
export const workspaceName = "@fixmyfeed/ui" as const;
export const workspaceKind = "package" as const;

// Tokens + utilities.
export {
  TONES,
  toneVar,
  toneSoftVar,
  RADII,
  MOTION,
  FONT,
  REFERENCE_COLORS,
  BREAKPOINTS,
} from "./tokens/index.js";
export type { Tone } from "./tokens/index.js";
export { cn } from "./lib/cn.js";

// Primitives.
export { Button, buttonVariants } from "./primitives/Button.js";
export type { ButtonProps } from "./primitives/Button.js";
export { Badge, badgeVariants } from "./primitives/Badge.js";
export type { BadgeProps } from "./primitives/Badge.js";
export { Input } from "./primitives/Input.js";
export type { InputProps } from "./primitives/Input.js";
export { Surface, surfaceVariants, Separator } from "./primitives/Surface.js";
export type { SurfaceProps, SeparatorProps } from "./primitives/Surface.js";

// Components.
export {
  ISSUE_SEVERITIES,
  SEVERITY_PRESENTATION,
  severityTone,
  severityLabel,
  compareSeverity,
} from "./components/severity.js";
export type { IssueSeverity, SeverityPresentation } from "./components/severity.js";
export { StatusDot } from "./components/StatusDot.js";
export type { StatusDotProps } from "./components/StatusDot.js";
export { HealthScore, healthScoreTone, healthScoreLabel } from "./components/HealthScore.js";
export type { HealthScoreProps } from "./components/HealthScore.js";
export { Metric } from "./components/Metric.js";
export type { MetricProps } from "./components/Metric.js";
export { IssueBadge } from "./components/IssueBadge.js";
export type { IssueBadgeProps } from "./components/IssueBadge.js";
export { EmptyState, EMPTY_STATE_KINDS } from "./components/EmptyState.js";
export type { EmptyStateProps, EmptyStateKind } from "./components/EmptyState.js";
