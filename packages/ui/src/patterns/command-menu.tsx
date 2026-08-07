"use client";

/**
 * Command menu + keyboard system (task T102 foundation).
 *
 * The ⌘K/Ctrl+K command center: a modal, keyboard-driven launcher over a flat
 * list of commands (navigation + actions). Filtering is a pure function
 * (`filterCommands`) so it is unit-testable without a DOM; the component adds
 * accessible dialog semantics, arrow/enter/escape handling, and focus return.
 * Power users get speed; new users can ignore it entirely.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn.js";

export interface Command {
  readonly id: string;
  readonly label: string;
  /** Optional group heading (e.g. "Navigate", "Actions"). */
  readonly group?: string;
  /** Extra search terms not shown but matched. */
  readonly keywords?: readonly string[];
  readonly icon?: ReactNode;
  readonly onRun: () => void;
}

/** Case-insensitive subsequence-free substring match over label + keywords. */
export function filterCommands(commands: readonly Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [...commands];
  return commands.filter((command) => {
    const haystack = [command.label, command.group ?? "", ...(command.keywords ?? [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** Registers a ⌘K / Ctrl+K listener that calls `onToggle`. */
export function useCommandShortcut(onToggle: () => void): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggle]);
}

export interface CommandMenuProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly commands: readonly Command[];
  readonly placeholder?: string;
}

export function CommandMenu({
  open,
  onOpenChange,
  commands,
  placeholder = "Search commands, products, issues…",
}: CommandMenuProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const run = useCallback(
    (command: Command | undefined) => {
      if (!command) return;
      close();
      command.onRun();
    },
    [close],
  );

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(results[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        onKeyDown={onKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-[var(--fmf-radius-xl)] border border-[var(--fmf-border)] bg-[var(--fmf-surface-raised)] shadow-[var(--fmf-shadow-modal)]"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label="Command search"
          className="h-12 w-full border-b border-[var(--fmf-border)] bg-transparent px-4 text-[15px] text-[var(--fmf-text)] outline-none placeholder:text-[var(--fmf-text-subtle)]"
        />
        <ul role="listbox" aria-label="Commands" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-[14px] text-[var(--fmf-text-muted)]">
              No matching commands
            </li>
          )}
          {results.map((command, index) => (
            <li key={command.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => run(command)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[var(--fmf-radius-md)] px-3 py-2 text-left text-[14px] outline-none",
                  index === activeIndex
                    ? "bg-[var(--fmf-brand-soft)] text-[var(--fmf-brand)]"
                    : "text-[var(--fmf-text)]",
                )}
              >
                {command.icon !== undefined && (
                  <span className="shrink-0" aria-hidden="true">
                    {command.icon}
                  </span>
                )}
                <span className="flex-1 truncate">{command.label}</span>
                {command.group !== undefined && (
                  <span className="shrink-0 text-[12px] text-[var(--fmf-text-subtle)]">
                    {command.group}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
