"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { SiteSearchRecord } from "@vela/projection-data";
import { ArrowRight01Icon as ArrowRight, Search01Icon as Search } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Button } from "@vela/ui/components/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@vela/ui/components/command";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vela/ui/components/empty";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { RecordFilter } from "@/components/vela/record-filter";
import { LedgerSkeleton } from "@/components/vela/route-skeleton";
import { kindLabel, recordHeading, stateBadge } from "@/lib/product-language";
import { loadSearchIndex } from "@/lib/search-index";
import { useQueryNavigation } from "@/lib/use-query-navigation";
import { problemCollectionForPath, problemCollectionRecordLabel, type PublishedProblemCollection } from "@/lib/problem-collections";

/* One projected column, four vocabularies: a Repository row carries repository
   integrity, a Claim carries its standing, a Proposal carries its status, a
   verifier attachment carries a Verification outcome. The control is named for what
   they have in common and its options are grouped by axis; the query parameter
   stays `standing`, which is the published deep-link surface. */
const STATES = ["accepted", "contested", "pending_review", "recorded", "rejected", "retracted", "reviewed", "strict_blocked", "strict_pass", "unassessed", "verified", "withdrawn"];
/* Search documents and graph nodes now agree on `claim`. They did not: the
   graph wrote `finding`, this list offered `claim`, and the option that named
   the retired word matched nothing because the builder kept those nodes out of
   the search projection entirely. */
const KINDS = ["repository", "claim", "problem", "artifact", "proposal", "verifier_attachment", "attempt", "producer", "channel", "lease", "commit"];


export function SearchResults({ projectionRoot, searchRoot, collectionRoot, repositories, problemCollections }: { projectionRoot: string; searchRoot: string; collectionRoot: string; repositories: string[]; problemCollections: PublishedProblemCollection[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const { replace } = useQueryNavigation();
  const [result, setResult] = useState<{ key: string | null; records: SiteSearchRecord[] | null; error: string | null }>({ key: null, records: [], error: null });
  const query = params.get("q") ?? "";
  const repository = repositories.includes(params.get("repository") ?? "") ? params.get("repository")! : "all";
  const collection = problemCollections.some(({ namespace }) => namespace === params.get("collection")) ? params.get("collection")! : "all";
  const kind = KINDS.includes(params.get("kind") ?? "") ? params.get("kind")! : "all";
  const standing = STATES.includes(params.get("standing") ?? "") ? params.get("standing")! : "all";
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const hasIntent = Boolean(deferredQuery || repository !== "all" || collection !== "all" || kind !== "all" || standing !== "all");
  const queryKey = `${searchRoot}\u0000${repository}\u0000${collection}\u0000${kind}\u0000${standing}\u0000${deferredQuery}`;

  useEffect(() => {
    if (!hasIntent) {
      return;
    }
    let active = true;
    loadSearchIndex(projectionRoot, searchRoot, collectionRoot, {
      q: deferredQuery || undefined,
      repository: repository === "all" ? undefined : repository,
      collection: collection === "all" ? undefined : collection,
      kind: kind === "all" ? undefined : kind,
      standing: standing === "all" ? undefined : standing,
    }).then((index) => {
      if (active) setResult({ key: queryKey, records: index.records, error: null });
    }).catch((reason: unknown) => {
      if (active) setResult({ key: queryKey, records: null, error: reason instanceof Error ? reason.message : "Search artifact is unavailable." });
    });
    return () => { active = false; };
  }, [collection, collectionRoot, deferredQuery, repository, hasIntent, kind, projectionRoot, queryKey, searchRoot, standing]);

  const records = !hasIntent ? [] : result.key === queryKey ? result.records : null;
  const error = hasIntent && result.key === queryKey ? result.error : null;
  const exact = records?.find((record) => record.id.toLocaleLowerCase() === deferredQuery);
  const exactProblem = exact?.kind === "problem" ? problemCollectionForPath(exact.href, problemCollections) : null;
  const filtered = Boolean(query || repository !== "all" || collection !== "all" || kind !== "all" || standing !== "all");

  if (hasIntent && error) return <Alert variant="destructive"><HugeiconsIcon icon={Search} aria-hidden /><AlertTitle>Search integrity check failed</AlertTitle><AlertDescription>{error}. Published Problems remain available from their collection directories.</AlertDescription></Alert>;

  return <Command shouldFilter={false} className="vela-object-surface p-0">
    <div className="border-b bg-muted/15 p-3 sm:p-4">
      <CommandInput value={query} onValueChange={(value) => replace({ q: value || null })} placeholder="Problem, question, result, or source…" aria-label="Search Problems and Results" />
      {/* Labelled, not bare. Three `bar` triggers side by side all read `All
          repositories`/`All kinds`/`All states` truncated to `all`, so the page
          offered three identical controls and nothing said what any of them
          filtered. The `field` variant carries the label the control already
          had in its `aria-label`. */}
      {/* Each field is width-capped. The `field` variant is `w-full min-w-40`
          for a form column, and three of those stacked put the first result
          below the fold on a laptop — a filter row that costs more screen than
          the results it filters. */}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        {([
          ["Collection", collection, ["all", ...problemCollections.map(({ namespace }) => namespace)], "collection"],
          ["Repository", repository, ["all", ...repositories], "repository"],
          ["Kind", kind, ["all", ...KINDS], "kind"],
          ["State", standing, ["all", ...STATES], "standing"],
        ] as const).map(([label, value, values, param]) => (
          <div key={param} className="w-[calc(50%-0.375rem)] sm:w-44">
            <RecordFilter
              variant="field"
              label={label}
              value={value}
              values={[...values]}
              onChange={(next) => replace({ [param]: next === "all" ? null : next })}
            />
          </div>
        ))}
        {filtered ? <Button variant="ghost" size="sm" className="mb-0.5" onClick={() => replace({ q: null, repository: null, collection: null, kind: null, standing: null })}>Clear</Button> : null}
      </div>
      {exact ? <Button className="mt-3" size="sm" nativeButton={false} render={<Link href={exact.href} />}>{exactProblem?.problem ? `Open ${problemCollectionRecordLabel(exactProblem)}` : `Open exact ID ${exact.id}`}<HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button> : null}
    </div>
    {/* Relevance, not lexical order — but still not authority. The sentence
        exists because rank on a scientific record is the one place a reader
        might read position as standing, and that stays true whichever order
        produced it. */}
    <div className="border-b px-4 py-2 text-meta text-muted-foreground"><span aria-live="polite">{!hasIntent ? "Ready for a query" : records ? `${records.length.toLocaleString()} results` : "Verifying search projection…"}</span></div>
    <CommandList className="max-h-[62vh] p-1">
      {!records ? <div className="p-2"><LedgerSkeleton rows={5} /></div> : null}
      {!hasIntent ? <Empty className="min-h-56 border-0"><EmptyHeader><EmptyMedia variant="icon"><HugeiconsIcon icon={Search}  /></EmptyMedia><EmptyTitle>Find a scientific Problem or Result</EmptyTitle><EmptyDescription>Search by question, collection-local number, result, or source. Exact record filters remain available when you need them.</EmptyDescription></EmptyHeader></Empty> : null}
      {hasIntent && records ? <CommandEmpty><Empty className="border-0"><EmptyHeader><EmptyMedia variant="icon"><HugeiconsIcon icon={Search}  /></EmptyMedia><EmptyTitle>No matching records</EmptyTitle><EmptyDescription>Try a broader query or remove a filter.</EmptyDescription></EmptyHeader></Empty></CommandEmpty> : null}
      {hasIntent && records?.length ? <CommandGroup heading="Published records">{records.map((record) => {
        const heading = recordHeading(record);
        const problem = record.kind === "problem" ? problemCollectionForPath(record.href, problemCollections) : null;
        return <CommandItem key={`${record.repository}:${record.id}`} value={`${record.id} ${record.assertion}`} onSelect={() => router.push(record.href)} className="vela-object-row min-h-16 items-start rounded-md px-3 py-2.5">
          <div className="min-w-0 flex-1">
            {/* The assertion leads, rendered as mathematics. The heading used to
                be `record.id` — 76 characters of hex, the widest and least
                readable thing on a row a reader scans to choose between 22
                results — and the assertion below it printed `$2^km+1$` and
                `\cite{ErGr80}` as source, because this surface was the one
                place that did not use ScientificText. */}
            <p className="line-clamp-2 text-body leading-5 font-medium">
              {heading ? <ScientificText text={heading} /> : <span className="font-mono text-meta">{record.id}</span>}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-micro text-muted-foreground">
              <span>{problem?.problem ? problemCollectionRecordLabel(problem) : record.repository}</span>
              <span aria-hidden>·</span>
              <span>{kindLabel(record.kind)}</span>
            </div>
          </div>
          <StatusBadge {...stateBadge(record.standing, record.kind)} />
        </CommandItem>;
      })}</CommandGroup> : null}
    </CommandList>
  </Command>;
}
