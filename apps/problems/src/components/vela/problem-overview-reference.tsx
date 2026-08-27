import Link from "next/link";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  BookOpen01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  GitForkIcon,
  MinusSignCircleIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Performer } from "@/components/vela/actor";
import { AssertionText } from "@/components/vela/assertion-text";
import { currentReview } from "@/components/vela/problem-provenance";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { formatDate } from "@/lib/format";
import {
  formalCoverage,
  resolveProblemStatement,
  statementParagraphs,
} from "@/lib/problem-statement";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { resultConditionPresentation } from "@/lib/result-condition";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@vela/ui/components/item";
import styles from "./problem-overview-reference.module.css";
import { Disclosure } from "@/components/vela/disclosure";
import { Problem94TransitionPilot } from "@/components/vela/problem-transition-pilot";

type State = NonNullable<ScientificProblemState>;
export type ProblemReferenceView = "overview" | "work" | "results" | "sources" | "history";

function humanize(value: string | null | undefined, fallback = "Not recorded") {
  return value?.replaceAll("_", " ") || fallback;
}

function metadataString(state: State, key: string) {
  const value = (state.problem.metadata as Record<string, unknown> | null)?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function exactResultHeadline(assertion: string) {
  const match = assertion.match(/\bestablishes\s+([^,]+),\s+which/u);
  const proved = assertion.match(/\bproves that\s+(.+?),\s+matching\b/u);
  const headline = match?.[1] ?? proved?.[1];
  if (!headline) return null;
  return `${headline.charAt(0).toUpperCase()}${headline.slice(1)}`;
}

export function exactResultLimitation(assertion: string) {
  return assertion
    .split(/(?<=[.!?])\s+/u)
    .find((sentence) => /does not establish|not a proof/u.test(sentence)) ?? null;
}

export function compactResultLimitation(assertion: string) {
  const sentence = exactResultLimitation(assertion);
  if (!sentence) return null;
  const candidate = sentence.match(/\b((?:supplies|this is) a candidate answer)[^,]*,\s+(not a proof[^.]*\.)/iu);
  if (candidate) return `${candidate[1].charAt(0).toUpperCase()}${candidate[1].slice(1)}, ${candidate[2]}`;
  const scoped = sentence.match(/\b(this (?:identity|result|contribution) does not establish[^.]*\.)/iu);
  if (scoped) return `${scoped[1].charAt(0).toUpperCase()}${scoped[1].slice(1)}`;
  return sentence;
}

function formatSourceDate(value: string | null) {
  if (!value) return "No date retained";
  return formatDate(value);
}

export function summarizeFormalTargets(occurrences: Array<{ formal?: { category_label?: string | null } | null }>) {
  const counts = new Map<string, number>();
  for (const occurrence of occurrences) {
    const label = occurrence.formal?.category_label?.trim().toLowerCase();
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  if (!counts.size) return "Not classified";
  const ordered = [...counts].sort(([left], [right]) => {
    if (left === "open") return -1;
    if (right === "open") return 1;
    return left.localeCompare(right);
  });
  return ordered.map(([label, count]) => `${count} ${humanize(label)}`).join(" · ");
}

export function summarizeCheckOutcomes(checks: Array<{ outcome: string }>) {
  if (!checks.length) return "Not checked";
  const labels: Record<string, string> = { pass: "passed", fail: "failed", error: "error", inconclusive: "inconclusive" };
  const priority = ["fail", "error", "inconclusive", "pass"];
  const counts = new Map<string, number>();
  for (const check of checks) counts.set(check.outcome, (counts.get(check.outcome) ?? 0) + 1);
  return [...counts]
    .sort(([left], [right]) => {
      const leftIndex = priority.indexOf(left);
      const rightIndex = priority.indexOf(right);
      return (leftIndex < 0 ? priority.length : leftIndex) - (rightIndex < 0 ? priority.length : rightIndex);
    })
    .map(([outcome, count]) => `${count} ${labels[outcome] ?? humanize(outcome)}`)
    .join(" · ");
}

export function dominantCheckOutcome(checks: Array<{ outcome: string }>) {
  if (checks.some(({ outcome }) => outcome === "fail")) return "fail";
  if (checks.some(({ outcome }) => outcome === "error")) return "error";
  if (checks.some(({ outcome }) => outcome !== "pass")) return "inconclusive";
  return checks.length ? "pass" : null;
}

function checkPresentation(checks: Array<{ outcome: string }>) {
  const outcome = dominantCheckOutcome(checks);
  if (outcome === "fail") return { icon: CancelCircleIcon, className: "bg-destructive/10 text-destructive" };
  if (outcome === "error") return { icon: AlertCircleIcon, className: "bg-status-caution/15 text-status-caution" };
  if (outcome === "inconclusive") return { icon: MinusSignCircleIcon, className: "bg-muted text-muted-foreground" };
  if (outcome === "pass") return { icon: CheckmarkCircle01Icon, className: "bg-status-progress/15 text-status-progress" };
  return { icon: MinusSignCircleIcon, className: "bg-muted text-muted-foreground" };
}

export function ProblemReferenceHeader({ state, collectionName, summary = true }: {
  state: State;
  collectionName: string;
  /* The four facts summarise the Problem, which is Overview's job. Repeating
     them above Sources or History pushed each section's own content down by a
     rail that answered a question the reader had already left. The question
     itself stays on every tab: switching section must not move the hero. */
  summary?: boolean;
}) {
  const statement = resolveProblemStatement(state);
  const { question } = statementParagraphs(statement);
  const current = state.claims.find((claim) => claim.id === state.currentClaimId) ?? null;
  const review = currentReview(state);
  const checks = review?.verification_records ?? [];
  const coverage = formalCoverage(state);
  const formalTargets = summarizeFormalTargets(state.sources.occurrences);
  const sourceStatus = humanize(state.problem.declared_status, "Not stated");
  const transitionPilot = state.problem.source_id === "source:erdos-problems" && state.problem.problem === "94";

  return <div className={styles.reference}>
    <header className={styles.hero}>
      {/* The page is named, and the statement is quoted rather than shouted.
        *
        * A theorem set as a headline — 34px, 650 weight, negative tracking,
        * with inline math inside it and a centred display equation directly
        * below — put two typographic registers in one block and left the page
        * with no title at all. The statement is retained source material, so
        * it is set as quoted material at reading size with its attribution
        * attached, and the Problem's name is the heading.
        *
        * On a section the statement drops to a two-line caption: the section's
        * own content should start on the first screen. */}
      {/* The breadcrumb switcher already names the Problem, so showing it again
        * here says the same thing twice. The heading stays for the document
        * outline and for readers who navigate by heading — a page whose only
        * visible lead is a quotation would otherwise have no h1 at all. */}
      <h1 className="sr-only">
        {collectionName.replace(/ Problems$/u, " problem")} {state.problem.problem}
      </h1>
      {summary ? (
        <figure className={`${styles.statement} ${transitionPilot ? styles.statementPilot : ""}`}>
          <blockquote>
            {statement?.form === "prose" && question ? <ScientificText text={question} /> : state.problem.label}
          </blockquote>
          {statement ? <figcaption>
            Retained from <span>{statement.sourceLabel}</span> · not edited here
          </figcaption> : null}
        </figure>
      ) : (
        <p className={styles.questionCompact}>
          {statement?.form === "prose" && question ? <ScientificText text={question} /> : state.problem.label}
        </p>
      )}
      {/* Provenance only when it carries information. Where the statement came
        * from the collection you are already browsing, saying so adds nothing;
        * the breadcrumb carries the identity. Where it came from a different
        * body, that is a fact about the statement and belongs beside it. */}
      {summary && !statement ? <p className={styles.sourceLine}>No written statement is recorded for this problem.</p> : null}

      {/* One tone across the four facts. A colour per fact read as four
        * independent verdicts, and the reassuring ones were the loud ones. */}
      {summary && !transitionPilot ? <dl className={styles.heroRail}>
        <div className={styles.heroFact}>
          <dt>Formal statements</dt>
          <dd className="capitalize">{formalTargets}</dd>
        </div>
        <div className={styles.heroFact}>
          <dt>{collectionName} says</dt>
          <dd className="capitalize">{sourceStatus}</dd>
        </div>
        <div className={styles.heroFact}>
          <dt>Decision here</dt>
          <dd className="capitalize">{current ? humanize(current.standing) : "No current contribution"}</dd>
        </div>
        <div className={styles.heroFact}>
          <dt>Checks</dt>
          <dd>{checks.length} {checks.length === 1 ? "check" : "checks"} · {coverage.declarations} formal</dd>
        </div>
      </dl> : null}
    </header>
  </div>;
}

export function ProblemOverviewReference({ state, route }: { state: State; route: string }) {
  if (state.problem.source_id === "source:erdos-problems" && state.problem.problem === "94") {
    return <Problem94TransitionPilot state={state} route={route} />;
  }
  const current = state.claims.find((claim) => claim.id === state.currentClaimId) ?? null;
  const review = currentReview(state);
  const checks = review?.verification_records ?? [];
  const headline = current ? exactResultHeadline(current.assertion) : null;
  const unresolved = current ? exactResultLimitation(current.assertion) : null;
  const formal = state.sources.occurrences.filter((occurrence) => occurrence.formal && occurrence.summary?.trim());
  const sourceCount = state.problem.source_count ?? new Set(state.sources.occurrences.map((occurrence) => occurrence.source_id)).size;
  const lastChecked = metadataString(state, "status_last_update");
  const oeis = (state.problem.oeis ?? []).filter((id) => /^A\d+$/u.test(id));
  const openFormal = formal.filter((occurrence) => occurrence.formal?.category_label?.toLowerCase() === "open");
  const activity = state.attributedRecords ?? [];
  const resultCheckPresentation = checkPresentation(checks);
  const producer = review?.producer_package?.producer_actor ?? null;

  return <div className={`${styles.reference} mt-6`}>
    <div className={styles.overviewGrid}>
      <div className={styles.contentStack}>
        <section aria-labelledby="current-state-heading" className={styles.statePanel}>
          <div className={styles.stateBody}>
            <div className={styles.resultObjectHeader}>
              <div className="flex min-w-0 items-center gap-3">
                <span data-check-outcome={dominantCheckOutcome(checks) ?? "none"} className={`${styles.resultGlyph} ${resultCheckPresentation.className}`}><HugeiconsIcon icon={resultCheckPresentation.icon} aria-hidden className="size-5" /></span>
                {producer ? <Performer name={producer} kind="agent" performerId={producer} detail={`Submitted by · ${humanize(current?.assertion_type, "research result")}`} /> : <div><p className={styles.sectionKicker}>Current Result</p><p className="mt-0.5 text-meta text-[color:var(--ref-muted)]">Accepted in {state.repositoryName}</p></div>}
              </div>
              <div className="flex flex-wrap items-center gap-2"><Badge>Current Result</Badge>{current ? <Badge variant="outline" className="capitalize">{humanize(current.standing)}</Badge> : null}</div>
            </div>
            <h2 id="current-state-heading" className={`${styles.stateHeadline} mt-4`}>
                {headline ?? (current ? <AssertionText text={current.assertion} /> : "No result has been accepted here yet.")}
            </h2>
            {unresolved ? <div className={styles.unresolved}>
              <HugeiconsIcon icon={GitForkIcon} aria-hidden className="mt-0.5 size-4 text-status-caution" />
              <p><span className="font-semibold">Still unresolved:</span> <AssertionText text={unresolved} /></p>
            </div> : null}
            {current ? <Disclosure className={`${styles.technical} mt-4`} summaryClassName={styles.technicalSummary} summary="Exact result and limitations">
              <div className={styles.technicalBody}>
                <p><AssertionText text={current.assertion} /></p>
                {current.conditions.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-[color:var(--ref-muted)]">{current.conditions.map((condition) => <li key={condition}>{resultConditionPresentation(condition)}</li>)}</ul> : null}
              </div>
            </Disclosure> : null}
            {/* The section index below links to Results and Sources with a
                count on each, so a second pair of links to the same two
                places inside the Result card was the same offer twice. */}
          </div>
          <dl className={styles.stateMeta}>
            <div><dt>Type</dt><dd className="capitalize">{current ? humanize(current.assertion_type) : "—"}</dd></div>
            <div><dt>Evidence</dt><dd>{current?.evidence_count ?? 0} {current?.evidence_count === 1 ? "artifact" : "artifacts"}</dd></div>
            <div><dt>Decision</dt><dd className="capitalize">{review ? humanize(review.status) : "None"}</dd></div>
            <div><dt>Reviewed</dt><dd>{formatSourceDate(review?.reviewed_at ?? null)}</dd></div>
          </dl>
        </section>

        {/* An index of the sections that own this material, not a fifth copy
            of them. Overview used to render two Lean declarations in full and
            a pair of work counters — the same statements Sources lists with
            their files and revisions, and the same open statements Work lists
            by name. Each tab now does its own job, so this points at them and
            says how much is behind each. */}
        <nav aria-labelledby="elsewhere-heading" className={styles.section}>
          <h2 id="elsewhere-heading" className={styles.sectionTitle}>The rest of this Problem</h2>
          <ItemGroup className="mt-3 gap-0 divide-y overflow-hidden rounded-lg border">
            {[
              { key: "sources", label: "Sources", detail: `${formal.length} formal ${formal.length === 1 ? "statement" : "statements"}, each with its file and revision` },
              { key: "results", label: "Results", detail: checks.length ? `${checks.length} ${checks.length === 1 ? "check" : "checks"}, what each establishes and what it does not` : "No check is retained for this Problem" },
              { key: "work", label: "Work", detail: `${openFormal.length ? `${openFormal.length} ${openFormal.length === 1 ? "statement" : "statements"} still open` : "Nothing is still marked open"}${activity.length ? `, ${activity.length} recorded ${activity.length === 1 ? "activity item" : "activity items"}` : ""}` },
              { key: "history", label: "History", detail: "Every published change, who decided it, and what any correction altered" },
            ].map((section) => <Item
              key={section.key}
              className="rounded-none border-0 px-3.5 py-2.5 hover:bg-[color:var(--ref-paper)]"
              render={<Link href={`${route}/${section.key}`} />}
            >
              <ItemContent className="gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
                <ItemTitle className="sm:w-28 sm:shrink-0">{section.label}</ItemTitle>
                <ItemDescription className="line-clamp-none">{section.detail}</ItemDescription>
              </ItemContent>
              <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </Item>)}
          </ItemGroup>
        </nav>
      </div>

      <aside aria-label="Problem facts" className={styles.rail}>
        <section className={styles.railSection}>
          <h2 className="text-compact font-semibold">About</h2>
          <dl className="mt-3 space-y-3 text-compact">
            <div><dt className="text-meta text-[color:var(--ref-muted)]">Last source update</dt><dd className="mt-0.5 font-semibold">{formatSourceDate(lastChecked)}</dd></div>
            <div><dt className="text-meta text-[color:var(--ref-muted)]">Recorded in</dt><dd className="mt-0.5 font-semibold">{state.repositoryName}</dd></div>
            <div><dt className="text-meta text-[color:var(--ref-muted)]">Topics</dt><dd className="mt-1 flex flex-wrap gap-1.5">{(state.problem.tags ?? []).map((tag) => <span key={tag} className="rounded-full bg-[color:var(--ref-paper)] px-2 py-1 text-meta">{tag}</span>)}</dd></div>
          </dl>
        </section>

        <section className={styles.railSection}>
          <h2 className="text-compact font-semibold">Appears as</h2>
          <div className={styles.representation}><span className={styles.representationIcon}><HugeiconsIcon icon={BookOpen01Icon} aria-hidden className="size-4" /></span><span className="min-w-0 text-compact font-medium">Source question</span><span className="text-meta text-[color:var(--ref-muted)]">1</span></div>
          <div className={styles.representation}><span className={styles.representationIcon}><HugeiconsIcon icon={SourceCodeIcon} aria-hidden className="size-4" /></span><span className="min-w-0 text-compact font-medium">Lean declarations</span><span className="text-meta text-[color:var(--ref-muted)]">{formal.length}</span></div>
          <div className={styles.representation}><span className={styles.representationIcon}><HugeiconsIcon icon={GitForkIcon} aria-hidden className="size-4" /></span><span className="min-w-0 text-compact font-medium">Source entries</span><span className="text-meta text-[color:var(--ref-muted)]">{sourceCount}</span></div>
          {oeis.length ? <div className="mt-2 flex flex-wrap gap-1.5">{oeis.map((id) => <a key={id} href={`https://oeis.org/${id}`} className="rounded-md border border-[color:var(--ref-line)] px-2 py-1 font-mono text-meta hover:border-[color:var(--ref-cobalt)]">{id}</a>)}</div> : null}
        </section>

        <section className={styles.railSection}>
          <h2 className="text-compact font-semibold">Related problems</h2>
          {/* The release retains no related-Problem relationship, so there is
              nothing for a map link to show under this heading. The research
              map stays reachable from About and the command palette. */}
          <p className="mt-2 text-compact leading-5 text-[color:var(--ref-muted)]">No related problem is recorded in this release.</p>
        </section>

        <Disclosure className={`${styles.technical} border-t border-[color:var(--ref-line)]`} summaryClassName={styles.technicalSummary} summary="Technical details">
          <dl className="space-y-3 border-t border-[color:var(--ref-line)] px-4 py-4 text-meta">
            <div><dt className="text-[color:var(--ref-muted)]">Problem record</dt><dd className="mt-1 break-all font-mono">{state.anchor.problemRecordRoot}</dd></div>
            <div><dt className="text-[color:var(--ref-muted)]">Projection</dt><dd className="mt-1 break-all font-mono">{state.anchor.projectionReleaseRoot}</dd></div>
            <div><dt className="text-[color:var(--ref-muted)]">Source commit</dt><dd className="mt-1 break-all font-mono">{state.anchor.sourceCommit}</dd></div>
          </dl>
        </Disclosure>
      </aside>
    </div>
  </div>;
}
