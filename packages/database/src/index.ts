/**
 * @fixmyfeed/database
 *
 * Tenant-aware repositories and the Drizzle/PostgreSQL access layer. The only package permitted to issue SQL.
 *
 * Boundary established by task T000 (see /boundaries.json and
 * docs/04-system-architecture/monorepo-architecture.md). Implementation is added
 * by later tasks; this module is intentionally inert.
 */
export const workspaceName = "@fixmyfeed/database" as const;
export const workspaceKind = "package" as const;
