"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, FileText, Search, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccess } from "@/lib/hooks/use-access";
import { canAccessPath } from "@/lib/navigation/route-access";
import { COMMANDS, searchCommands, type CommandGroup, type CommandItem } from "@/lib/navigation/command-registry";

const RECENT_KEY = "sms_command_recent";
const RECENT_MAX = 5;

const GROUP_ICON: Record<CommandGroup, typeof Zap> = { Actions: Zap, Pages: FileText, Settings };
const GROUP_TINT: Record<CommandGroup, string> = {
  Actions: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Pages: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Settings: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function pushRecent(id: string) {
  try {
    const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

/** Top-bar search for pages, settings and actions. `/` or Ctrl+K focuses it. */
export function CommandSearch({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const access = useAccess();
  const { role: accessRole, permissions: accessPerms } = access;

  const results = useMemo<{ title: string; items: CommandItem[] }[]>(() => {
    const allowed = (c: CommandItem) => canAccessPath(c.href, { role: accessRole, permissions: accessPerms });
    if (query.trim()) {
      const items = searchCommands(query, isAdmin, 40).filter(allowed).slice(0, 12);
      return items.length ? [{ title: "Results", items }] : [];
    }
    const recent = recentIds
      .map((id) => COMMANDS.find((c) => c.id === id))
      .filter((c): c is CommandItem => !!c && (isAdmin || !c.adminOnly) && allowed(c));
    const quick = COMMANDS.filter((c) => c.group === "Actions" && !recent.includes(c) && allowed(c)).slice(0, 6);
    return [
      ...(recent.length ? [{ title: "Recent", items: recent }] : []),
      { title: "Quick Actions", items: quick },
    ];
  }, [query, isAdmin, recentIds, accessRole, accessPerms]);

  const flat = useMemo(() => results.flatMap((g) => g.items), [results]);
  const [isNavigating, startTransition] = useTransition();
  const [pendingLabel, setPendingLabel] = useState("");

  // Prefetch what is likely to be opened so the jump is near-instant
  useEffect(() => {
    if (!open) return;
    flat.slice(0, 5).forEach((c) => router.prefetch(c.href));
  }, [open, flat, router]);
  useEffect(() => {
    const item = flat[active];
    if (open && item) router.prefetch(item.href);
  }, [open, active, flat, router]);
  const groupStart = useMemo(() => {
    const starts: number[] = [];
    let n = 0;
    for (const g of results) {
      starts.push(n);
      n += g.items.length;
    }
    return starts;
  }, [results]);

  // Global shortcuts: "/" (outside text fields) and Ctrl/Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(item: CommandItem) {
    pushRecent(item.id);
    setQuery("");
    setOpen(false);
    (document.activeElement as HTMLElement | null)?.blur();
    setPendingLabel(item.label);
    startTransition(() => router.push(item.href));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[active];
      if (item) go(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative flex-1 max-w-xs sm:max-w-md min-w-0">
      {isNavigating && (
        <>
          {/* Top progress bar while the next page loads */}
          <div className="fixed top-0 left-0 right-0 h-0.5 z-[100] overflow-hidden bg-primary/15 pointer-events-none">
            <div className="h-full w-1/3 bg-gradient-to-r from-primary via-violet-500 to-primary animate-[cmdbar_1s_ease-in-out_infinite]" />
          </div>
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full border border-border/70 bg-popover/95 backdrop-blur px-3.5 py-1.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <span className="text-xs font-semibold text-foreground">Opening {pendingLabel}</span>
          </div>
          <style>{`@keyframes cmdbar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
        </>
      )}
      <div className="relative group">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary group-focus-within:scale-110 transition-transform pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="command-search-list"
          aria-label="Search pages, settings and actions"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            setRecentIds(readRecent());
            setActive(0);
            setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder="Search pages, settings, actions..."
          className="w-full rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/8 pl-8 pr-3 sm:pr-9 py-1.5 text-base sm:text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-background transition-all shadow-xs placeholder:text-muted-foreground/75"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center pointer-events-none">
          <kbd className="rounded border border-primary/20 bg-background/80 px-1 py-0.2 text-[9px] font-mono text-muted-foreground shadow-2xs">
            /
          </kbd>
        </div>
      </div>

      {open && (
        <div
          ref={listRef}
          id="command-search-list"
          role="listbox"
          // Keep focus in the input so clicks register before blur closes the list
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 sm:right-auto sm:w-[26rem] mt-1.5 max-h-[60vh] overflow-y-auto rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-xl z-50 p-1.5"
        >
          {flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No matches</p>
          ) : (
            results.map((g, gi) => (
              <div key={g.title} className="py-1">
                <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  {g.title === "Recent" && <Clock className="h-3 w-3" />}
                  {g.title}
                </p>
                {g.items.map((item, ii) => {
                  const i = groupStart[gi] + ii;
                  const Icon = GROUP_ICON[item.group];
                  const isActive = i === active;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-index={i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left cursor-pointer transition-colors",
                        isActive ? "bg-primary/10" : "hover:bg-muted/60"
                      )}
                    >
                      <span className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", GROUP_TINT[item.group])}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate">{item.label}</span>
                      <span className="text-[10px] font-medium text-muted-foreground shrink-0">{item.group === "Actions" ? "Action" : item.group === "Pages" ? "Page" : "Setting"}</span>
                      {isActive && <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
