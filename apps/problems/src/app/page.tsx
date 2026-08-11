import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@vela/ui/components/item";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { StateGlyph } from "@vela/ui/vela/state-glyph";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
import { featuredProblems, scientificProblemState } from "@/lib/scientific-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Problems",
  description: "Choose a scientific Problem, read its current State, or enter Work.",
};

export default async function ProblemsIndex() {
  const states = await Promise.all(featuredProblems.map(async (feature) => ({
    feature,
    state: await scientificProblemState(feature.repository, feature.problem),
  })));
  return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
    <header className="max-w-3xl">
      <p className="text-eyebrow uppercase text-muted-foreground">Vela</p>
      <h1 className="mt-2 text-display">Problems</h1>
      <p className="mt-3 text-body text-muted-foreground">Choose a Problem. Read its State, or enter Work.</p>
    </header>

    <section aria-labelledby="problem-list" className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
        <h2 id="problem-list" className="text-subtitle">Available now</h2>
        <p className="text-meta text-muted-foreground">
          <span className="font-mono text-foreground">{states.filter(({ state }) => state).length}</span> exact scientific records
        </p>
      </div>
      {/* Composition adapted from Tailwind Plus Application UI's stacked-list
          rhythm. The interactive foundation remains the shared shadcn/Base UI
          Item primitive. */}
      <ItemGroup className="mt-2 gap-0 divide-y">
        {states.map(({ feature, state }) => state ? <Item
          key={`${feature.repository}/${feature.problem}`}
          render={<Link href={`/p/${feature.repository}/${feature.problem}`} />}
          className="group rounded-none border-0 px-0 py-6 sm:flex-nowrap sm:gap-5"
        >
          <ItemMedia className="w-16 self-start gap-3 pt-0.5 sm:w-20">
            <StateGlyph standing={state.claims[0]?.standing ?? "unassessed"} verification="not_attempted" />
            <span className="font-mono text-title tabular-nums text-muted-foreground transition-colors group-hover:text-foreground">{feature.problem}</span>
          </ItemMedia>
          <ItemContent className="gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-eyebrow uppercase text-muted-foreground">{feature.theme}</span>
              <Badge variant="secondary">{state.problem.declared_status}</Badge>
            </div>
            <ItemTitle className="line-clamp-none max-w-[76ch] text-subtitle leading-snug">
              <ScientificText text={decodeHtmlEntities(state.source.summary?.trim() || state.problem.statement || state.source.title)} />
            </ItemTitle>
            <ItemDescription className="line-clamp-none flex flex-wrap items-center gap-x-2 gap-y-1">
                {state.problem.formalized ? <span>formalized</span> : <span>not formalized</span>}
                <span aria-hidden>·</span>
                <span>{state.problem.offer_count} open {state.problem.offer_count === 1 ? "target" : "targets"}</span>
            </ItemDescription>
          </ItemContent>
          <ItemActions className="ml-auto self-center text-meta font-medium">
            <span>Open</span><HugeiconsIcon icon={ArrowRight} aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </ItemActions>
        </Item> : null)}
      </ItemGroup>
    </section>
  </main>;
}
