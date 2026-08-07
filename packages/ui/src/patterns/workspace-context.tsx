"use client";

/**
 * Workspace context (task T101).
 *
 * Holds the authenticated shell's active workspace/store selection and the list
 * of available workspaces, framework-agnostically (no Next/router import — the
 * app supplies switching behavior). Consumers read it via `useWorkspace`.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";

export interface Workspace {
  readonly id: string;
  readonly name: string;
  /** Optional connector/store kind for an icon or label (e.g. "shopify"). */
  readonly kind?: string;
}

export interface WorkspaceContextValue {
  readonly workspaces: readonly Workspace[];
  readonly activeWorkspace: Workspace | null;
  /** Requests a switch to another workspace; the app performs navigation. */
  readonly onSwitch: (workspaceId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export interface WorkspaceProviderProps {
  readonly workspaces: readonly Workspace[];
  readonly activeWorkspaceId: string | null;
  readonly onSwitch: (workspaceId: string) => void;
  readonly children: ReactNode;
}

export function WorkspaceProvider({
  workspaces,
  activeWorkspaceId,
  onSwitch,
  children,
}: WorkspaceProviderProps) {
  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      activeWorkspace: workspaces.find((w) => w.id === activeWorkspaceId) ?? null,
      onSwitch,
    }),
    [workspaces, activeWorkspaceId, onSwitch],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/** Reads the workspace context; throws if used outside a provider. */
export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (value === null) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return value;
}
