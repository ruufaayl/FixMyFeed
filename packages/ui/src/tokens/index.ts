/**
 * Signal Interface design tokens, mirrored in TypeScript (task T100).
 *
 * The canonical values from `styles/tokens.css`, exposed for programmatic use
 * (charts, inline styles, tests). CSS remains the source of truth for theming;
 * these are the stable names and reference values.
 */

export const TONES = ["healthy", "info", "warning", "critical", "neutral", "brand"] as const;
export type Tone = (typeof TONES)[number];

/** CSS custom-property name for a tone's foreground color. */
export function toneVar(tone: Tone): string {
  return `var(--fmf-${tone})`;
}

/** CSS custom-property name for a tone's soft background color. */
export function toneSoftVar(tone: Tone): string {
  return `var(--fmf-${tone}-soft)`;
}

export const RADII = {
  sm: "var(--fmf-radius-sm)",
  md: "var(--fmf-radius-md)",
  lg: "var(--fmf-radius-lg)",
  xl: "var(--fmf-radius-xl)",
} as const;

export const MOTION = {
  hover: "var(--fmf-motion-hover)",
  control: "var(--fmf-motion-control)",
  popover: "var(--fmf-motion-popover)",
  inspector: "var(--fmf-motion-inspector)",
  modal: "var(--fmf-motion-modal)",
  ease: "var(--fmf-ease-standard)",
} as const;

export const FONT = {
  sans: "var(--fmf-font-sans)",
  mono: "var(--fmf-font-mono)",
} as const;

/** Reference hex values (light theme) for non-CSS consumers such as charts. */
export const REFERENCE_COLORS = {
  ink950: "#0b0b12",
  ink800: "#1c1d28",
  ink600: "#4a4c5a",
  ink400: "#8a8c9b",
  fog200: "#e4e5ec",
  fog100: "#f1f2f6",
  fog50: "#f7f8fb",
  white: "#ffffff",
  brand: "#5b5ce2",
  healthy: "#2e9e6b",
  info: "#2f6feb",
  warning: "#b7791f",
  critical: "#d6303f",
  neutral: "#6b6e7e",
} as const;

/** The two breakpoints that switch the console's layout mode. */
export const BREAKPOINTS = {
  /** Below this width the sidebar collapses (tablet). */
  tablet: 1024,
  /** Below this width mobile navigation applies. */
  mobile: 768,
} as const;
