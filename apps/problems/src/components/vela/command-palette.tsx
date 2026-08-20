"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Activity01Icon, BookOpen01Icon as BookOpen, Clock01Icon as Clock, CodeIcon as Code2, Database01Icon as Sources, FileCheckIcon as FileCheck2, FileSearchIcon as FileSearch, GitForkIcon as GitFork, Home01Icon, PuzzleIcon, Search01Icon as Search, Shield01Icon as ShieldCheck, Task01Icon as ListTodo, WorkIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SiteSearchRecord } from "@vela/projection-data";
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@vela/ui/components/command";
import { JUMP_DESTINATIONS, KeyboardShortcuts } from "@/components/vela/keyboard-shortcuts";
import { forgetObjects, recentObjects, type RecentObject } from "@/lib/recent-objects";
import { loadSearchIndex } from "@/lib/search-index";
import { problemCollectionForPath, problemCollectionRecordLabel, type PublishedProblemCollection } from "@/lib/problem-collections";

type PublishedRepository = { slug: string; name: string; pending: number; hasGraph: boolean };
type CommandContextValue = { open: boolean; setOpen: (open: boolean) => void };

const CommandContext = createContext<CommandContextValue | null>(null);
export const COMMAND_PALETTE_TRIGGER_ID = "vela-command-palette-trigger";
export const PRODUCT_DOCS_URL = "https://github.com/vela-science/vela/tree/main/docs";

const SEARCH_KIND_LABEL: Record<string, string> = {
  claim: "Result",
  decision: "Review decision",
  problem: "Problem",
  proposal: "Proposed change",
  source: "Source",
  verification: "Check",
};

export function useCommandPalette() {
  const value = useContext(CommandContext);
  if (!value) throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return value;
}

export function CommandPaletteProvider({
  children,
  repositories,
  problemCollections,
  projectionRoot,
  searchRoot,
  collectionRoot,
}: {
  children: React.ReactNode;
  repositories: PublishedRepository[];
  problemCollections: PublishedProblemCollection[];
  projectionRoot: string;
  searchRoot: string;
  collectionRoot: string;
}) {
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [recents, setRecents] = useState<RecentObject[]>([]);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{ query: string; records: SiteSearchRecord[]; error: boolean } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const currentSlug = pathname.match(/^\/repositories\/([^/]+)/u)?.[1];
  const currentRepository = repositories.find((repository) => repository.slug === currentSlug);

  /* ⌘K was the only key the product answered to.
   *
   * These are GitHub's bindings, because a reader arriving from a repository
   * already has them: `/` for search, `g` then a letter to go somewhere, `?`
   * for the list. Bound in one handler beside ⌘K rather than per surface, so
   * there is one place a key can be claimed twice.
   *
   * Nothing fires while a field has focus, or the `s` in a search query would
   * navigate away mid-word. `event.key` is read rather than `code`, so a
   * non-QWERTY layout gets the letter it printed. */
  useEffect(() => {
    let jumpArmed = false;
    let disarm: number | undefined;

    const typing = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return target.isContentEditable
        || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        || Boolean(target.closest("[role='dialog'],[role='combobox'],[data-slot='command-input']"));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => { if (!current) setRecents(recentObjects()); return !current; });
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;

      if (jumpArmed) {
        window.clearTimeout(disarm);
        jumpArmed = false;
        const destination = JUMP_DESTINATIONS.find((entry) => entry.key === key);
        if (destination) {
          event.preventDefault();
          router.push(destination.href);
        }
        return;
      }
      if (key === "g") {
        jumpArmed = true;
        /* A prefix that never expires would swallow the next keystroke a
           reader makes minutes later. */
        disarm = window.setTimeout(() => { jumpArmed = false; }, 1500);
        return;
      }
      if (key === "/") {
        event.preventDefault();
        setRecents(recentObjects());
        setOpen(true);
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(disarm);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [router]);

  const normalized = query.trim();

  useEffect(() => {
    if (!open || !normalized) return;

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      loadSearchIndex(projectionRoot, searchRoot, collectionRoot, { q: normalized })
        .then((index) => {
          if (!cancelled) setSearchResult({ query: normalized, records: index.records.slice(0, 12), error: false });
        })
        .catch(() => {
          if (!cancelled) setSearchResult({ query: normalized, records: [], error: true });
        });
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [collectionRoot, normalized, open, projectionRoot, searchRoot]);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    if (/^https?:/u.test(href)) window.location.assign(href);
    else router.push(href);
  }, [router]);

  const handleOpenChangeComplete = useCallback((nextOpen: boolean) => {
    if (!nextOpen) document.getElementById(COMMAND_PALETTE_TRIGGER_ID)?.focus();
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open]);
  const hasQuery = normalized.length > 0;
  const currentResult = searchResult?.query === normalized ? searchResult : null;
  const records = currentResult?.records ?? [];
  const searchError = currentResult?.error ?? false;
  const searching = hasQuery && !currentResult;

  return (
    <CommandContext.Provider value={value}>
      {children}
      <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <CommandDialog
          open={open}
          /* Every path into the palette refreshes the list, including the
             header button and the context's own `openPalette`. */
          onOpenChange={(next) => { if (next) setRecents(recentObjects()); setOpen(next); }}
          onOpenChangeComplete={handleOpenChangeComplete}
          title="Search problems.science"
          description="Find a Problem, Result, source, or page"
          className="border-border bg-popover sm:max-w-xl"
        >
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search Problems, Results, and sources…" autoFocus value={query} onValueChange={setQuery} />
            <CommandList>
              {hasQuery && records.length ? (
                <CommandGroup heading="Published results">
                  {records.map((record) => {
                    const problem = record.kind === "problem" ? problemCollectionForPath(record.href, problemCollections) : null;
                    const label = problem?.problem
                      ? problemCollectionRecordLabel(problem)
                      : SEARCH_KIND_LABEL[record.kind] ?? record.source_title ?? "Published record";
                    return (
                    <CommandItem key={`${record.repository}:${record.id}`} value={`${record.id} ${record.assertion}`} onSelect={() => navigate(record.href)}>
                      <HugeiconsIcon icon={FileSearch} aria-hidden />
                      <span className="truncate">{label} · {record.assertion}</span>
                      <CommandShortcut>{problem?.name ?? record.repository}</CommandShortcut>
                    </CommandItem>
                  );})}
                </CommandGroup>
              ) : null}
              {hasQuery ? (
                <>
                  {searching ? <p className="px-3 py-2 text-body text-muted-foreground" role="status">Searching published data…</p> : null}
                  {!searching && !searchError && records.length === 0 ? <p className="px-3 py-2 text-body text-muted-foreground" role="status">No published result matches.</p> : null}
                  {searchError ? <p className="px-3 py-2 text-body text-destructive" role="alert">Search is temporarily unavailable.</p> : null}
                  {/* Always, not only at zero results. The palette shows at
                      most twelve truncated rows out of as many as 250, and
                      offering the full view only when nothing matched left a
                      reader with a dozen hits and no way through. */}
                  {(
                    <CommandGroup heading="Continue">
                      <CommandItem value={`full search ${normalized}`} onSelect={() => navigate(`/search?q=${encodeURIComponent(normalized)}`)}><HugeiconsIcon icon={Search} aria-hidden />Open full search for “{normalized}”</CommandItem>
                    </CommandGroup>
                  )}
                </>
              ) : currentRepository ? (
                <>
                  <CommandGroup heading={`Current repository · ${currentRepository.slug}`}>
                    <CommandItem onSelect={() => navigate(`/repositories/${currentRepository.slug}`)}><HugeiconsIcon icon={GitFork} aria-hidden />Overview</CommandItem>
                    <CommandItem onSelect={() => navigate(`/repositories/${currentRepository.slug}/claims`)}><HugeiconsIcon icon={FileSearch} aria-hidden />Assertions</CommandItem>
                    <CommandItem onSelect={() => navigate(`/repositories/${currentRepository.slug}/problems`)}><HugeiconsIcon icon={ListTodo} aria-hidden />Problems</CommandItem>
                    <CommandItem onSelect={() => navigate(`/repositories/${currentRepository.slug}/contribute`)}><HugeiconsIcon icon={ListTodo} aria-hidden />Contribution handoff</CommandItem>
                    <CommandItem onSelect={() => navigate(`/repositories/${currentRepository.slug}/proposals`)}><HugeiconsIcon icon={ShieldCheck} aria-hidden />Proposed changes</CommandItem>
                    {currentRepository.hasGraph ? <CommandItem onSelect={() => navigate(`/repositories/${currentRepository.slug}/graph`)}><HugeiconsIcon icon={GitFork} aria-hidden />Evidence graph</CommandItem> : null}
                    <CommandItem onSelect={() => navigate(`/repositories/${currentRepository.slug}/reproduce`)}><HugeiconsIcon icon={FileCheck2} aria-hidden />Reproduce snapshot</CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              ) : null}
              {!hasQuery && recents.length ? (
                <>
                  {/* What you were just looking at, first — the convention every
                      reference product in AGENTS.md shares. Local only: see
                      lib/recent-objects.ts for why this never leaves the
                      browser. */}
                  <CommandGroup heading="Recently opened">
                    {recents.map((entry) => (
                      <CommandItem key={entry.href} value={`recent ${entry.title} ${entry.context ?? ""}`} onSelect={() => navigate(entry.href)}>
                        <HugeiconsIcon icon={Clock} aria-hidden />
                        <span className="truncate">{entry.title}</span>
                        {entry.context ? <CommandShortcut>{entry.context}</CommandShortcut> : null}
                      </CommandItem>
                    ))}
                    <CommandItem value="clear recently opened" onSelect={() => { forgetObjects(); setRecents([]); }}>
                      <HugeiconsIcon icon={Search} aria-hidden />
                      <span className="text-muted-foreground">Clear recently opened</span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              ) : null}
              {!hasQuery ? (
                <>
                  <CommandGroup heading="Published repositories">
                    {repositories.map((repository) => (
                      <CommandItem key={repository.slug} value={`${repository.name} ${repository.slug}`} onSelect={() => navigate(`/repositories/${repository.slug}`)}>
                        <HugeiconsIcon icon={FileSearch} aria-hidden />
                        <span>{repository.name}</span>
                        <CommandShortcut>{repository.pending} pending</CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Go to">
                    <CommandItem onSelect={() => navigate("/")}><HugeiconsIcon icon={Home01Icon} aria-hidden />Home</CommandItem>
                    <CommandItem onSelect={() => navigate("/problems")}><HugeiconsIcon icon={PuzzleIcon} aria-hidden />Problems</CommandItem>
                    <CommandItem onSelect={() => navigate("/graph")}><HugeiconsIcon icon={GitFork} aria-hidden />Research map</CommandItem>
                    {problemCollections.map((collection) => <CommandItem key={collection.namespace} onSelect={() => navigate(`/problems/${collection.namespace}`)}><HugeiconsIcon icon={PuzzleIcon} aria-hidden />{collection.name}</CommandItem>)}
                    <CommandItem onSelect={() => navigate("/contribute")}><HugeiconsIcon icon={WorkIcon} aria-hidden />Contribute</CommandItem>
                    <CommandItem onSelect={() => navigate("/updates")}><HugeiconsIcon icon={Activity01Icon} aria-hidden />Updates</CommandItem>
                    <CommandItem onSelect={() => navigate("/about")}><HugeiconsIcon icon={BookOpen} aria-hidden />About problems.science</CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Provenance">
                    <CommandItem onSelect={() => navigate("/repositories")}><HugeiconsIcon icon={GitFork} aria-hidden />Repositories</CommandItem>
                    <CommandItem onSelect={() => navigate("/sources")}><HugeiconsIcon icon={Sources} aria-hidden />Sources</CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Search">
                    <CommandItem onSelect={() => navigate("/search")}><HugeiconsIcon icon={Search} aria-hidden />Open full search</CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Reference">
                    <CommandItem onSelect={() => navigate(PRODUCT_DOCS_URL)}><HugeiconsIcon icon={BookOpen} aria-hidden />Product docs</CommandItem>
                    <CommandItem onSelect={() => navigate("https://github.com/vela-science/vela")}><HugeiconsIcon icon={Code2} aria-hidden />Source</CommandItem>
                  </CommandGroup>
                </>
              ) : null}
            </CommandList>
          </Command>
      </CommandDialog>
    </CommandContext.Provider>
  );
}
