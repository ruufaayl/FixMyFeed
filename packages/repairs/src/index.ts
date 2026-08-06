/**
 * @fixmyfeed/repairs
 *
 * Remediation registry, change-set preview, approval, writeback, verification, and rollback orchestration.
 *
 * Boundary established by task T000 (see /boundaries.json and
 * docs/04-system-architecture/monorepo-architecture.md). Implementation is added
 * by later tasks; this module is intentionally inert.
 */
export const workspaceName = "@fixmyfeed/repairs" as const;
export const workspaceKind = "package" as const;
