import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon as ArrowRight, Activity01Icon, WorkIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { PageHero, PageSection, PageShell } from "@vela/ui/vela/page-shell";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { StateGlyph, type ClaimStanding } from "@vela/ui/vela/state-glyph";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
import { ProblemDiscoveryFacts } from "@/components/vela/problem-facts";
import { ScientificChangeFeed } from "@/components/vela/scientific-change-feed";
import { discoveredProblems, recentScientificChanges, type ProblemDiscovery } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Home",
  description: "A live view of scientific Problems, current State, and exact retained changes across Vela.",
};

/* The catalogue row carries the standing as a plain string; the glyph takes
   the closed axis. Narrow rather than cast, so an unrecognised value paints as
   unassessed instead of as whatever it happens to spell. */
const STANDINGS: readonly ClaimStanding[] = ["unassessed", "accepted", "accepted_with_conditions", "corrected", "superseded", "retracted"];

function standingOf(problem: ProblemDiscovery): ClaimStanding {
  const value = problem.record.local_standing;
  return STANDINGS.find((standing) => standing === value) ?? "unassessed";
}

function problemStatement(problem: ProblemDiscovery): string {
  return decodeHtmlEntities(problem.record.statement?.trim() || `Problem ${problem.problem}`);
}

export default async function HomePage() {
  const [catalog, activity] = await Promise.all([discoveredProblems(), recentScientificChanges(6)]);

  /* Both numbers are of the corpus, not of a sample.
   *
   * This page used to read the first twelve catalogue rows and count over
   * those, so "Problems in focus" was the literal constant 12 and "Locally
   * assessed" was 0 — while the Repository had in fact assessed two. The
   * catalogue is sorted by problem number, so the twelve were always Erdős
   * 1–12, and a `find` for 321 in that window could never match: the lead was
   * permanently Erdős 1, which no Claim names.
   *
   * Assessment is measured by `local_standing`, which is on every catalogue
   * row and is the same field `/problems` reads. The previous measure needed a
   * `problemDetail` call per Problem — twelve of them — to learn something the
   * row already carried. */
  const assessed = catalog
    .filter((problem) => problem.record.local_standing)
    .sort((left, right) => (right.record.local_assessed_at ?? "").localeCompare(left.record.local_assessed_at ?? ""));
  const open = catalog.filter((problem) => problem.record.declared_status === "open");
  const lead = assessed[0];

  return <PageShell archetype="problem">
    <PageHero density="compact" className="isolate lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.42fr)] lg:items-end lg:gap-12">
      <div>
        <p className="text-eyebrow uppercase text-muted-foreground">Problems.science</p>
        <h1 className="mt-3 max-w-4xl text-display">Find a scientific Problem. See what is known. Contribute.</h1>
        <p className="typeset typeset-compact mt-4 max-w-2xl text-muted-foreground">Start with the question. Current State, evidence, source-owned work, and shared activity stay connected without being collapsed into one status.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/problems" />}>Browse Problems <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/contribute" />}>Contribute</Button>
        </div>
      </div>
      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-6 text-meta lg:mt-0 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <div><dt className="text-muted-foreground">Problems published</dt><dd className="mt-1 font-mono text-subtitle tabular-nums">{catalog.length}</dd></div>
        <div><dt className="text-muted-foreground">Assessed by a Repository</dt><dd className="mt-1 font-mono text-subtitle tabular-nums">{assessed.length}</dd></div>
        <div className="col-span-2"><dt className="text-muted-foreground">Where to begin</dt><dd className="mt-1 text-label"><Link href="/problems" className="underline decoration-border underline-offset-4 hover:decoration-current">Choose a Problem and open its Workspace</Link></dd></div>
      </dl>
    </PageHero>

    <PageSection className="grid gap-10 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,.65fr)]">
      <div>
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-eyebrow uppercase text-muted-foreground">Start here</p><h2 className="mt-1 text-title">Recently assessed</h2></div>
          <Link href="/problems" className="text-meta font-medium underline-offset-4 hover:underline">All Problems</Link>
        </div>
        {lead ? <article className="mt-6">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{lead.field?.name ?? lead.topics[0]?.name ?? "Unclassified Topic"}</Badge><span className="text-meta text-muted-foreground">{lead.collection?.name ?? "Unclassified collection"}</span></div>
          <Link href={lead.canonicalPath ?? "/problems"} className="group mt-4 grid gap-5 focus-visible:outline-2 focus-visible:outline-offset-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto]">
            <div className="flex items-start gap-3"><StateGlyph className="mt-1" standing={standingOf(lead)} verification="not_attempted" /><span className="font-mono text-title">{lead.problem}</span></div>
            <div><p className="text-eyebrow uppercase text-muted-foreground">{lead.theme}</p><h3 className="mt-2 max-w-[70ch] text-title leading-snug"><ScientificText text={problemStatement(lead)} /></h3></div>
            <HugeiconsIcon icon={ArrowRight} aria-hidden className="mt-1 size-5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <ProblemDiscoveryFacts problem={lead} className="mt-6" />
        </article> : <p className="mt-6 max-w-[70ch] text-body text-muted-foreground">No Repository has assessed a Problem in this release.</p>}

        {assessed.length > 1 ? <ItemGroup className="mt-6 gap-0 divide-y">
          {assessed.slice(1, 5).map((problem) => <Item key={`${problem.repository}/${problem.problem}`} render={<Link href={problem.canonicalPath ?? "/problems"} />} className="group rounded-none border-0 px-0 py-5">
            <ItemMedia className="w-20 self-start"><StateGlyph standing={standingOf(problem)} verification="not_attempted" /><span className="font-mono text-label">{problem.problem}</span></ItemMedia>
            <ItemContent><ItemTitle className="line-clamp-none text-label"><ScientificText text={problemStatement(problem)} /></ItemTitle><ItemDescription className="line-clamp-none">{problem.field?.name ?? problem.topics[0]?.name ?? "Unclassified Topic"} · {problem.record.source_count} exact {problem.record.source_count === 1 ? "source" : "sources"}</ItemDescription></ItemContent>
            <ItemActions><HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-1" /></ItemActions>
          </Item>)}
        </ItemGroup> : null}

        {/* Source-declared status, not a queue. `open` is what the source says
            about its own problem; nothing here ranks by importance, and the
            product publishes no central priority. */}
        <div className="mt-12 flex items-end justify-between gap-4">
          <div><p className="text-eyebrow uppercase text-muted-foreground">Source-declared</p><h2 className="mt-1 text-title">Open Problems</h2></div>
          <Link href={{ pathname: "/problems", query: { status: "open" } }} className="text-meta font-medium underline-offset-4 hover:underline">{open.length} open</Link>
        </div>
        <ItemGroup className="mt-4 gap-0 divide-y">
          {open.slice(0, 5).map((problem) => <Item key={`${problem.repository}/${problem.problem}`} render={<Link href={problem.canonicalPath ?? "/problems"} />} className="group rounded-none border-0 px-0 py-5">
            <ItemMedia className="w-20 self-start"><span className="font-mono text-label">{problem.problem}</span></ItemMedia>
            <ItemContent><ItemTitle className="line-clamp-none text-label"><ScientificText text={problemStatement(problem)} /></ItemTitle><ItemDescription className="line-clamp-none">{problem.field?.name ?? problem.topics[0]?.name ?? "Unclassified Topic"} · {problem.record.formalized ? "formalized" : "not formalized"} · {problem.record.source_count} exact {problem.record.source_count === 1 ? "source" : "sources"}</ItemDescription></ItemContent>
            <ItemActions><HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-1" /></ItemActions>
          </Item>)}
        </ItemGroup>
      </div>

      <aside>
        <div className="flex items-end justify-between gap-4"><div><p className="text-eyebrow uppercase text-muted-foreground">Scientific State</p><h2 className="mt-1 text-title">Latest State history</h2></div><Link href="/activity" className="text-meta font-medium underline-offset-4 hover:underline">Full history</Link></div>
        <ScientificChangeFeed changes={activity} compact />
      </aside>
    </PageSection>

    {/* Two entries, two columns. The grid declared three and left an empty one. */}
    <PageSection as="nav" aria-label="Explore the network" className="grid rounded-xl bg-muted/30 px-4 md:grid-cols-2">
      {[
        { href: "/contribute", icon: WorkIcon, title: "Contribute", detail: "prepare a bounded direct Submission" },
        { href: "/activity", icon: Activity01Icon, title: "State history", detail: `${activity.length} recent retained records` },
      ].map((item) => <Link key={item.href} href={item.href} className="group flex items-center gap-4 border-b px-2 py-6 transition-colors last:border-b-0 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 md:border-b-0 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0 md:last:pr-0"><HugeiconsIcon icon={item.icon} aria-hidden className="size-5" /><span><span className="block text-subtitle">{item.title}</span><span className="mt-1 block text-meta text-muted-foreground">{item.detail}</span></span><HugeiconsIcon icon={ArrowRight} aria-hidden className="ml-auto size-4 transition-transform duration-200 group-hover:translate-x-1" /></Link>)}
    </PageSection>
  </PageShell>;
}
