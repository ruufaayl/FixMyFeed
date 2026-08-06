/**
 * @fixmyfeed/web
 *
 * Next.js application: public SEO pages, authenticated app routes, and bounded request/response APIs. Never executes unbounded catalog work in a request.
 *
 * Boundary established by task T000 (see /boundaries.json and
 * docs/04-system-architecture/monorepo-architecture.md). Implementation is added
 * by later tasks; this module is intentionally inert.
 */
export const workspaceName = "@fixmyfeed/web" as const;
export const workspaceKind = "application" as const;
