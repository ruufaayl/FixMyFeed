/**
 * Application shell (task T101).
 *
 * Framework-agnostic authenticated-console layout: a resizable/collapsible left
 * `Sidebar` (logo → workspace switcher → grouped nav → footer), a `TopBar`, and
 * an `AppShell` that composes them around the routed content. Navigation items
 * render through a caller-supplied `renderLink` so the app wires its router
 * (e.g. Next `Link`) without the design system depending on it. Keyboard
 * operable with visible focus (WCAG 2.2 AA).
 */
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon?: ReactNode;
  /** Optional count/severity indicator shown at the row's end. */
  readonly badge?: ReactNode;
}

export interface NavSection {
  readonly id: string;
  readonly label?: string;
  readonly items: readonly NavItem[];
}

/** Renders a nav item's clickable element; defaults to a plain anchor. */
export type RenderLink = (item: NavItem, className: string, children: ReactNode) => ReactNode;

const defaultRenderLink: RenderLink = (item, className, children) => (
  <a href={item.href} className={className}>
    {children}
  </a>
);

export interface SidebarProps {
  readonly sections: readonly NavSection[];
  readonly activeId: string | null;
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
  readonly collapsed?: boolean;
  readonly renderLink?: RenderLink;
  readonly className?: string;
}

export function Sidebar({
  sections,
  activeId,
  header,
  footer,
  collapsed = false,
  renderLink = defaultRenderLink,
  className,
}: SidebarProps) {
  return (
    <nav
      aria-label="Primary"
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "flex h-full flex-col gap-1 border-r border-[var(--fmf-border)] bg-[var(--fmf-surface)] py-3",
        collapsed ? "w-14 px-1.5" : "w-60 px-3",
        className,
      )}
    >
      {header !== undefined && <div className="px-1 pb-2">{header}</div>}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.id} className="flex flex-col gap-0.5">
            {!collapsed && section.label !== undefined && (
              <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--fmf-text-subtle)]">
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const active = item.id === activeId;
              const linkClass = cn(
                "group flex items-center gap-2.5 rounded-[var(--fmf-radius-md)] px-2 py-1.5 text-[14px] outline-none",
                "transition-colors [transition-duration:var(--fmf-motion-control)]",
                "focus-visible:ring-2 focus-visible:ring-[var(--fmf-focus-ring)]",
                active
                  ? "bg-[var(--fmf-brand-soft)] font-medium text-[var(--fmf-brand)]"
                  : "text-[var(--fmf-text-muted)] hover:bg-[var(--fmf-fog-100)] hover:text-[var(--fmf-text)]",
              );
              const content = (
                <>
                  {item.icon !== undefined && (
                    <span className="shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && item.badge !== undefined && (
                    <span className="shrink-0">{item.badge}</span>
                  )}
                </>
              );
              return (
                <div key={item.id} aria-current={active ? "page" : undefined}>
                  {renderLink(item, linkClass, content)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {footer !== undefined && (
        <div className="mt-2 border-t border-[var(--fmf-border)] px-1 pt-2">{footer}</div>
      )}
    </nav>
  );
}

export interface TopBarProps {
  readonly title?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
}

export function TopBar({ title, children, className }: TopBarProps) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-3 border-b border-[var(--fmf-border)] bg-[var(--fmf-surface)] px-4",
        className,
      )}
    >
      {title !== undefined && (
        <div className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--fmf-text)]">
          {title}
        </div>
      )}
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}

export interface AppShellProps {
  readonly sidebar: ReactNode;
  readonly topBar?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export function AppShell({ sidebar, topBar, children, className }: AppShellProps) {
  return (
    <div
      className={cn("flex h-dvh w-full bg-[var(--fmf-canvas)] text-[var(--fmf-text)]", className)}
    >
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {topBar}
        <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
