/**
 * @fixmyfeed/maintenance
 *
 * Recurring scheduler that enqueues durable work only; it performs no business work itself.
 *
 * Boundary established by task T000 (see /boundaries.json and
 * docs/04-system-architecture/monorepo-architecture.md). Implementation is added
 * by later tasks; this module is intentionally inert.
 */
export const workspaceName = "@fixmyfeed/maintenance" as const;
export const workspaceKind = "application" as const;
