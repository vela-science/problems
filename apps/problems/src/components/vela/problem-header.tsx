import Link from "next/link";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { CopyButton } from "@vela/ui/vela/copy-button";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { Popover, PopoverContent, PopoverTrigger } from "@vela/ui/components/popover";
import { problemReading, readingBadge, readingBasis } from "@/lib/problem-reading";
import { problemLabel, resolveProblemStatement, statementParagraphs } from "@/lib/problem-statement";
import type { ScientificProblemState } from "@/lib/scientific-state";
import type { ProblemReferenceView } from "@/components/vela/problem-overview-reference";
import styles from "./problem-header.module.css";

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
  });
  const counts = sectionCounts(state);
  const path = route.replace(/^\/problems\//u, "");

  return <header className={styles.header}>
    <div className={styles.identity}>
      <span className={styles.path}>{path}</span>
      <CopyButton value={`https://problems.science${route}`} label="Copy link to this Problem" compact />
      {/* A derived reading, and it says so on the control that explains it.
        * There is no Problem-level Standing in the projection to promote.
        *
        * A popover rather than a tooltip: this disclosure is the difference
        * between "open" and "a source said open", so it has to be reachable by
        * touch and by keyboard, not only by hover. */}
      <Popover>
        {/* The trigger is its own button with the Badge inside it. Handing
            `render` a Badge produced a bare span: it looked like a control,
            carried the label, and could be neither focused nor clicked. */}
        <PopoverTrigger
          className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]"
          aria-label={`${readingBadge(reading)}. How this reading was derived.`}
        >
          <Badge variant="outline" className="cursor-pointer">{readingBadge(reading)}</Badge>
        </PopoverTrigger>
        <PopoverContent className="max-w-80 text-compact leading-5">
          <span className="font-semibold">Problems synthesis.</span> {readingBasis(reading)}
        </PopoverContent>
      </Popover>
      <div className={styles.actions}>
        <Button nativeButton={false} variant="outline" size="sm" render={<Link href={`${route}/work`} />}>Start work</Button>
      </div>
    </div>

    <h1 className={styles.title}>{problemLabel(state)}</h1>

    {statement?.form === "prose" && question
      ? <p className={styles.question}><ScientificText text={question} /></p>
      : <p className={styles.question}>No written statement is retained for this problem.</p>}

    <nav className={styles.tabs} aria-label="Problem sections">
      {SECTIONS.map(({ key, label }) => {
        const href = key === "overview" ? route : `${route}/${key}`;
        const active = current === key;
        const count = key === "overview" ? 0 : counts[key];
        return <Link
          key={key}
          href={href}
          className={styles.tab}
          aria-current={active ? "page" : undefined}
        >
          {label}
          {count > 0 ? <span className={styles.count}>{count}</span> : null}
        </Link>;
      })}
    </nav>
  </header>;
}
