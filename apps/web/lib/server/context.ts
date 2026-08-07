/**
 * Application context boundary (task T150).
 *
 * The typed application context the Signal Interface consumes — never Drizzle
 * rows, connector payloads, or infrastructure types. `resolveAppContext` is a
 * pure mapper from an authenticated session + the user's memberships to the
 * context DTO, so it is unit-testable without a database or auth runtime. The
 * live session/membership reads are wired in `runtime.ts` (server-only) and
 * exercised end-to-end in T159.
 */

/** A signed-in user, as exposed to the UI. */
export interface AppUserDTO {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

/** A workspace the user can act in, with their role there. */
export interface WorkspaceDTO {
  readonly id: string;
  /** The owning tenant. Server-resolved; services scope queries by it. */
  readonly organizationId: string;
  readonly name: string;
  readonly role: string;
}

/** The resolved application context for a request. */
export interface AppContextDTO {
  readonly user: AppUserDTO;
  readonly workspaces: readonly WorkspaceDTO[];
  readonly activeWorkspaceId: string | null;
}

/** Minimal authenticated session shape (mapped from Better Auth). */
export interface AppSession {
  readonly userId: string;
  readonly name: string;
  readonly email: string;
}

/** A membership record (mapped from tenancy rows — not a Drizzle row). */
export interface MembershipRecord {
  readonly workspaceId: string;
  readonly organizationId: string;
  readonly workspaceName: string;
  readonly role: string;
}

/**
 * Maps an authenticated session + memberships to the application context.
 * Returns null when unauthenticated. The active workspace is the requested one
 * when the user is a member, otherwise the first membership (or null).
 */
export function resolveAppContext(
  session: AppSession | null,
  memberships: readonly MembershipRecord[],
  requestedWorkspaceId?: string | null,
): AppContextDTO | null {
  if (session === null) return null;

  const workspaces: WorkspaceDTO[] = memberships.map((membership) => ({
    id: membership.workspaceId,
    organizationId: membership.organizationId,
    name: membership.workspaceName,
    role: membership.role,
  }));

  const requestedIsMember =
    requestedWorkspaceId != null && workspaces.some((w) => w.id === requestedWorkspaceId);
  const activeWorkspaceId = requestedIsMember ? requestedWorkspaceId : (workspaces[0]?.id ?? null);

  return {
    user: { id: session.userId, name: session.name, email: session.email },
    workspaces,
    activeWorkspaceId,
  };
}

/** Whether the context has an active workspace the user can act in. */
export function hasActiveWorkspace(context: AppContextDTO | null): context is AppContextDTO {
  return context !== null && context.activeWorkspaceId !== null;
}

/** Reads the authenticated session for the current request (Better Auth adapter). */
export interface SessionReader {
  getSession(): Promise<AppSession | null>;
}

/** Loads the workspaces a user can act in (tenancy adapter). */
export interface MembershipLoader {
  load(userId: string): Promise<readonly MembershipRecord[]>;
}

/**
 * Composes the application context from the injected session + membership
 * readers. Pure over its ports (no infrastructure imports), so it is unit-tested
 * with fakes; the concrete adapters (Better Auth, Drizzle) are wired in the
 * server runtime.
 */
export async function getAppContext(
  sessionReader: SessionReader,
  membershipLoader: MembershipLoader,
  requestedWorkspaceId?: string | null,
): Promise<AppContextDTO | null> {
  const session = await sessionReader.getSession();
  if (session === null) return null;
  const memberships = await membershipLoader.load(session.userId);
  return resolveAppContext(session, memberships, requestedWorkspaceId);
}
