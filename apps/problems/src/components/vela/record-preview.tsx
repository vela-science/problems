"use client";

import { createContext, useContext, useState } from "react";
import type { SiteSearchRecord } from "@vela/projection-data";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@vela/ui/components/hover-card";
import { LazyScientificText } from "@/components/vela/lazy-scientific-text";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { kindLabel, recordHeading, stateBadge } from "@/lib/product-language";
import { loadSearchIndex } from "@/lib/search-index";

/* What the record on the other end of a reference says.
 *
 * A cross-reference is a content address, and a content address is unreadable
 * by construction: a Proposal page names the Claim it proposes as
 * `vcl_8ef85fca44b8…`, and the only way to learn what that Claim asserts was to
 * leave the page you were reading. Every mature catalogue solves this with a
 * hover preview — GitHub over an issue reference, Hugging Face over a model —
 * and `hover-card` has been installed here with zero importers the whole time.
 *
 * Fetched on first open, never on render: a ledger row carrying three
 * references would otherwise issue three requests for cards nobody opened.
 * `loadSearchIndex` caches per URL for the session, so reopening is free.
 *
 * Progressive disclosure, not a dependency. The reference itself remains a
 * link, and nothing here is needed to follow it — `DESIGN.md` is explicit that
 * no core content may depend on hover. */
/* The root comes from the shell, not from a prop and not from a query.
 *
 * Threading it as a prop meant every record page calling
 * `projectionManifest()`, which is not memoized — a database round
 * trip on every record view to enable a hover nobody may use. Reading it from
 * the command-palette context threw outside the shell, so a page could not be
 * rendered in a test at all.
 *
 * A dedicated context with an empty default is neither: the shell always
 * provides it, and where there is no shell there is no projection identity, so
 * there is nothing a preview could honestly show. */
const ProjectionRootContext = createContext({ projectionRoot: "", searchRoot: "", collectionRoot: "" });

export function ProjectionRootProvider({ root, searchRoot, collectionRoot, children }: { root: string; searchRoot: string; collectionRoot: string; children: React.ReactNode }) {
  return <ProjectionRootContext.Provider value={{ projectionRoot: root, searchRoot, collectionRoot }}>{children}</ProjectionRootContext.Provider>;
}

export function RecordPreview({ id, children }: { id: string; children: React.ReactNode }) {
  const { projectionRoot, searchRoot, collectionRoot } = useContext(ProjectionRootContext);
  const [state, setState] = useState<{ status: "idle" | "loading" | "missing" | "error"; record?: SiteSearchRecord }>({ status: "idle" });

  const load = (open: boolean) => {
    if (!open || state.status !== "idle") return;
    setState({ status: "loading" });
    loadSearchIndex(projectionRoot, searchRoot, collectionRoot, { q: id.toLocaleLowerCase() })
      .then((index) => {
        const record = index.records.find((entry) => entry.id === id) ?? index.records[0];
        setState(record ? { status: "idle", record } : { status: "missing" });
      })
      .catch(() => setState({ status: "error" }));
  };

  /* No shell, no projection identity, no card — the reference itself is
     unchanged, which is what `DESIGN.md` requires of anything behind hover. */
  if (!projectionRoot || !searchRoot || !collectionRoot) return <>{children}</>;

  return (
    <HoverCard onOpenChange={load}>
      <HoverCardTrigger render={<span className="cursor-help underline decoration-dotted underline-offset-2" />}>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80" side="top" align="start">
        {state.record ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-micro text-muted-foreground">
              <span>{state.record.repository}</span>
              <span aria-hidden>·</span>
              <span>{kindLabel(state.record.kind)}</span>
            </div>
            <p className="mt-1.5 line-clamp-4 text-compact">
              {recordHeading(state.record)
                ? <LazyScientificText text={recordHeading(state.record)!} />
                : <span className="font-mono text-micro">{state.record.id}</span>}
            </p>
            <div className="mt-2">
              <StatusBadge {...stateBadge(state.record.standing, state.record.kind)} />
            </div>
          </>
        ) : (
          <p className="text-micro text-muted-foreground">
            {state.status === "loading" ? "Reading the exact projection…"
              : state.status === "missing" ? "No published record carries this identifier."
              : state.status === "error" ? "The search projection is unavailable."
              : "Reading the exact projection…"}
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
