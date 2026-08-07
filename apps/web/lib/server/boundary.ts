/**
 * Application boundary barrel (task T151).
 *
 * The single import surface for the typed contract between the FixMyFeed backend/
 * domain packages and the Signal Interface. Server components and server actions
 * import services, DTOs, query contracts, and the error contract from here.
 * Nothing in this surface exposes Drizzle models, database rows, connector
 * payloads, queue internals, or raw JSONB.
 */
export * from "./context";
export * from "./errors";
export * from "./query";
export * from "./tenant-scope";
export * from "./dto";
export * from "./services";
