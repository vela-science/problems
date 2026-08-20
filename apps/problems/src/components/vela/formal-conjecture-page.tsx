import Link from "next/link";
import {
  ArrowUpRight01Icon,
  CheckmarkBadge01Icon,
  Clock01Icon,
  File01Icon,
  GitBranchIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FormalConjectureOccurrence } from "@vela/projection-data";
import { formalConjecturesCollection } from "@vela/projection-data";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { PageShell } from "@vela/ui/vela/page-shell";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { type ProblemReferenceView } from "@/components/vela/problem-overview-reference";
import { Disclosure } from "@/components/vela/disclosure";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@vela/ui/components/item";

function HumanText({ children }: { children: string }) {
  return <ScientificText text={children} />;
}

function presentationQuestion(question: string, title: string): string {
  const clean = (value: string) => value
    .replace(/\*\*([^*]+)\*\*/gu, "$1")
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/gu, "$1")
    .trim();
  const lines = clean(question).split("\n");
  const first = lines[0]?.replace(/:$/u, "").trim().toLocaleLowerCase();
  if (first && first === clean(title).replace(/:$/u, "").trim().toLocaleLowerCase()) lines.shift();
  return lines.join("\n").trim();
}

function Overview({ item, route }: { item: FormalConjectureOccurrence; route: string }) {
  const related = item.relations.map((relation) => ({
    relation,
    target: formalConjecturesCollection.data.items.find(({ route_slug }) => route_slug === relation.target),
  })).filter((entry) => entry.target);
  return <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
    <div className="min-w-0 space-y-6">
      <section aria-labelledby="fc-question" className="vela-object-surface overflow-hidden">
        <div className="border-b bg-muted/20 px-5 py-3 text-meta font-medium">Tracked question</div>
        <div className="px-5 py-5 sm:px-6">
          <h2 id="fc-question" className="sr-only">Question</h2>
          <div className="typeset max-w-[78ch] whitespace-pre-line text-body leading-7"><HumanText>{presentationQuestion(item.question, item.title)}</HumanText></div>
        </div>
      </section>
      <section aria-labelledby="fc-formal-statement" className="vela-object-surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-5 py-3">
          <h2 id="fc-formal-statement" className="text-label">Lean declaration</h2>
          <Link href={`${route}/sources`} className="text-meta font-medium text-primary hover:underline">Open source view</Link>
        </div>
        <pre className="overflow-x-auto p-5 text-compact leading-6"><code>{item.formal_statement}</code></pre>
      </section>
      {related.length ? <section aria-labelledby="fc-related" className="border-y py-4">
        <h2 id="fc-related" className="text-label">Related formalizations</h2>
        <ul className="mt-2 divide-y">
          {related.map(({ relation, target }) => <li key={`${relation.kind}:${relation.target}`}>
            <Item className="vela-object-row gap-3 rounded-none px-2 py-3" render={<Link href={`/problems/formal-conjectures/${target!.route_slug}`} />}>
              <ItemContent>
                <ItemTitle className="line-clamp-none block text-label"><HumanText>{target!.title}</HumanText></ItemTitle>
                <ItemDescription className="text-meta capitalize">{relation.kind.replaceAll("_", " ")}</ItemDescription>
              </ItemContent>
              <ItemActions><HugeiconsIcon icon={GitBranchIcon} aria-hidden className="size-4 text-muted-foreground" /></ItemActions>
            </Item>
          </li>)}
        </ul>
      </section> : null}
    </div>
    <aside aria-label="Formalization details" className="h-fit border-l pl-5 lg:sticky lg:top-16">
      <h2 className="text-label">Formalization details</h2>
      <dl className="mt-3 space-y-3 text-meta">
        <div><dt className="text-muted-foreground">Collection</dt><dd className="mt-0.5">Formal Conjectures</dd></div>
        <div><dt className="text-muted-foreground">Source family</dt><dd className="mt-0.5">{item.source_family}</dd></div>
        <div><dt className="text-muted-foreground">Formal proof</dt><dd className="mt-0.5">{item.formal_proof ? "Retained" : "Not retained"}</dd></div>
        <div><dt className="text-muted-foreground">Lean toolchain</dt><dd className="mt-0.5 font-mono text-micro">{formalConjecturesCollection.source_snapshot.lean_toolchain}</dd></div>
        <div><dt className="text-muted-foreground">Original question</dt><dd className="mt-0.5"><a href={item.source_locator} className="font-medium text-primary hover:underline">Open {item.source_family} source <HugeiconsIcon icon={ArrowUpRight01Icon} aria-hidden className="inline size-3.5" /></a></dd></div>
        <div><dt className="text-muted-foreground">Question text</dt><dd className="mt-0.5">{item.rights.question_text_license} · {item.rights.attribution}</dd></div>
      </dl>
      <Disclosure className="mt-5 border-t pt-3 text-meta" summaryClassName="font-medium" summary="Technical identity">
        <dl className="mt-3 space-y-3 text-micro">
          <div><dt className="text-muted-foreground">Declaration</dt><dd className="mt-0.5 break-all font-mono">{item.declaration}</dd></div>
          <div><dt className="text-muted-foreground">Snapshot</dt><dd className="mt-0.5 break-all font-mono">{formalConjecturesCollection.source_snapshot.commit}</dd></div>
          <div><dt className="text-muted-foreground">Occurrence root</dt><dd className="mt-0.5 break-all font-mono">{item.content_root}</dd></div>
        </dl>
      </Disclosure>
    </aside>
  </div>;
}

function Work({ item }: { item: FormalConjectureOccurrence }) {
  return <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div className="vela-object-surface p-5 sm:p-6">
      <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><HugeiconsIcon icon={GitBranchIcon} aria-hidden className="size-5" /></span><div><h2 className="text-title">Work on the upstream declaration</h2><p className="mt-1 max-w-2xl text-body text-muted-foreground">Formal Conjectures uses GitHub pull requests for source contributions and maintainer decisions. problems.science does not run its review bot or CI.</p></div></div>
      <div className="mt-5 flex flex-wrap gap-3"><Button nativeButton={false} render={<a href={item.source_url} />}>Open exact source <HugeiconsIcon icon={ArrowUpRight01Icon} aria-hidden data-icon="inline-end" /></Button><Button nativeButton={false} variant="outline" render={<Link href="/contribute" />}>Add a Result</Button></div>
    </div>
    <aside className="border-l pl-5"><h2 className="text-label">Browser boundary</h2><p className="mt-2 text-meta text-muted-foreground">Open or coordinate work here; use GitHub or a local tool for files, Lean execution, credentials, and commits.</p></aside>
  </section>;
}

function Results({ item }: { item: FormalConjectureOccurrence }) {
  return <section className="mt-6 vela-object-surface overflow-hidden" aria-labelledby="fc-results">
    <div className="border-b bg-muted/20 px-5 py-3"><h2 id="fc-results" className="text-label">Results and checks</h2></div>
    <div className="flex gap-4 p-5 sm:p-6"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><HugeiconsIcon icon={CheckmarkBadge01Icon} aria-hidden className="size-5" /></span><div><h3 className="text-title">No Vela Result is attached</h3><p className="mt-1 max-w-2xl text-body text-muted-foreground">The exact declaration is source-categorized <span className="font-medium text-foreground">{item.category}</span>. A GitHub merge, Lean build, or advisory review does not become a Vela Result or scientific decision by itself.</p><Button className="mt-4" size="sm" nativeButton={false} render={<Link href="/contribute" />}>Add a Result</Button></div></div>
  </section>;
}

function Sources({ item }: { item: FormalConjectureOccurrence }) {
  return <section className="mt-6 overflow-hidden rounded-lg border bg-card lg:grid lg:min-h-[34rem] lg:grid-cols-[19rem_minmax(0,1fr)]" aria-label="Formal Conjectures source browser">
    <div className="border-b bg-muted/20 lg:border-r lg:border-b-0">
      <div className="border-b px-4 py-3 text-label">Source file</div>
      <div className="p-2">
        <a href={item.source_url} className="vela-object-row flex items-start gap-2 rounded-md bg-accent px-3 py-3 text-label" aria-current="page"><HugeiconsIcon icon={File01Icon} aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" /><span className="min-w-0 break-all">{item.source_path}</span></a>
      </div>
      <dl className="border-t px-4 py-4 text-micro">
        <dt className="text-muted-foreground">Exact commit</dt><dd className="mt-1 break-all font-mono">{formalConjecturesCollection.source_snapshot.commit}</dd>
        <dt className="mt-3 text-muted-foreground">File blob</dt><dd className="mt-1 break-all font-mono">{item.source_blob_oid}</dd>
      </dl>
    </div>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"><div className="flex min-w-0 items-center gap-2 text-label"><HugeiconsIcon icon={SourceCodeIcon} aria-hidden className="size-4" /><span className="truncate">{item.declaration}</span></div><a href={item.source_url} className="text-meta font-medium text-primary hover:underline">Open whole file</a></div>
      <p className="border-b bg-muted/15 px-4 py-2 text-micro text-muted-foreground">Exact retained declaration excerpt — not the whole file.</p>
      <pre className="max-h-[36rem] overflow-auto p-4 text-compact leading-6"><code>{item.source_excerpt}</code></pre>
    </div>
  </section>;
}

function History({ item }: { item: FormalConjectureOccurrence }) {
  return <section className="mt-6" aria-labelledby="fc-history"><h2 id="fc-history" className="sr-only">History</h2><ol className="relative ml-3 border-l pl-6">
    <li className="relative pb-7"><span className="absolute -left-[2.08rem] grid size-4 place-items-center rounded-full border bg-background"><span className="size-1.5 rounded-full bg-primary" /></span><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">Source revision</Badge><span className="text-meta text-muted-foreground">{formalConjecturesCollection.source_snapshot.commit.slice(0, 12)}</span></div><h3 className="mt-2 text-label">Declaration retained in the published subset</h3><p className="mt-1 text-meta text-muted-foreground"><span className="font-mono text-micro">{item.declaration}</span> binds its category, docstring, Lean signature, source path, rights basis, and exact file root together.</p></li>
    <li className="relative"><span className="absolute -left-[2.08rem] grid size-4 place-items-center rounded-full border bg-background"><HugeiconsIcon icon={Clock01Icon} aria-hidden className="size-2.5" /></span><h3 className="text-label">Earlier rename history</h3><p className="mt-1 text-meta text-muted-foreground">No earlier declaration alias, split, merge, or supersession is asserted by this retained snapshot.</p></li>
  </ol></section>;
}

export function FormalConjecturePage({ item, route, current }: { item: FormalConjectureOccurrence; route: string; current: ProblemReferenceView }) {
  const collectionHref = "/problems/formal-conjectures";
  return <PageShell as="article" archetype="problem" layout="canvas" className="!pt-2">
    <header className="mt-2 rounded-lg bg-[var(--vela-ink)] px-5 py-5 text-sidebar-foreground sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-meta text-sidebar-foreground/75"><Link href={collectionHref} className="hover:text-sidebar-foreground">Formal Conjectures</Link><span aria-hidden className="mx-2">/</span><span>{item.source_family}</span></p><h1 className="mt-3 max-w-[34ch] text-display leading-tight"><HumanText>{item.title}</HumanText></h1><p className="mt-3 max-w-3xl text-compact text-sidebar-foreground/75">Exact formalization occurrence from the upstream source collection.</p></div><Button nativeButton={false} size="sm" render={<a href={item.source_url} />}>Open source <HugeiconsIcon icon={ArrowUpRight01Icon} aria-hidden data-icon="inline-end" /></Button></div>
      <dl className="mt-6 grid gap-px overflow-hidden rounded-md bg-sidebar-foreground/15 sm:grid-cols-3">
        <div className="bg-sidebar/80 px-4 py-3"><dt className="text-micro text-sidebar-foreground/70">Source category</dt><dd className="mt-1 text-label capitalize">{item.category}</dd></div>
        <div className="bg-sidebar/80 px-4 py-3"><dt className="text-micro text-sidebar-foreground/70">Formal proof</dt><dd className="mt-1 text-label">{item.formal_proof ? "Retained" : "Not retained"}</dd></div>
        <div className="bg-sidebar/80 px-4 py-3"><dt className="text-micro text-sidebar-foreground/70">Vela current state</dt><dd className="mt-1 text-label">No Repository Result attached</dd></div>
      </dl>
    </header>
    {current === "overview" ? <Overview item={item} route={route} /> : current === "work" ? <Work item={item} /> : current === "results" ? <Results item={item} /> : current === "sources" ? <Sources item={item} /> : <History item={item} />}
  </PageShell>;
}
