/**
 * Application context boundary tests (task T150).
 */
import { describe, it, expect } from "vitest";
import {
  resolveAppContext,
  hasActiveWorkspace,
  getAppContext,
  type MembershipRecord,
  type AppSession,
} from "../lib/server/context";
import { DEMO_APP_CONTEXT } from "../lib/fixtures/demo-context";

const session: AppSession = { userId: "u1", name: "A", email: "a@example.test" };
const memberships: MembershipRecord[] = [
  { workspaceId: "w1", organizationId: "o1", workspaceName: "Acme", role: "owner" },
  { workspaceId: "w2", organizationId: "o2", workspaceName: "Globex", role: "editor" },
];

describe("resolveAppContext", () => {
  it("returns null when unauthenticated", () => {
    expect(resolveAppContext(null, memberships)).toBeNull();
  });

  it("maps session + memberships to DTOs (no infra types) and defaults active workspace", () => {
    const ctx = resolveAppContext(session, memberships);
    expect(ctx?.user).toEqual({ id: "u1", name: "A", email: "a@example.test" });
    expect(ctx?.workspaces.map((w) => w.id)).toEqual(["w1", "w2"]);
    expect(ctx?.activeWorkspaceId).toBe("w1"); // first membership
  });

  it("honors a requested workspace only when the user is a member", () => {
    expect(resolveAppContext(session, memberships, "w2")?.activeWorkspaceId).toBe("w2");
    expect(resolveAppContext(session, memberships, "not-mine")?.activeWorkspaceId).toBe("w1");
  });

  it("hasActiveWorkspace guards no-membership users", () => {
    expect(hasActiveWorkspace(resolveAppContext(session, []))).toBe(false);
    expect(hasActiveWorkspace(resolveAppContext(session, memberships))).toBe(true);
  });
});

describe("getAppContext (composition over ports)", () => {
  it("composes session + membership readers", async () => {
    const ctx = await getAppContext(
      { getSession: async () => session },
      { load: async () => memberships },
      "w2",
    );
    expect(ctx?.activeWorkspaceId).toBe("w2");
  });

  it("returns null when the session reader has no session", async () => {
    const ctx = await getAppContext(
      { getSession: async () => null },
      { load: async () => memberships },
    );
    expect(ctx).toBeNull();
  });
});

describe("demo fixture", () => {
  it("is an explicit fixture, not wired into production resolution", () => {
    expect(DEMO_APP_CONTEXT.activeWorkspaceId).toBe("demo");
    expect(DEMO_APP_CONTEXT.workspaces[0]?.role).toBe("owner");
  });
});
