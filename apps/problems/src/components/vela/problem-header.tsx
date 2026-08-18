import Link from "next/link";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { LeanBlock } from "@/components/vela/lean-block";
import { formalCoverage, problemLabel, resolveProblemStatement, statementParagraphs, STATEMENT_BASIS_NOTE } from "@/lib/problem-statement";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

/* Three questions a reader has before any tab: what is being asked, what the
 * source says about it, and what this Repository has actually reviewed. They
 * are three different axes and they are kept three different facts — a row of
 * identical pills answered none of them. */
function StateFact({ label, value, note, dot }: {
  label: string;
  value: string;
  note?: string | null;
  dot?: "resolved" | "open" | "evidence" | "none";
}) {
  const dotClass = dot === "resolved" ? "bg-status-progress"
    : dot === "evidence" ? "bg-status-evidence"
      : dot === "open" ? "bg-muted-foreground/45" : "";
  return <div className="min-w-0 pl-4 first:pl-0">
    <dt className="text-micro uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-1 flex items-center gap-2">
      {dot && dot !== "none" ? <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${dotClass}`} /> : null}
      <span className="truncate text-compact font-medium text-foreground">{value}</span>
    </dd>
    {note ? <p className="mt-0.5 text-micro text-muted-foreground">{note}</p> : null}
  </div>;
}

export function ProblemHeader({ state, route, problemNumber, collectionName, collectionHref }: {
  state: State;
  route: string;
  /* The address the reader asked for. The projected record carries a number
     too, but the route is the identity that resolved this page. */
  problemNumber: string;
  collectionName: string;
  collectionHref: string;
}) {
  const statement = resolveProblemStatement(state);
  const { question, context } = statementParagraphs(statement);
  const label = problemLabel(state);
  const coverage = formalCoverage(state);
  const sourceStatus = state.problem.declared_status?.replaceAll("_", " ") || "not stated";
  const resolved = ["solved", "proved", "disproved"].some((word) => sourceStatus.toLowerCase().includes(word));
  const reviewed = (state.claims ?? []).filter((claim) => ["accepted", "accepted_with_conditions"].includes(claim.standing)).length;
  const sourceCount = state.problem.source_count
    ?? new Set((state.sources?.occurrences ?? []).map((occurrence) => occurrence.source_id)).size;
  const tags = state.problem.tags ?? [];
  const oeis = (state.problem.oeis ?? []).filter((id) => /^A\d+$/u.test(id));

  return <header className="min-w-0">
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <p className="flex items-center gap-2 text-eyebrow uppercase text-muted-foreground">
        <Link href={collectionHref} className="underline-offset-4 hover:underline">{collectionName}</Link>
        <span aria-hidden>·</span>
        <span className="font-mono normal-case tracking-normal text-foreground">{`#${problemNumber}`}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button nativeButton={false} size="sm" render={<Link href={`${route}?view=workspace`} />}>Add a contribution</Button>
        {statement?.locatorUrl
          ? <Button nativeButton={false} size="sm" variant="outline" render={<a href={statement.locatorUrl} />}>
            Open exact source<HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.8} aria-hidden className="size-3.5" />
          </Button>
          : null}
      </div>
    </div>

    {/* The question itself, in the reader's language where a source wrote one
        down. Vela does not assert that this text *is* the Problem, so the line
        beneath always names who said it and how strong the association is. */}
    {statement ? <div className="mt-4 min-w-0">
      {statement.form === "prose"
        ? <>
          <h1 className="max-w-[62ch] text-statement text-balance"><ScientificText text={question} /></h1>
          {context.length ? <div className="mt-3 max-w-[62ch]">
            {context.map((paragraph, index) => <p key={index} className="mt-2 text-compact leading-6 text-muted-foreground first:mt-0"><ScientificText text={paragraph} /></p>)}
          </div> : null}
        </>
        : <><h1 className="text-title text-muted-foreground">{label}</h1>
          <p className="mt-2 max-w-[62ch] text-compact text-muted-foreground">No source retained a written statement. The formal declaration below is the only statement of this Problem held here.</p>
          <div className="mt-3 max-w-3xl"><LeanBlock code={statement.text} declaration={statement.occurrence?.native_id ?? null} /></div></>}
      <p className="mt-3 text-meta text-muted-foreground">
        as stated by <span className="text-foreground">{statement.sourceLabel}</span>
        <span aria-hidden> · </span>{STATEMENT_BASIS_NOTE[statement.basis]}
      </p>
    </div> : <div className="mt-4">
      <h1 className="text-statement">{label}</h1>
      <p className="mt-3 max-w-[62ch] text-compact text-muted-foreground">
        No source in this release retained a statement for this Problem. The collection records its number, status and topics only.
      </p>
    </div>}

    <dl className="mt-6 flex flex-wrap gap-y-4 divide-x divide-border">
      <StateFact label="Source status" value={sourceStatus} dot={resolved ? "resolved" : "open"} note={`as declared by ${collectionName}`} />
      <StateFact
        label="Formal statement"
        value={coverage.declarations
          ? `${coverage.declarations} ${coverage.declarations === 1 ? "declaration" : "declarations"} in ${coverage.files} ${coverage.files === 1 ? "file" : "files"}`
          : "none retained"}
        dot={coverage.declarations ? "evidence" : "none"}
        note={coverage.declarations
          ? (coverage.proved ? `${coverage.sorryFree} of ${coverage.proved} proved without sorry` : "statements only, no proof present")
          : null}
      />
      <StateFact
        label="Reviewed here"
        value={reviewed ? `${reviewed} current ${reviewed === 1 ? "Contribution" : "Contributions"}` : "no Contribution yet"}
        dot={reviewed ? "resolved" : "none"}
        note={`in ${state.repositoryName}`}
      />
      <StateFact label="Sources" value={`${sourceCount} ${sourceCount === 1 ? "source" : "sources"}`} dot="none" note="describing this Problem" />
    </dl>

    {tags.length || oeis.length ? <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground">
      {tags.map((tag) => <Link key={tag} href={`${collectionHref}?topic=${encodeURIComponent(tag)}`} className="underline-offset-4 hover:text-foreground hover:underline">{tag}</Link>)}
      {oeis.map((id) => <a key={id} href={`https://oeis.org/${id}`} className="font-mono underline-offset-4 hover:text-foreground hover:underline">{id}</a>)}
    </p> : null}
  </header>;
}
