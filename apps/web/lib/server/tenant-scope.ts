/**
 * Tenant/workspace scope resolution (task T151).
 *
 * Every service resolves its scope from the server-produced `AppContextDTO` —
 * NEVER from client-supplied organization ownership. A requested workspace is
 * honored only when the user is a member of it (else FORBIDDEN); the organization
 * id is taken from the matched membership, so a client cannot widen its scope.
 */
import type { AppContextDTO } from "./context.js";
import { AppError, APP_ERROR_CODE } from "./errors.js";

export interface TenantScope {
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: string;
}

/**
 * Resolves the tenant scope for a request. Throws `UNAUTHENTICATED` when there is
 * no context, `FORBIDDEN` when a requested workspace is not one the user belongs
 * to, and `NOT_FOUND` when the user has no workspace at all.
 */
export function resolveScope(
  context: AppContextDTO | null,
  requestedWorkspaceId?: string | null,
): TenantScope {
  if (context === null) {
    throw new AppError(APP_ERROR_CODE.UNAUTHENTICATED, "Not signed in");
  }

  if (requestedWorkspaceId != null) {
    const requested = context.workspaces.find((w) => w.id === requestedWorkspaceId);
    if (!requested) {
      // Membership check — the client cannot select a workspace it does not own.
      throw new AppError(APP_ERROR_CODE.FORBIDDEN, "Workspace not accessible");
    }
    return {
      organizationId: requested.organizationId,
      workspaceId: requested.id,
      userId: context.user.id,
      role: requested.role,
    };
  }

  const active = context.workspaces.find((w) => w.id === context.activeWorkspaceId);
  if (!active) {
    throw new AppError(APP_ERROR_CODE.NOT_FOUND, "No active workspace");
  }
  return {
    organizationId: active.organizationId,
    workspaceId: active.id,
    userId: context.user.id,
    role: active.role,
  };
}
