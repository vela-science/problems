import Link from "next/link";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { formalCoverage, problemLabel, resolveProblemStatement, statementParagraphs, statementPlainText } from "@/lib/problem-statement";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

/* A Problem in one row, leading with what it asks.
 *
 * The catalogue's own text for most Problems is "Erdős problem 412", so a row
 * built from the record alone tells a reader nothing they can choose between.
 * The written question comes from a source, and the row says which one. */
export function ProblemQuestionRow({ state, href, number, collectionLabel = "Problem" }: {
  state: State;
  href: string;
  number: string;
  collectionLabel?: string;
}) {
  const statement = resolveProblemStatement(state);
  const { question } = statementParagraphs(statement);
  const coverage = formalCoverage(state);
  const status = state.problem.declared_status?.replaceAll("_", " ") || "status not stated";
  const resolved = ["solved", "proved", "disproved"].some((word) => status.toLowerCase().includes(word));
  const reviewed = (state.claims ?? []).filter((claim) => ["accepted", "accepted_with_conditions"].includes(claim.standing)).length;

  const name = question ? `${collectionLabel} ${number}: ${statementPlainText(question)}` : `${collectionLabel} ${number}`;

  return <li className="min-w-0">
    <Link href={href} aria-label={name} className="group flex min-w-0 gap-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-2">
      <span aria-hidden className="mt-0.5 w-12 shrink-0 font-mono text-meta tabular-nums text-muted-foreground">{`#${number}`}</span>
      <span className="min-w-0 flex-1">
        <span className="block max-w-[76ch] text-compact leading-6 group-hover:underline group-hover:decoration-border group-hover:underline-offset-4">
          {question ? <ScientificText text={question} /> : problemLabel(state)}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={`size-1.5 rounded-full ${resolved ? "bg-status-progress" : "bg-muted-foreground/45"}`} />
            {status}
          </span>
          {coverage.declarations ? <span>{coverage.declarations} formal {coverage.declarations === 1 ? "declaration" : "declarations"}</span> : null}
          {reviewed ? <span className="text-status-evidence">{reviewed} reviewed {reviewed === 1 ? "Result" : "Results"}</span> : null}
          {statement ? <span className="truncate">via {statement.sourceLabel}</span> : null}
        </span>
      </span>
    </Link>
  </li>;
}
