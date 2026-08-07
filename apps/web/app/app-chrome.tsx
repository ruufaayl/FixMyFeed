"use client";

/**
 * Authenticated application chrome (task T101).
 *
 * Wires the framework-agnostic design-system shell to Next's router: active
 * navigation from the pathname, `next/link` for client navigation, and the
 * workspace context. Workspace data is a placeholder here; later tasks feed it
 * from the authenticated session.
 */
import { useCallback, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppShell,
  Sidebar,
  TopBar,
  WorkspaceProvider,
  WorkspaceSwitcher,
  Button,
  CommandMenu,
  useCommandShortcut,
  type Command,
  type NavSection,
  type Workspace,
} from "@fixmyfeed/ui";

const SECTIONS: NavSection[] = [
  {
    id: "product",
    items: [
      { id: "overview", label: "Overview", href: "/" },
      { id: "catalog", label: "Catalog", href: "/catalog" },
      { id: "issues", label: "Issues", href: "/issues" },
      { id: "repairs", label: "Repairs", href: "/repairs" },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    items: [
      { id: "monitoring", label: "Monitoring", href: "/monitoring" },
      { id: "reports", label: "Reports", href: "/reports" },
      { id: "integrations", label: "Integrations", href: "/integrations" },
    ],
  },
];

const WORKSPACES: Workspace[] = [{ id: "demo", name: "Demo Store", kind: "shopify" }];

function activeIdFor(pathname: string): string {
  if (pathname === "/") return "overview";
  const segment = pathname.split("/")[1] ?? "";
  return segment.length > 0 ? segment : "overview";
}

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const activeId = activeIdFor(pathname);

  const [commandOpen, setCommandOpen] = useState(false);
  const toggleCommand = useCallback(() => setCommandOpen((open) => !open), []);
  useCommandShortcut(toggleCommand);

  const commands = useMemo<Command[]>(() => {
    const navigate: Command[] = SECTIONS.flatMap((section) =>
      section.items.map((item) => ({
        id: `nav:${item.id}`,
        label: `Go to ${item.label}`,
        group: "Navigate",
        onRun: () => router.push(item.href),
      })),
    );
    const actions: Command[] = [
      {
        id: "action:scan",
        label: "Run new scan",
        group: "Actions",
        keywords: ["diagnose", "validate"],
        onRun: () => router.push("/issues"),
      },
      {
        id: "action:connect",
        label: "Connect a store",
        group: "Actions",
        onRun: () => router.push("/onboarding"),
      },
    ];
    return [...actions, ...navigate];
  }, [router]);

  const sidebar = (
    <Sidebar
      sections={SECTIONS}
      activeId={activeId}
      header={
        <div className="px-1 text-[15px] font-semibold text-[var(--fmf-text)]">FixMyFeed</div>
      }
      footer={<WorkspaceSwitcher />}
      renderLink={(item, className, children) => (
        <Link href={item.href} className={className}>
          {children}
        </Link>
      )}
    />
  );

  return (
    <WorkspaceProvider
      workspaces={WORKSPACES}
      activeWorkspaceId="demo"
      onSwitch={() => router.refresh()}
    >
      <AppShell
        sidebar={sidebar}
        topBar={
          <TopBar title="FixMyFeed">
            <Button variant="secondary" size="sm" onClick={toggleCommand}>
              Search
              <kbd className="ml-1 rounded bg-[var(--fmf-fog-100)] px-1 text-[11px] text-[var(--fmf-text-subtle)]">
                ⌘K
              </kbd>
            </Button>
          </TopBar>
        }
      >
        {children}
      </AppShell>
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} commands={commands} />
    </WorkspaceProvider>
  );
}
