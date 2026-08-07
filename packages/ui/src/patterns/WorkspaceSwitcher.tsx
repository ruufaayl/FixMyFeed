/**
 * WorkspaceSwitcher (task T101).
 *
 * A native <select> workspace/store switcher bound to the workspace context —
 * accessible and keyboard-operable by default. The app supplies switching
 * behavior through the context's `onSwitch`.
 */
import { useWorkspace } from "./workspace-context.js";
import { cn } from "../lib/cn.js";

export interface WorkspaceSwitcherProps {
  readonly className?: string;
  readonly collapsed?: boolean;
}

export function WorkspaceSwitcher({ className, collapsed = false }: WorkspaceSwitcherProps) {
  const { workspaces, activeWorkspace, onSwitch } = useWorkspace();

  if (collapsed) {
    return (
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-[var(--fmf-radius-md)] bg-[var(--fmf-brand-soft)] text-[13px] font-semibold text-[var(--fmf-brand)]",
          className,
        )}
        title={activeWorkspace?.name}
        aria-label={activeWorkspace ? `Workspace: ${activeWorkspace.name}` : "Select workspace"}
      >
        {(activeWorkspace?.name ?? "?").slice(0, 1).toUpperCase()}
      </div>
    );
  }

  return (
    <label className={cn("block", className)}>
      <span className="sr-only">Active workspace</span>
      <select
        value={activeWorkspace?.id ?? ""}
        onChange={(event) => onSwitch(event.target.value)}
        className={cn(
          "h-9 w-full rounded-[var(--fmf-radius-md)] border border-[var(--fmf-border)] bg-[var(--fmf-surface)] px-2.5 text-[14px] font-medium text-[var(--fmf-text)]",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--fmf-focus-ring)]",
        )}
      >
        {activeWorkspace === null && (
          <option value="" disabled>
            Select workspace
          </option>
        )}
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    </label>
  );
}
