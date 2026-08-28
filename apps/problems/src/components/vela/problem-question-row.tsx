import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { formalCoverage, problemLabel, resolveProblemStatement, statementParagraphs, statementPlainText } from "@/lib/problem-statement";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

/* A Problem in one row, leading with what it asks.
 *
 * The catalogue's own text for most Problems is "Erdős problem 412", so a row
 * built from the record alone tells a reader nothing they can choose between.
 * The written question comes from a source, and the row says which one. */
export function ProblemQuestionRow({ state, href, number, collectionLabel = "Problem", actionLabel }: {
  state: State;
  href: string;
  number: string;
  collectionLabel?: string;
  actionLabel?: string;
}) {
  const statement = resolveProblemStatement(state);
  const { question } = statementParagraphs(statement);
  const coverage = formalCoverage(state);
  const status = state.problem.declared_status?.replaceAll("_", " ") || "status not stated";
  const resolved = ["solved", "proved", "disproved"].some((word) => status.toLowerCase().includes(word));
  const reviewed = (state.claims ?? []).filter((claim) => ["accepted", "accepted_with_conditions"].includes(claim.standing)).length;

  const name = question ? `${collectionLabel} ${number}: ${statementPlainText(question)}` : `${collectionLabel} ${number}`;

  return <li className="min-w-0">
    <Item
      className="vela-object-row -mx-2 gap-4 rounded-md px-2 py-4"
      render={<Link href={href} aria-label={actionLabel ? `${actionLabel}: ${name}` : name} />}
    >
      <ItemMedia aria-hidden className="w-12 font-mono text-meta tabular-nums text-muted-foreground">{`#${number}`}</ItemMedia>
      <ItemContent>
        {/* The question wraps; `ItemTitle` clamps to one line by default, and a
            Problem a reader is choosing between is exactly the text that must
            not be cut off. */}
        <ItemTitle className="line-clamp-none block max-w-[76ch] text-compact leading-6 group-hover/item:underline group-hover/item:decoration-border group-hover/item:underline-offset-4">
          {question ? <ScientificText text={question} /> : problemLabel(state)}
        </ItemTitle>
        <ItemDescription className="line-clamp-none flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
          {/* "Source says", because that is what this word is.
              *
              * It rendered as a bare `solved` behind a green dot — the same
              * `status-progress` token the badge uses for an accepted Standing —
              * so Erdős 321 read "● solved" on this row while its own page reads
              * Open, "Source reports: Solved", and "A source report is not this
              * Problem's state here". The collection table has always headed
              * this column "Source says" and kept "Result here" beside it; the
              * Problem rail says "Source reports". This row dropped the label
              * and kept the colour, which is the one combination that states the
              * opposite of the product's thesis. The label is the fix, and it is
              * the table's own wording. */}
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={`size-1.5 rounded-full ${resolved ? "bg-status-progress" : "bg-muted-foreground/45"}`} />
            <span className="text-muted-foreground">Source says</span> {status}
          </span>
          {coverage.declarations ? <span>{coverage.declarations} formal {coverage.declarations === 1 ? "declaration" : "declarations"}</span> : null}
          {reviewed ? <span className="text-status-evidence">{reviewed} reviewed {reviewed === 1 ? "Result" : "Results"}</span> : null}
          {statement ? <span className="truncate">via {statement.sourceLabel}</span> : null}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="self-start text-meta font-medium text-primary">
        {actionLabel ? <span className="hidden sm:inline">{actionLabel}</span> : null}
        <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className={`size-4 transition-[opacity,transform] duration-150 group-hover/item:translate-x-0.5 ${actionLabel ? "" : "opacity-0 group-hover/item:opacity-100 group-focus-visible/item:opacity-100"}`} />
      </ItemActions>
    </Item>
  </li>;
}
