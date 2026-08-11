import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
import { featuredProblems, scientificProblemState } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Exact Problems, open work",
  description: "Five exact Problem pages where state stays canonical and hosted collaboration stays non-authoritative.",
};

export default async function ProblemsIndex() {
  const states = await Promise.all(featuredProblems.map(async (feature) => ({
    feature,
    state: await scientificProblemState(feature.repository, feature.problem),
  })));
  return <div>
    <section className="border-b bg-muted/20">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-16">
        <div>
          <p className="text-eyebrow uppercase tracking-[0.14em] text-muted-foreground">State → work → portable contribution</p>
          <h1 className="mt-3 max-w-4xl text-display tracking-tight sm:text-5xl">Work from exact scientific state without handing authority to the website.</h1>
          <p className="mt-5 max-w-2xl text-body leading-7 text-muted-foreground">Read immutable repository evidence, follow a Problem, fork an approach, record attempts and rooted artifacts, then export a public-schema Submission draft for local signing. Hosted activity never changes Standing.</p>
        </div>
        <aside className="border-l-2 border-foreground pl-5">
          <p className="text-subtitle">Two planes, one page</p>
          <dl className="mt-4 space-y-4 text-meta">
            <div><dt className="font-semibold">Scientific state</dt><dd className="mt-1 text-muted-foreground">Exact, rebuildable, SELECT-only Observatory projection.</dd></div>
            <div><dt className="font-semibold">Hosted activity</dt><dd className="mt-1 text-muted-foreground">Writable coordination that is portable and safe to delete.</dd></div>
          </dl>
        </aside>
      </div>
    </section>

    <section aria-labelledby="grounded-problems" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-eyebrow uppercase text-muted-foreground">First workbench set</p><h2 id="grounded-problems" className="mt-1 text-title">Five deeply grounded Problems</h2></div>
        <a className="text-meta underline underline-offset-4" href="https://app.vela.space/repositories">Browse all exact state in Observatory</a>
      </div>
      <ol className="mt-6 grid gap-4 lg:grid-cols-2">
        {states.map(({ feature, state }, index) => state ? <li key={`${feature.repository}/${feature.problem}`} className={index === 0 ? "lg:col-span-2" : ""}>
          <article className="group flex h-full flex-col border bg-background p-5 transition-colors hover:border-foreground sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Problem {feature.problem}</Badge>
              <Badge variant="secondary">{state.repositoryName}</Badge>
              <span className="ml-auto font-mono text-micro text-muted-foreground">{state.anchor.projectionReleaseRoot.slice(0, 18)}…</span>
            </div>
            <h3 className="mt-5 text-title"><ScientificText text={decodeHtmlEntities(state.problem.statement || state.source.title)} /></h3>
            <p className="mt-3 text-meta text-muted-foreground">{feature.theme} · {state.problem.declared_status} · {state.problem.formalized ? "formalized" : "not formalized"}</p>
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
              <Button nativeButton={false} render={<Link href={`/p/${feature.repository}/${feature.problem}?mode=state`} />}>Open exact Problem <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button>
              <Button nativeButton={false} variant="outline" render={<Link href={`/p/${feature.repository}/${feature.problem}?mode=work`} />}>Enter Work mode</Button>
            </div>
          </article>
        </li> : null)}
      </ol>
    </section>
  </div>;
}
