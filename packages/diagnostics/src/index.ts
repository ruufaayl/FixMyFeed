/**
 * @fixmyfeed/diagnostics
 *
 * Deterministic validator registry and diagnostic scan execution.
 *
 * Boundary established by task T000 (see /boundaries.json and
 * docs/04-system-architecture/monorepo-architecture.md). Implementation is added
 * by later tasks; this module is intentionally inert.
 */
export const workspaceName = "@fixmyfeed/diagnostics" as const;
export const workspaceKind = "package" as const;
