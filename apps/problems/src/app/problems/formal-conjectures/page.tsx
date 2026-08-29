import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon, CodeIcon, GitBranchIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formalConjecturesCollection } from "@vela/projection-data";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Input } from "@vela/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@vela/ui/components/select";
import { PageHero, PageSection, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { Disclosure } from "@/components/vela/disclosure";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@vela/ui/components/item";
import { structuredDataScript } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Formal Conjectures",
  description: "Browse a rights-reviewed subset of exact research-open Formal Conjectures declarations.",
  alternates: { canonical: "/problems/formal-conjectures" },
};

type Query = { q?: string; family?: string };
const families = [...new Set(formalConjecturesCollection.data.items.map(({ source_family }) => source_family))].sort();

/* A group is context only when it says something the title has not. Several
   occurrences are the sole member of a group named after them, so appending it
   unconditionally rendered "Oppermann's Conjecture · Oppermann.oppermann_conjecture
   · Oppermann's Conjecture" — the row's own title, printed twice, two fields
   apart. */
function groupTitle(item: { group_id?: string | null; title: string }) {
  const title = formalConjecturesCollection.data.groups.find(({ id }) => id === item.group_id)?.title;
  return title && title !== item.title ? title : null;
}

export default async function FormalConjecturesPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const q = (query.q ?? "").trim().slice(0, 256);
  const family = families.find((value) => value === query.family) ?? "all";
  const terms = q.toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  const items = formalConjecturesCollection.data.items.filter((item) => {
    if (family !== "all" && item.source_family !== family) return false;
    const text = `${item.title} ${item.question} ${item.declaration} ${item.source_family} ${item.upstream_identity?.id ?? ""}`.toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
  const structuredData = { "@context": "https://schema.org", "@type": "CollectionPage", name: formalConjecturesCollection.name, url: "https://problems.science/problems/formal-conjectures", numberOfItems: formalConjecturesCollection.data.items.length, isPartOf: { "@type": "CollectionPage", name: "Problems", url: "https://problems.science/problems" } };

  return <PageShell archetype="problem">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredDataScript(structuredData) }} />
    <PageHero density="compact" className="vela-route-hero grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
      <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-display">Formal Conjectures</h1><Badge variant="secondary">Published subset · 7</Badge><Button nativeButton={false} size="sm" variant="outline" render={<Link href="/problems/formal-conjectures/frontier" />}>Open the Frontier</Button></div><p className="mt-3 max-w-3xl text-body text-muted-foreground">Exact formalized conjecture occurrences from the upstream repository. This release includes seven rights-reviewed <span className="font-medium text-foreground">research open</span> declarations; it is not the whole repository.</p><div className="mt-5 flex flex-wrap gap-3"><Button nativeButton={false} render={<a href={formalConjecturesCollection.source_snapshot.repository} />}>Open upstream repository <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden data-icon="inline-end" /></Button><Button nativeButton={false} variant="outline" render={<Link href="/contribute" />}>Add a Result</Button></div></div>
      {/* The Frontier is the most actionable page in the product — 2,012 theorems
          whose only hole is the proof, typed from exact state — and nothing
          linked to it. Zero inbound links from Home, from /problems, or from
          here, its own collection: it was reachable by typing the URL. */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border text-meta"><div className="bg-card p-4"><dt className="text-muted-foreground">Lean toolchain</dt><dd className="mt-1 font-mono text-micro">{formalConjecturesCollection.source_snapshot.lean_toolchain.replace("leanprover/lean4:", "")}</dd></div><div className="bg-card p-4"><dt className="text-muted-foreground">Source families</dt><dd className="mt-1 font-medium">{families.length}</dd></div><div className="col-span-2 bg-card p-4"><dt className="text-muted-foreground">Exact revision</dt><dd className="mt-1 font-mono text-micro">{formalConjecturesCollection.source_snapshot.commit.slice(0, 12)}</dd></div></dl>
    </PageHero>
    <PageSection aria-labelledby="formal-conjecture-list" className="pt-6">
      <form className="vela-object-surface flex flex-col gap-3 p-3 sm:flex-row sm:items-end" action="/problems/formal-conjectures" method="get">
        <label className="min-w-0 flex-1"><span className="sr-only">Search Formal Conjectures</span><div className="relative"><HugeiconsIcon icon={Search01Icon} aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={q} className="pl-9" placeholder="Question, declaration, OEIS, or MathOverflow ID…" /></div></label>
        <label className="w-full sm:w-48"><span className="sr-only">Source family</span><Select name="family" defaultValue={family} items={Object.fromEntries([["all", "All source families"], ...families.map((value) => [value, value])])}><SelectTrigger aria-label="Source family" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All source families</SelectItem>{families.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></label>
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3 border-b pb-2"><h2 id="formal-conjecture-list" className="text-label">Formalized conjecture occurrences</h2><p className="text-meta text-muted-foreground">{items.length} of {formalConjecturesCollection.data.items.length}</p></div>
      {items.length ? <ul className="divide-y">{items.map((item) => <li key={item.route_slug}>
        <Item className="vela-object-row gap-3 rounded-none px-2 py-4" render={<Link href={`/problems/formal-conjectures/${item.route_slug}`} />}>
          <ItemContent>
            <ItemTitle className="line-clamp-none block max-w-[78ch] text-compact font-medium leading-6 group-hover/item:text-primary"><ScientificText text={item.title} /></ItemTitle>
            <ItemDescription className="line-clamp-none flex flex-wrap gap-x-2 gap-y-1 text-meta"><span className="font-mono text-micro">{item.declaration}</span>{groupTitle(item) ? <><span aria-hidden>·</span><span>{groupTitle(item)}</span></> : null}</ItemDescription>
          </ItemContent>
          {/* Fixed bases keep the two aligned columns the grid template gave. */}
          <ItemActions className="text-meta sm:w-36 sm:justify-start">{item.source_family}</ItemActions>
          <ItemActions className="gap-1.5 text-meta sm:w-32 sm:justify-start"><span aria-hidden className="size-1.5 rounded-full bg-status-caution" />Research open</ItemActions>
          <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/item:translate-x-0.5 group-hover/item:text-primary" />
        </Item>
      </li>)}</ul> : <div className="py-12 text-center"><HugeiconsIcon icon={CodeIcon} aria-hidden className="mx-auto size-6 text-muted-foreground" /><h2 className="mt-3 text-title">No formalized conjectures match</h2><p className="mt-1 text-body text-muted-foreground">Clear the filters or try a declaration or source-family name.</p><Button className="mt-4" variant="outline" nativeButton={false} render={<Link href="/problems/formal-conjectures" />}>Clear filters</Button></div>}
    </PageSection>
    <PageSection aria-labelledby="collection-boundary" className="border-t pt-5"><div className="flex gap-3"><HugeiconsIcon icon={GitBranchIcon} aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" /><div><h2 id="collection-boundary" className="text-label">Published subset boundary</h2><p className="mt-1 max-w-3xl text-meta text-muted-foreground">{formalConjecturesCollection.selection_policy.exclusions} Source categories and GitHub review status remain attributed upstream facts; they do not establish Vela scientific state.</p><Disclosure className="mt-3 text-micro" summaryClassName="font-medium" summary="Exact collection identity"><dl className="mt-2 space-y-2 text-muted-foreground"><div><dt>Source commit</dt><dd className="break-all font-mono">{formalConjecturesCollection.source_snapshot.commit}</dd></div><div><dt>Collection root</dt><dd className="break-all font-mono">{formalConjecturesCollection.roots.collection_root}</dd></div></dl></Disclosure></div></div></PageSection>
  </PageShell>;
}
