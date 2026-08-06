/**
 * @fixmyfeed/contracts
 *
 * Versioned API, event, webhook, and connector boundary contracts shared across apps and packages.
 *
 * Boundary established by task T000 (see /boundaries.json and
 * docs/04-system-architecture/monorepo-architecture.md). Implementation is added
 * by later tasks; this module is intentionally inert.
 */
export const workspaceName = "@fixmyfeed/contracts" as const;
export const workspaceKind = "package" as const;
