"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowRight01Icon as ArrowRight, GitForkIcon as GitFork, Search01Icon as Search, SlidersHorizontalIcon as SlidersHorizontal } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { GraphLens } from "@vela/projection-data/read-contracts";
import type { GraphResponse } from "@/lib/graph-client";
import { loadGraph, orderGraphNodesForLedger } from "@/lib/graph-client";
import { RecordFilter } from "@/components/vela/record-filter";
import { kindLabel, stateBadge } from "@/lib/product-language";
import { useQueryNavigation } from "@/lib/use-query-navigation";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Button } from "@vela/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@vela/ui/components/collapsible";
import { Field, FieldLabel } from "@vela/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@vela/ui/components/input-group";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { Pagination, PaginationContent, PaginationItem } from "@vela/ui/components/pagination";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@vela/ui/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@vela/ui/components/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@vela/ui/components/table";
import { ToggleGroup, ToggleGroupItem } from "@vela/ui/components/toggle-group";

const loadSigmaMap = () => import("@/components/vela/sigma-map").then((module) => module.SigmaMap);
const SigmaMap = dynamic(loadSigmaMap, {
  ssr: false,
  loading: () => <div className="grid min-h-[32rem] place-items-center text-body text-muted-foreground">Preparing rooted map…</div>,
});

const lensKinds: Record<GraphLens, string[]> = {
  research: ["all", "problem", "claim", "artifact", "proposal", "verifier_attachment"],
  activity: ["all", "attempt", "producer", "channel", "lease", "commit", "intake", "scout"],
  all: ["all"],
};

function sentenceCase(value: string) {
  const normalized = value.replaceAll("_", " ");
  return normalized ? `${normalized[0].toUpperCase()}${normalized.slice(1)}` : "";
}

function nodeTitle(node: NonNullable<GraphResponse>["nodes"][number]) {
  const state = node.standing ? sentenceCase(node.standing) : "";
  if (node.kind === "claim") return `${state || "Research"} Result`;
  if (node.kind === "proposal") return `${state || "Proposed"} change`;
  if (node.kind === "verifier_attachment") return `${state || "Scoped"} check`;
  if (node.kind === "artifact" && node.label.length > 72) return "Research artifact";
  return node.label || kindLabel(node.kind);
}

/* One ledger, four vocabularies: `graph_nodes.standing` is written from
   whichever axis the node came from — a Proposal status for a Proposal, Claim
   standing for a Claim, a Verification outcome for a verifier attachment — so
   the column and its filter are named for what those have in common and each
   row carries its own axis. The `standing` query parameter is unchanged; it is
   the published deep-link surface. */

export function RepositoryGraph({ root, initialRepository, repositories, scoped = false }: { root: string; initialRepository: string; repositories: string[]; scoped?: boolean }) {
  const params = useSearchParams();
  const { push, replace } = useQueryNavigation();
  const repository = repositories.includes(params.get("repository") ?? "") ? params.get("repository")! : initialRepository;
  const lens = (["research", "activity", "all"].includes(params.get("lens") ?? "") ? params.get("lens") : "research") as GraphLens;
  const kind = lensKinds[lens].includes(params.get("kind") ?? "") ? params.get("kind") ?? "all" : "all";
  const relation = params.get("relation") ?? "";
  const trust = params.get("trust") ?? "";
  const standing = params.get("standing") ?? "";
  const q = params.get("q") ?? "";
  const selectedId = params.get("node");
  const explicitView = params.get("view");
  const view = explicitView === "map" || explicitView === "records" ? explicitView : "map";
  useEffect(() => {
    if (view === "map" && selectedId) void loadSigmaMap();
  }, [selectedId, view]);
  const deferredQuery = useDeferredValue(q);
  const requestKey = [
    root,
    repository,
    view,
    lens,
    kind,
    relation,
    trust,
    standing,
    deferredQuery,
    selectedId ?? "",
  ].join("\u0000");
  const [response, setResponse] = useState<{ key: string; value: GraphResponse } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    loadGraph({ root, repository, view: view === "map" && selectedId ? "canvas" : "ledger", lens, kind: kind === "all" ? undefined : kind, relation: relation || undefined, trust: trust || undefined, standing: standing || undefined, q: deferredQuery || undefined, node: selectedId ?? undefined })
      .then((next) => { if (active) { setResponse({ key: requestKey, value: next }); setError(null); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Graph projection is unavailable."); });
    return () => { active = false; };
  }, [deferredQuery, repository, kind, lens, relation, requestKey, root, selectedId, standing, trust, view]);

  const data = response?.key === requestKey ? response.value : null;
  const relations = useMemo(() => [...new Set(data?.edges.map((edge) => edge.relation) ?? [])].sort(), [data]);
  const trusts = useMemo(() => [...new Set(data?.nodes.map((node) => node.trust).filter((value): value is string => Boolean(value)) ?? [])].sort(), [data]);
  const standings = useMemo(() => [...new Set(data?.nodes.map((node) => node.standing) ?? [])].sort(), [data]);
  const selected = selectedId && data?.selected?.id === selectedId ? data.selected : null;
  const choose = useCallback((id: string) => push({ node: id }), [push]);
  const pageSize = 100;
  const requestedPage = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const orderedNodes = useMemo(() => orderGraphNodesForLedger(data?.nodes ?? []), [data]);
  const pages = Math.max(1, Math.ceil(orderedNodes.length / pageSize));
  const page = Math.min(requestedPage, pages);
  const ledger = orderedNodes.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <div className="border-b p-4">
        <div className={scoped ? "hidden gap-3 md:grid lg:grid-cols-[minmax(16rem,1fr)_repeat(2,minmax(9rem,.5fr))]" : "hidden gap-3 md:grid lg:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(9rem,.5fr))]"}>
          <Field><FieldLabel htmlFor="graph-query">Find a node</FieldLabel><InputGroup><InputGroupAddon><HugeiconsIcon icon={Search} aria-hidden /></InputGroupAddon><InputGroupInput id="graph-query" type="search" value={q} onChange={(event) => replace({ q: event.target.value || null, node: null, page: null })} placeholder="ID or label" /></InputGroup></Field>
          {scoped ? null : <RecordFilter variant="field" label="Repository" value={repository} values={repositories} onChange={(value) => replace({ repository: value, node: null, page: null })} />}
          <RecordFilter variant="field" label="Kind" value={kind} values={lensKinds[lens]} onChange={(value) => replace({ kind: value === "all" ? null : value, node: null, page: null })} />
          <RecordFilter variant="field" label="State" value={standing || "all"} values={["all", ...standings]} onChange={(value) => replace({ standing: value === "all" ? null : value, node: null, page: null })} />
        </div>
        <div className="mt-3 hidden flex-wrap items-center gap-3 md:flex">
          <ToggleGroup value={[lens]} onValueChange={(values) => { const next = values.at(-1) as GraphLens | undefined; if (next) replace({ lens: next === "research" ? null : next, kind: null, node: null, page: null }); }} aria-label="Graph lens">
            <ToggleGroupItem value="research" size="sm">Research</ToggleGroupItem><ToggleGroupItem value="activity" size="sm">Operational provenance</ToggleGroupItem><ToggleGroupItem value="all" size="sm">All</ToggleGroupItem>
          </ToggleGroup>
          <Collapsible className="min-w-0"><CollapsibleTrigger className="flex min-h-8 items-center gap-2 rounded-lg px-2.5 text-compact font-medium hover:bg-muted"><HugeiconsIcon icon={SlidersHorizontal} aria-hidden className="size-4" />Advanced filters{relation || trust ? <StatusBadge tone="evidence">active</StatusBadge> : null}</CollapsibleTrigger><CollapsibleContent className="mt-3 flex flex-wrap gap-3 rounded-lg border p-3"><RecordFilter variant="field" label="Relation" value={relation || "all"} values={["all", ...relations]} onChange={(value) => replace({ relation: value === "all" ? null : value, page: null })} /><RecordFilter variant="field" label="Trust" value={trust || "all"} values={["all", ...trusts]} onChange={(value) => replace({ trust: value === "all" ? null : value, node: null, page: null })} /></CollapsibleContent></Collapsible>
        </div>
        <div className="md:hidden">
          <Field><FieldLabel htmlFor="graph-query-mobile">Find a node</FieldLabel><InputGroup><InputGroupAddon><HugeiconsIcon icon={Search} aria-hidden /></InputGroupAddon><InputGroupInput id="graph-query-mobile" type="search" value={q} onChange={(event) => replace({ q: event.target.value || null, node: null, page: null })} placeholder="ID or label" /></InputGroup></Field>
          <Collapsible className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ToggleGroup value={[lens]} onValueChange={(values) => { const next = values.at(-1) as GraphLens | undefined; if (next) replace({ lens: next === "research" ? null : next, kind: null, node: null, page: null }); }} aria-label="Graph lens"><ToggleGroupItem value="research" size="sm">Research</ToggleGroupItem><ToggleGroupItem value="activity" size="sm">Operational provenance</ToggleGroupItem><ToggleGroupItem value="all" size="sm">All</ToggleGroupItem></ToggleGroup>
              <CollapsibleTrigger className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-compact font-medium"><HugeiconsIcon icon={SlidersHorizontal} aria-hidden className="size-4" />Filters{kind !== "all" || standing || relation || trust ? <StatusBadge tone="evidence">active</StatusBadge> : null}</CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-3 grid gap-3 rounded-lg border p-3 sm:grid-cols-2">{scoped ? null : <RecordFilter variant="field" label="Repository" value={repository} values={repositories} onChange={(value) => replace({ repository: value, node: null, page: null })} />}<RecordFilter variant="field" label="Kind" value={kind} values={lensKinds[lens]} onChange={(value) => replace({ kind: value === "all" ? null : value, node: null, page: null })} /><RecordFilter variant="field" label="State" value={standing || "all"} values={["all", ...standings]} onChange={(value) => replace({ standing: value === "all" ? null : value, node: null, page: null })} /><RecordFilter variant="field" label="Relation" value={relation || "all"} values={["all", ...relations]} onChange={(value) => replace({ relation: value === "all" ? null : value, page: null })} /><RecordFilter variant="field" label="Trust" value={trust || "all"} values={["all", ...trusts]} onChange={(value) => replace({ trust: value === "all" ? null : value, node: null, page: null })} /></CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {error ? <Alert variant="destructive" className="m-4"><HugeiconsIcon icon={GitFork} aria-hidden /><AlertTitle>Graph integrity check failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      <Tabs value={view} onValueChange={(next) => push({ view: next })} className="gap-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"><p className="text-meta text-muted-foreground" aria-live="polite">{data ? view === "map" ? selectedId ? `${data.total.toLocaleString()} items · ${data.edges.length.toLocaleString()} exact relationships` : `${data.total.toLocaleString()} items · choose one to map` : `${data.total.toLocaleString()} items` : "Loading relationships…"}</p><TabsList><TabsTrigger value="map">Map</TabsTrigger><TabsTrigger value="records">List</TabsTrigger></TabsList></div>
        <TabsContent value="map" className="m-0"><div className="min-h-[34rem] overflow-hidden bg-muted/20">{!selectedId ? <GraphMapChooser records={orderedNodes.slice(0, 24)} choose={choose} /> : data ? <SigmaMap nodes={data.nodes} edges={data.edges} selected={selected?.id ?? null} onSelect={choose} /> : <div className="grid min-h-[34rem] place-items-center text-body text-muted-foreground">Loading direct relationships…</div>}</div></TabsContent>
        <TabsContent value="records" className="m-0 p-4"><GraphRecords records={ledger} choose={choose} /><GraphPagination page={page} pages={pages} replace={replace} /></TabsContent>
      </Tabs>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) push({ node: null }); }}>
        {selected ? <SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader className="border-b pr-12"><div className="flex min-w-0 flex-wrap items-center gap-2"><SheetTitle className="min-w-0 text-body">{nodeTitle(selected)}</SheetTitle><StatusBadge {...stateBadge(selected.standing, selected.kind)} /></div><SheetDescription className="line-clamp-3">{selected.label}</SheetDescription></SheetHeader><div className="space-y-6 p-4">{data?.neighbors.length ? <section><h3 className="mb-3 text-subtitle">Direct relationships</h3><ItemGroup className="divide-y">{data.neighbors.slice(0, 12).map((neighbor) => <Item key={`${neighbor.relation}:${neighbor.id}`} size="sm" className="min-w-0 rounded-none px-0 py-3" render={<button type="button" onClick={() => choose(neighbor.id)} />}><ItemContent className="min-w-0"><ItemTitle className="line-clamp-1 text-compact">{nodeTitle(neighbor)}</ItemTitle><ItemDescription className="line-clamp-2">{neighbor.relation} · {neighbor.label}</ItemDescription></ItemContent></Item>)}</ItemGroup>{data.neighbor_total > 12 ? <p className="mt-3 text-meta text-muted-foreground">{data.neighbor_total - 12} more direct relationships</p> : null}</section> : null}<details className="rounded-lg border px-3 py-2 text-meta"><summary className="cursor-pointer font-medium">Technical identity</summary><p className="mt-2 text-muted-foreground">{kindLabel(selected.kind)}</p><p className="mt-1 break-all font-mono text-micro">{selected.id}</p></details>{selected.href ? <Button nativeButton={false} render={<Link href={selected.href} />}>Open {kindLabel(selected.kind)} <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button> : <p className="text-meta text-muted-foreground">No separate public page.</p>}</div></SheetContent> : null}
      </Sheet>
    </div>
  );
}

function GraphRecords({ records, choose }: { records: NonNullable<GraphResponse>["nodes"]; choose: (id: string) => void }) {
  return <><div className="hidden overflow-hidden rounded-lg border md:block"><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="w-40">Kind</TableHead><TableHead className="w-36">State</TableHead><TableHead className="w-24"><span className="sr-only">Action</span></TableHead></TableRow></TableHeader><TableBody>{records.map((node) => <TableRow key={node.id}><TableCell className="max-w-3xl whitespace-normal align-top"><Button type="button" variant="link" onClick={() => choose(node.id)} aria-label={`Inspect ${nodeTitle(node)}`} className="h-auto min-h-0 justify-start p-0 text-left text-body leading-5 text-foreground">{nodeTitle(node)}</Button>{node.label !== nodeTitle(node) ? <p className="mt-1 line-clamp-2 text-meta text-muted-foreground">{node.label}</p> : null}<p className="mt-1 truncate font-mono text-micro text-muted-foreground">{node.id}</p></TableCell><TableCell className="align-top text-meta text-muted-foreground">{kindLabel(node.kind)}</TableCell><TableCell className="align-top"><StatusBadge {...stateBadge(node.standing, node.kind)} /></TableCell><TableCell className="align-top">{node.href ? <Button nativeButton={false} variant="ghost" size="sm" render={<Link href={node.href} />}>Open <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button> : null}</TableCell></TableRow>)}</TableBody></Table></div><ItemGroup className="divide-y md:hidden">{records.map((node) => <Item key={node.id} className="min-w-0 items-start rounded-none px-0 py-3"><ItemContent className="min-w-0"><Button type="button" variant="link" onClick={() => choose(node.id)} aria-label={`Inspect ${nodeTitle(node)}`} className="h-auto min-h-0 min-w-0 justify-start p-0 text-left"><ItemTitle className="line-clamp-1 text-compact leading-5">{nodeTitle(node)}</ItemTitle></Button><ItemDescription className="line-clamp-2">{node.label !== nodeTitle(node) ? node.label : kindLabel(node.kind)}</ItemDescription></ItemContent><StatusBadge {...stateBadge(node.standing, node.kind)} /></Item>)}</ItemGroup></>;
}

function GraphMapChooser({ records, choose }: { records: NonNullable<GraphResponse>["nodes"]; choose: (id: string) => void }) {
  return <div className="grid min-h-[34rem] md:grid-cols-[24rem_minmax(0,1fr)]"><div className="border-b bg-background p-4 md:border-b-0 md:border-r"><h2 className="text-subtitle">Choose an item</h2><ItemGroup className="mt-3 divide-y">{records.slice(0, 10).map((node) => <Item key={node.id} size="sm" className="min-w-0 rounded-none px-0 py-3" render={<button type="button" onClick={() => choose(node.id)} />}><ItemContent className="min-w-0"><ItemTitle className="line-clamp-1 text-compact">{nodeTitle(node)}</ItemTitle><ItemDescription className="line-clamp-2">{node.label !== nodeTitle(node) ? node.label : kindLabel(node.kind)}</ItemDescription></ItemContent><StatusBadge {...stateBadge(node.standing, node.kind)} /></Item>)}</ItemGroup></div><div className="grid min-h-72 place-items-center bg-[color:color-mix(in_oklab,var(--vela-cobalt-soft)_55%,var(--background))] p-8 text-center"><div><HugeiconsIcon icon={GitFork} aria-hidden className="mx-auto size-9 text-primary" /><h2 className="mt-4 text-title">Open an exact neighbourhood</h2><p className="mt-2 max-w-md text-compact text-muted-foreground">Select a Problem, Result, source, or check. The map draws only retained relationships.</p></div></div></div>;
}

function GraphPagination({ page, pages, replace }: { page: number; pages: number; replace: (updates: Record<string, string | null>) => void }) {
  if (pages <= 1) return null;
  return <Pagination className="mt-4"><PaginationContent><PaginationItem><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => replace({ page: String(page - 1) })}>Previous</Button></PaginationItem><PaginationItem><span className="px-2 font-mono text-meta text-muted-foreground">{page} / {pages}</span></PaginationItem><PaginationItem><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => replace({ page: String(page + 1) })}>Next</Button></PaginationItem></PaginationContent></Pagination>;
}
