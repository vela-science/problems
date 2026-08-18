import Link from "next/link";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  BookOpen01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  FileCheckIcon,
  GitForkIcon,
  MinusSignCircleIcon,
  SourceCodeIcon,
  WorkIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
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
import styles from "./problem-overview-reference.module.css";

type State = NonNullable<ScientificProblemState>;
export type ProblemReferenceView = "overview" | "work" | "results" | "sources" | "history";

const TABS: Array<{ key: ProblemReferenceView; label: string; icon: typeof BookOpen01Icon }> = [
  { key: "overview", label: "Overview", icon: BookOpen01Icon },
  { key: "work", label: "Work", icon: WorkIcon },
  { key: "results", label: "Results", icon: FileCheckIcon },
  { key: "sources", label: "Sources", icon: SourceCodeIcon },
  { key: "history", label: "History", icon: Clock01Icon },
];

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

export function ProblemReferenceHeader({ state, route, problemNumber, collectionName, collectionHref }: {
  state: State;
  route: string;
  problemNumber: string;
  collectionName: string;
  collectionHref: string;
}) {
  const statement = resolveProblemStatement(state);
  const { question } = statementParagraphs(statement);
  const current = state.claims.find((claim) => claim.id === state.currentClaimId) ?? null;
  const review = currentReview(state);
  const checks = review?.verification_records ?? [];
  const coverage = formalCoverage(state);
  const formalTargets = summarizeFormalTargets(state.sources.occurrences);
  const sourceStatus = humanize(state.problem.declared_status, "Not stated");

  return <div className={styles.reference}>
    <header className={styles.hero}>
      <div className={styles.heroTopline}>
        <p className={styles.identity}>
          <Link href={collectionHref}>{collectionName}</Link>
          <span aria-hidden>/</span>
          <span className="font-mono">#{problemNumber}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button nativeButton={false} size="sm" render={<Link href={`${route}?view=work`} />}>Start work</Button>
          {statement?.locatorUrl ? <Button nativeButton={false} size="sm" variant="outline" render={<a href={statement.locatorUrl} />}>
            Open source <HugeiconsIcon icon={ArrowUpRight01Icon} aria-hidden className="size-3.5" />
          </Button> : null}
        </div>
      </div>
      <h1 className={styles.question}>{statement?.form === "prose" && question ? <ScientificText text={question} /> : state.problem.label}</h1>
      <p className={styles.sourceLine}>{statement ? <>Retained from <span>{statement.sourceLabel}</span></> : "No written source statement is retained."}</p>
      <dl className={styles.heroRail}>
        <div className={styles.heroFact}>
          <dt>Formal targets</dt>
          <dd><span className={styles.statusDot} data-tone="warning" aria-hidden /><span className="capitalize">{formalTargets}</span></dd>
        </div>
        <div className={styles.heroFact}>
          <dt>Source status</dt>
          <dd><span className={styles.statusDot} data-tone="source" aria-hidden /><span><span className={styles.factQualifier}>{collectionName}:</span> <span className="capitalize">{sourceStatus}</span></span></dd>
        </div>
        <div className={styles.heroFact}>
          <dt>Repository decision</dt>
          <dd><span className={styles.statusDot} data-tone="primary" aria-hidden /><span className="capitalize">{current ? `${humanize(current.standing)} contribution` : "No current contribution"}</span></dd>
        </div>
        <div className={styles.heroFact}>
          <dt>Checks and sources</dt>
          <dd><span className={styles.statusDot} data-tone="evidence" aria-hidden /><span>{checks.length} {checks.length === 1 ? "check" : "checks"} · {coverage.declarations} formal</span></dd>
        </div>
      </dl>
    </header>
  </div>;
}

export function ProblemReferenceTabs({ route, current }: { route: string; current: ProblemReferenceView }) {
  return <nav aria-label="Problem sections" className={`${styles.reference} ${styles.tabs}`}>
    {TABS.map((tab) => <Link
      key={tab.key}
      href={tab.key === "overview" ? route : `${route}?view=${tab.key}`}
      aria-current={current === tab.key ? "page" : undefined}
      data-active={current === tab.key}
      className={styles.tab}
    >
      <HugeiconsIcon icon={tab.icon} aria-hidden className="size-4" />
      {tab.label}
    </Link>)}
  </nav>;
}

export function ProblemOverviewReference({ state, route }: { state: State; route: string }) {
  const current = state.claims.find((claim) => claim.id === state.currentClaimId) ?? null;
  const review = currentReview(state);
  const checks = review?.verification_records ?? [];
  const headline = current ? exactResultHeadline(current.assertion) : null;
  const unresolved = current ? exactResultLimitation(current.assertion) : null;
  const formal = state.sources.occurrences.filter((occurrence) => occurrence.formal && occurrence.summary?.trim());
  const reviewedFormal = formal.filter((occurrence) => occurrence.formal?.category_label?.toLowerCase() !== "open");
  const landmarks = (reviewedFormal.length ? reviewedFormal : formal).slice(0, 2);
  const sourceCount = state.problem.source_count ?? new Set(state.sources.occurrences.map((occurrence) => occurrence.source_id)).size;
  const lastChecked = metadataString(state, "status_last_update");
  const oeis = (state.problem.oeis ?? []).filter((id) => /^A\d+$/u.test(id));
  const openFormal = formal.filter((occurrence) => occurrence.formal?.category_label?.toLowerCase() === "open");
  const activity = state.attributedRecords ?? [];
  const checkSummary = summarizeCheckOutcomes(checks);
  const resultCheckPresentation = checkPresentation(checks);
  const producer = review?.producer_package?.producer_actor ?? null;
  const sourceBindings = current?.source_bindings ?? [];

  return <div className={`${styles.reference} mt-6`}>
    <div className={styles.overviewGrid}>
      <div className={styles.contentStack}>
        <section aria-labelledby="current-state-heading" className={styles.statePanel}>
          <div className={styles.stateBody}>
            <div className={styles.resultObjectHeader}>
              <div className="flex min-w-0 items-center gap-3">
                <span data-check-outcome={dominantCheckOutcome(checks) ?? "none"} className={`${styles.resultGlyph} ${resultCheckPresentation.className}`}><HugeiconsIcon icon={resultCheckPresentation.icon} aria-hidden className="size-5" /></span>
                {producer ? <Performer name={producer} detail={`Result performer · ${humanize(current?.assertion_type, "research result")}`} /> : <div><p className={styles.sectionKicker}>Current Result</p><p className="mt-0.5 text-meta text-[color:var(--ref-muted)]">Durable output in {state.repositoryName}</p></div>}
              </div>
              <div className="flex flex-wrap items-center gap-2"><Badge>Current Result</Badge>{current ? <Badge variant="outline" className="capitalize">{humanize(current.standing)}</Badge> : null}</div>
            </div>
            <h2 id="current-state-heading" className={`${styles.stateHeadline} mt-4`}>
                {headline ?? (current ? <AssertionText text={current.assertion} /> : "No durable Result is current in this Repository.")}
            </h2>
            {unresolved ? <div className={styles.unresolved}>
              <HugeiconsIcon icon={GitForkIcon} aria-hidden className="mt-0.5 size-4 text-status-caution" />
              <p><span className="font-semibold">Still unresolved:</span> <AssertionText text={unresolved} /></p>
            </div> : null}
            {current ? <details className={`${styles.technical} mt-4`}>
              <summary>Exact result and limitations</summary>
              <div className={styles.technicalBody}>
                <p><AssertionText text={current.assertion} /></p>
                {current.conditions.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-[color:var(--ref-muted)]">{current.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul> : null}
              </div>
            </details> : null}
            {current ? <div className={styles.relationshipStrip}>
              <Link href={`${route}?view=results`} className="vela-object-row">
                <span className={`${styles.relationshipIcon} ${resultCheckPresentation.className}`}><HugeiconsIcon icon={resultCheckPresentation.icon} aria-hidden className="size-4" /></span>
                <span><strong className="capitalize">{checkSummary}</strong><small>{checks.length ? "Open scoped check output" : "No retained check output"}</small></span>
                <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="size-4 text-muted-foreground" />
              </Link>
              <Link href={`${route}?view=sources`} className="vela-object-row">
                <span className={`${styles.relationshipIcon} bg-status-evidence/10 text-status-evidence`}><HugeiconsIcon icon={SourceCodeIcon} aria-hidden className="size-4" /></span>
                <span><strong>{sourceBindings.length} exact {sourceBindings.length === 1 ? "source link" : "source links"}</strong><small>Browse declarations and retained excerpts</small></span>
                <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="size-4 text-muted-foreground" />
              </Link>
            </div> : null}
          </div>
          <dl className={styles.stateMeta}>
            <div><dt>Type</dt><dd className="capitalize">{current ? humanize(current.assertion_type) : "—"}</dd></div>
            <div><dt>Evidence</dt><dd>{current?.evidence_count ?? 0} {current?.evidence_count === 1 ? "artifact" : "artifacts"}</dd></div>
            <div><dt>Decision</dt><dd className="capitalize">{review ? humanize(review.status) : "None"}</dd></div>
            <div><dt>Reviewed</dt><dd>{formatSourceDate(review?.reviewed_at ?? null)}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="known-heading" className={styles.section}>
          <div className={styles.sectionHead}>
            <div><h2 id="known-heading" className={styles.sectionTitle}>Known landmarks</h2><p className="mt-1 text-compact text-[color:var(--ref-muted)]">Retained formal statements from exact sources.</p></div>
            <Link href={`${route}?view=sources`} className="inline-flex items-center gap-1 text-compact font-semibold text-[color:var(--ref-cobalt)] underline-offset-4 hover:underline">All sources <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="size-3.5" /></Link>
          </div>
          {landmarks.length ? <figure className={styles.boundFigure}>
            {landmarks.map((occurrence, index) => <div key={occurrence.occurrence_key} className={styles.boundRow} data-bound={index === 0 ? "first" : "second"}>
              <div><p className="text-compact font-semibold">{humanize(occurrence.native_id.split(".").at(-1), "Formal statement")}</p><p className="mt-1 text-meta capitalize text-[color:var(--ref-muted)]">{humanize(occurrence.formal?.category_label, "Retained")}</p></div>
              <div className="min-w-0"><p className="overflow-x-auto font-mono text-meta leading-5"><ScientificText text={occurrence.summary ?? ""} /></p></div>
              {occurrence.locators.find((locator) => locator.url)?.url ? <a href={occurrence.locators.find((locator) => locator.url)?.url ?? "#"} className="text-meta font-semibold text-[color:var(--ref-cobalt)] underline-offset-4 hover:underline">Source</a> : null}
            </div>)}
            <figcaption className="border-t border-[color:var(--ref-line)] px-4 py-2.5 text-meta text-[color:var(--ref-muted)]">Open Sources for exact declarations, paths, and revisions.</figcaption>
          </figure> : <p className="mt-3 rounded-lg border border-dashed border-[color:var(--ref-line)] p-4 text-compact text-[color:var(--ref-muted)]">No formal landmark is retained for this Problem.</p>}
        </section>

        <section aria-labelledby="work-heading" className={styles.section}>
          <div className={styles.sectionHead}>
            <div><h2 id="work-heading" className={styles.sectionTitle}>Open work</h2><p className="mt-1 text-compact text-[color:var(--ref-muted)]">Formal targets and recorded activity.</p></div>
            <Button nativeButton={false} size="sm" render={<Link href={`${route}?view=work`} />}>Open Work</Button>
          </div>
          <div className={styles.workList}>
            <div><span className="font-mono text-title tabular-nums">{openFormal.length}</span><span><strong>Open formal {openFormal.length === 1 ? "target" : "targets"}</strong><small>Retained declarations labelled open</small></span></div>
            <div><span className="font-mono text-title tabular-nums">{activity.length}</span><span><strong>Recorded {activity.length === 1 ? "activity item" : "activity items"}</strong><small>Attributed work retained for this Problem</small></span></div>
          </div>
        </section>
      </div>

      <aside aria-label="Problem facts" className={styles.rail}>
        <section className={styles.railSection}>
          <h2 className="text-compact font-semibold">About this Problem</h2>
          <dl className="mt-3 space-y-3 text-compact">
            <div><dt className="text-meta text-[color:var(--ref-muted)]">Last source update</dt><dd className="mt-0.5 font-semibold">{formatSourceDate(lastChecked)}</dd></div>
            <div><dt className="text-meta text-[color:var(--ref-muted)]">Current in</dt><dd className="mt-0.5 font-semibold">{state.repositoryName}</dd></div>
            <div><dt className="text-meta text-[color:var(--ref-muted)]">Topics</dt><dd className="mt-1 flex flex-wrap gap-1.5">{(state.problem.tags ?? []).map((tag) => <span key={tag} className="rounded-full bg-[color:var(--ref-paper)] px-2 py-1 text-meta">{tag}</span>)}</dd></div>
          </dl>
        </section>

        <section className={styles.railSection}>
          <h2 className="text-compact font-semibold">Representations</h2>
          <div className={styles.representation}><span className={styles.representationIcon}><HugeiconsIcon icon={BookOpen01Icon} aria-hidden className="size-4" /></span><span className="min-w-0 text-compact font-medium">Source question</span><span className="text-meta text-[color:var(--ref-muted)]">1</span></div>
          <div className={styles.representation}><span className={styles.representationIcon}><HugeiconsIcon icon={SourceCodeIcon} aria-hidden className="size-4" /></span><span className="min-w-0 text-compact font-medium">Lean declarations</span><span className="text-meta text-[color:var(--ref-muted)]">{formal.length}</span></div>
          <div className={styles.representation}><span className={styles.representationIcon}><HugeiconsIcon icon={GitForkIcon} aria-hidden className="size-4" /></span><span className="min-w-0 text-compact font-medium">Source records</span><span className="text-meta text-[color:var(--ref-muted)]">{sourceCount}</span></div>
          {oeis.length ? <div className="mt-2 flex flex-wrap gap-1.5">{oeis.map((id) => <a key={id} href={`https://oeis.org/${id}`} className="rounded-md border border-[color:var(--ref-line)] px-2 py-1 font-mono text-meta hover:border-[color:var(--ref-cobalt)]">{id}</a>)}</div> : null}
        </section>

        <section className={styles.railSection}>
          <h2 className="text-compact font-semibold">Related problems</h2>
          <p className="mt-2 text-compact leading-5 text-[color:var(--ref-muted)]">No exact related-Problem relationship is retained for this release.</p>
          <Link href={`/graph?repository=${state.repositorySlug}&lens=research${current ? `&node=${encodeURIComponent(current.id)}` : ""}`} className="mt-3 inline-flex items-center gap-1 text-compact font-semibold text-[color:var(--ref-cobalt)] underline-offset-4 hover:underline">Open exact map <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="size-3.5" /></Link>
        </section>

        <details className={`${styles.technical} border-t border-[color:var(--ref-line)]`}>
          <summary>Technical identity</summary>
          <dl className="space-y-3 border-t border-[color:var(--ref-line)] px-4 py-4 text-meta">
            <div><dt className="text-[color:var(--ref-muted)]">Problem record</dt><dd className="mt-1 break-all font-mono">{state.anchor.problemRecordRoot}</dd></div>
            <div><dt className="text-[color:var(--ref-muted)]">Projection</dt><dd className="mt-1 break-all font-mono">{state.anchor.projectionReleaseRoot}</dd></div>
            <div><dt className="text-[color:var(--ref-muted)]">Source commit</dt><dd className="mt-1 break-all font-mono">{state.anchor.sourceCommit}</dd></div>
          </dl>
        </details>
      </aside>
    </div>
  </div>;
}
