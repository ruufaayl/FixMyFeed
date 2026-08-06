/**
 * @fixmyfeed/testing
 *
 * Shared test utilities, fixtures, and harness helpers (development-time).
 *
 * Boundary established by task T000 (see /boundaries.json and
 * docs/04-system-architecture/monorepo-architecture.md). Implementation is added
 * by later tasks; this module is intentionally inert.
 */
export const workspaceName = "@fixmyfeed/testing" as const;
export const workspaceKind = "package" as const;
