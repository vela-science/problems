import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon, CodeIcon, Folder01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formalConjecturesCollection } from "@vela/projection-data";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Input } from "@vela/ui/components/input";
import { PageHero, PageSection, PageSectionHeader, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { ProblemQuestionRow } from "@/components/vela/problem-question-row";
import { discoveredProblems, problemDiscoveryCollections, problemStatePreviews } from "@/lib/scientific-state";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@vela/ui/components/item";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Problems", description: "Browse published scientific Problem collections and formalized conjecture occurrences.", alternates: { canonical: "/problems" } };

export default async function ProblemsPage(props?: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  void props;
  const catalog = await discoveredProblems();
  const erdos = problemDiscoveryCollections(catalog).find(({ key }) => key === "erdos-problems");
  const assessed = catalog.filter(({ record }) => record.local_standing);
  const open = catalog.filter(({ record }) => record.declared_status === "open" && !record.local_standing);
  const previews = await problemStatePreviews([...assessed, ...open].slice(0, 3));
  const erdosCount = erdos?.problemCount ?? catalog.length;
  const fcCount = formalConjecturesCollection.data.items.length;
  const collections = [
    { name: "Erdős Problems", href: "/problems/erdos-problems", count: erdosCount, icon: Folder01Icon, description: "The source-owned Erdős problem catalogue, with status, evidence, Results, and retained formalizations.", /* The chooser's job is to say what is behind each door. "1,217 numbered
       Problems" invites the reading that 1,217 of them hold something. */
    detail: `${erdosCount.toLocaleString()} numbered · ${assessed.length} with reviewed evidence` },
    { name: "Formal Conjectures", href: "/problems/formal-conjectures", count: fcCount, icon: CodeIcon, description: "A bounded rights-reviewed subset of exact research-open Lean declaration occurrences from the upstream collection.", detail: `${fcCount} published formalizations` },
  ];
  const structuredData = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Problems", url: "https://problems.science/problems", numberOfItems: collections.length, hasPart: collections.map((collection) => ({ "@type": "CollectionPage", name: collection.name, url: `https://problems.science${collection.href}`, numberOfItems: collection.count })) };

  return <PageShell archetype="problem">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <PageHero density="compact" className="vela-product-hero grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.42fr)] lg:items-end">
      <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-display">Problems</h1><Badge variant="secondary">2 published collections</Badge></div><p className="mt-3 max-w-2xl text-body text-muted-foreground">Find a scientific question, inspect what is known, and follow its exact sources and Results.</p></div>
      <form action="/search" className="vela-object-surface flex items-center gap-2 p-2"><label className="relative min-w-0 flex-1"><span className="sr-only">Search all Problems</span><HugeiconsIcon icon={Search01Icon} aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" className="h-11 border-0 bg-transparent pl-9 shadow-none" placeholder="Search across collections…" /></label><Button type="submit">Search</Button></form>
    </PageHero>
    <PageSection aria-labelledby="published-collections" className="pt-6">
      <PageSectionHeader><div><h2 id="published-collections" className="text-title">Published collections</h2><p className="mt-1 text-meta text-muted-foreground">Collection names qualify local identifiers; inclusion does not determine scientific truth.</p></div></PageSectionHeader>
      <div className="mt-3 overflow-hidden rounded-lg border bg-card"><ul className="divide-y">{collections.map((collection) => <li key={collection.href}><Item className="vela-object-row gap-4 rounded-none px-4 py-5" render={<Link href={collection.href} />}><ItemMedia className="size-10 rounded-md bg-primary/10 text-primary"><HugeiconsIcon icon={collection.icon} aria-hidden className="size-5" /></ItemMedia><ItemContent><ItemTitle className="line-clamp-none block text-title group-hover/item:text-primary">{collection.name}</ItemTitle><ItemDescription className="max-w-3xl text-meta">{collection.description}</ItemDescription></ItemContent>{/* A fixed basis, not a flex gap: the detail keeps the aligned column the
    grid template used to give it, so it starts at the same x on every row. */}<ItemActions className="text-meta font-medium sm:w-44 sm:justify-start">{collection.detail}</ItemActions><HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/item:translate-x-0.5 group-hover/item:text-primary" /></Item></li>)}</ul></div>
    </PageSection>
    <PageSection aria-labelledby="problems-to-explore">
      <PageSectionHeader><div><h2 id="problems-to-explore" className="text-title">Problems to explore</h2><p className="mt-1 text-meta text-muted-foreground">Recognizable starting points from both published collections.</p></div><Link href="/search?kind=problem" className="inline-flex min-h-6 items-center text-meta font-medium text-primary hover:underline">Search all Problems</Link></PageSectionHeader>
      <div className="mt-2 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="erdos-starting-points"><div className="flex items-center justify-between border-b pb-2"><h3 id="erdos-starting-points" className="text-label">Erdős Problems</h3><Link href="/problems/erdos-problems" className="inline-flex min-h-6 items-center text-meta text-muted-foreground hover:text-foreground">Browse {erdosCount.toLocaleString()}</Link></div><ul className="divide-y">{previews.map(({ discovery, state }) => <ProblemQuestionRow key={discovery.problem} state={state} number={discovery.problem} collectionLabel="Erdős problem" href={discovery.canonicalPath ?? "/problems/erdos-problems"} />)}</ul></section>
        <section aria-labelledby="fc-starting-points"><div className="flex items-center justify-between border-b pb-2"><h3 id="fc-starting-points" className="text-label">Formal Conjectures</h3><Link href="/problems/formal-conjectures" className="inline-flex min-h-6 items-center text-meta text-muted-foreground hover:text-foreground">Browse {fcCount}</Link></div><ul className="divide-y">{formalConjecturesCollection.data.items.slice(0, 3).map((item) => <li key={item.route_slug}><Item className="vela-object-row gap-4 rounded-none px-2 py-4" render={<Link href={`/problems/formal-conjectures/${item.route_slug}`} />}><ItemMedia aria-hidden className="size-8 rounded-md bg-primary/10 text-primary"><HugeiconsIcon aria-hidden icon={CodeIcon} className="size-4" /></ItemMedia><ItemContent><ItemTitle className="line-clamp-none block text-compact font-medium leading-6 group-hover/item:text-primary"><ScientificText text={item.title} /></ItemTitle><ItemDescription className="text-meta">{item.source_family} · formalized occurrence</ItemDescription></ItemContent><ItemActions className="self-start"><HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="mt-1 size-4 text-muted-foreground" /></ItemActions></Item></li>)}</ul></section>
      </div>
    </PageSection>
  </PageShell>;
}
