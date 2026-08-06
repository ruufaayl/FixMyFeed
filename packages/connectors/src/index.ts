/**
 * @fixmyfeed/connectors
 *
 * Versioned external-platform adapters (Shopify, WooCommerce, Google Merchant Center, SMTP). May depend on contracts and domain abstractions but not application UI.
 *
 * Boundary established by task T000 (see /boundaries.json and
 * docs/04-system-architecture/monorepo-architecture.md). Implementation is added
 * by later tasks; this module is intentionally inert.
 */
export const workspaceName = "@fixmyfeed/connectors" as const;
export const workspaceKind = "package" as const;
