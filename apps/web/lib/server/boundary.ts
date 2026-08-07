/**
 * Application boundary barrel (task T151).
 *
 * The single import surface for the typed contract between the FixMyFeed backend/
 * domain packages and the Signal Interface. Server components and server actions
 * import services, DTOs, query contracts, and the error contract from here.
 * Nothing in this surface exposes Drizzle models, database rows, connector
 * payloads, queue internals, or raw JSONB.
 */
export * from "./context.js";
export * from "./errors.js";
export * from "./query.js";
export * from "./tenant-scope.js";
export * from "./dto.js";
export * from "./services.js";
