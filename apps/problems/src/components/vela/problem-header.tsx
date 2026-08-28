import Link from "next/link";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { CopyButton } from "@vela/ui/vela/copy-button";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { Popover, PopoverContent, PopoverTrigger } from "@vela/ui/components/popover";
import { SectionNav } from "@/components/vela/section-nav";
import { StartWorkMenu } from "@/components/vela/start-work-menu";
import { problemWorkbenchHandoff } from "@/lib/workbench-handoff";
import { problemReading, readingBadge, readingBasis, problemSourceResolution } from "@/lib/problem-reading";
import { problemLabel, resolveProblemStatement, statementParagraphs } from "@/lib/problem-statement";
import type { ScientificProblemState } from "@/lib/scientific-state";
import type { ProblemReferenceView } from "@/components/vela/problem-overview-reference";

type State = NonNullable<ScientificProblemState>;

/* Counts come from the records each section actually renders, so a number here
   is the number the reader finds after the click. A section with nothing in it
   shows no count rather than a zero, because a zero badge reads as a state and
   these are quantities. */
function sectionCounts(state: State) {
  return {
    work: state.attributedRecords?.length ?? 0,
    results: state.claims?.length ?? 0,
    sources: state.sources?.occurrences?.length ?? 0,
    history: state.reviews?.length ?? 0,
  };
}

const SECTIONS: Array<{ key: ProblemReferenceView; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "work", label: "Work" },
  { key: "results", label: "Results" },
  { key: "sources", label: "Sources" },
  { key: "history", label: "History" },
];

export function ProblemHeader({ state, route, current }: {
  state: State;
  route: string;
  current: ProblemReferenceView;
}) {
  const statement = resolveProblemStatement(state);
  const { question } = statementParagraphs(statement);
  const claim = (state.claims ?? []).find((entry) => entry.id === state.currentClaimId) ?? null;
  const reading = problemReading({
    currentAssertion: claim?.assertion ?? null,
    repositoryName: state.repositoryName,
    sourceResolution: problemSourceResolution(state),
  });
  const counts = sectionCounts(state);
  const hasQuestion = statement?.form === "prose" && Boolean(question);

  return <header className="-mx-(--vela-page-gutter) border-b bg-card px-(--vela-page-gutter) pt-3.5 md:pt-4">
    {/* One row, not two.
      *
        Identity, state and actions used to sit in a strip above the title: a
        copy icon and a badge at one end, a button at the other, and a hand's
        width of nothing between them. The badge is a property of the Problem
        and reads as one beside its name; the actions belong on the line they
        act on. The breadcrumb above carries the collection, so the slug that
        opened that row is gone with it. */}
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
      {/* The identity is a label when a question can be the title, and becomes
          the title itself when none is retained — never a negation. Promoting
          "No written statement is retained" to the h1 would make the page
          title an absence on the 613 Problems held by identity and locator
          alone. A Problem always has a name; it does not always have prose. */}
      {hasQuestion
        ? <p className="m-0 text-label font-medium leading-tight text-muted-foreground">{problemLabel(state)}</p>
        : <h1 className="m-0 text-label font-medium leading-tight text-muted-foreground">{problemLabel(state)}</h1>}
      {/* A derived reading, and it says so on the control that explains it.
        * There is no Problem-level Standing in the projection to promote.
        *
        * A popover rather than a tooltip: this disclosure is the difference
        * between "open" and "a source said open", so it has to be reachable by
        * touch and by keyboard, not only by hover. */}
      <Popover>
        <PopoverTrigger
          className="inline-flex min-h-6 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]"
          aria-label={`${readingBadge(reading)}. How this reading was derived.`}
        >
          <Badge variant="outline" className="cursor-pointer">{readingBadge(reading)}</Badge>
        </PopoverTrigger>
        <PopoverContent className="max-w-80 text-compact leading-5">
          <span className="font-semibold">Problems synthesis.</span> {readingBasis(reading)}
        </PopoverContent>
      </Popover>
      <div className="flex gap-1.5 md:ml-auto">
        <CopyButton value={`https://problems.science${route}`} label="Copy link to this Problem" compact />
        <Button nativeButton={false} variant="outline" size="sm" render={<Link href={`${route}/work`} />}>Start work</Button>
        <StartWorkMenu
          workbenchHandoff={problemWorkbenchHandoff({
            basePath: route,
            repositorySlug: state.repositorySlug,
            sourceRevision: state.source?.native_revision,
            sourceLocators: (state.source?.locators ?? []).map(({ url }) => url).filter((url): url is string => Boolean(url)),
          })}
          sourceLocator={state.locator ?? null}
        />
      </div>
    </div>

    {/* The question is the title, which is what DESIGN.md says twice and what
      * the product is for. It shipped as a 13px muted caption clamped to two
      * lines — 66% of it hidden at 375px, truncated mid-formula, and not
      * reachable at all from Work, Results, Sources or History — while
      * `Erdős problem 94` was the h1 at 19px and a *derived summary sentence*
      * was 26px. The three ranks were exactly inverted: a sentence about the
      * question outranked the identity, which outranked the science.
      *
      * The identity becomes a label above it (the breadcrumb already carries
      * collection and number), and the question becomes the h1 at the
      * `statement` token — 1.375rem/400, the step the brand scale defines for
      * exactly this and which nothing was using.
      *
      * The same on all five sections. It was clamped to two lines everywhere
      * except Overview, on the reasoning that a section's own content should
      * lead — but the header belongs to the Problem, not to the section, and
      * clamping it on four of five guaranteed that the header resized whenever
      * a reader moved between the Problem's own tabs. On a question carrying
      * display mathematics that is a jump of 55px. A constant header is worth
      * more than a few lines of scroll, and the question is the one thing on
      * this page that is never redundant. */}
    {hasQuestion
      /* One step down below `sm`. At 390 the statement ran seven lines and
         216px, which pushed the section tabs under the fold on the most common
         phone width. The question is still the largest thing on the page. */
      ? <h1 className="mt-3 max-w-[104ch] text-title font-normal leading-[1.45] tracking-[-0.01em] text-foreground text-pretty sm:text-statement sm:leading-[1.4] md:mt-2"><ScientificText text={question} /></h1>
      : <p className="mt-3 text-body leading-normal text-muted-foreground md:mt-2">No written statement is retained for this problem.</p>}

    <SectionNav
      label="Problem sections"
      current={current}
      sections={SECTIONS.map(({ key, label }) => ({
        key,
        label,
        href: key === "overview" ? route : `${route}/${key}`,
        count: key === "overview" ? 0 : counts[key],
      }))}
    />
  </header>;
}
