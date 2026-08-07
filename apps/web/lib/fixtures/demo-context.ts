/**
 * Explicit demo/test fixtures (task T150).
 *
 * The sample application context, kept as an EXPLICIT fixture — used only by
 * tests and an opt-in demo, never as a silent production fallback. Production
 * code paths must resolve real context via the server runtime.
 */
import type { AppContextDTO } from "../server/context";

export const DEMO_APP_CONTEXT: AppContextDTO = {
  user: { id: "demo-user", name: "Demo Merchant", email: "demo@fixmyfeed.example" },
  workspaces: [{ id: "demo", organizationId: "demo-org", name: "Demo Store", role: "owner" }],
  activeWorkspaceId: "demo",
};
