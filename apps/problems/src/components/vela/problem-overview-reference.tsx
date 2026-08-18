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

function exactResultHeadline(assertion: string) {
  const match = assertion.match(/\bestablishes\s+([^,]+),\s+which/u);
  if (!match?.[1]) return null;
  return `${match[1].charAt(0).toUpperCase()}${match[1].slice(1)}`;
}

function exactUnresolvedSentence(assertion: string) {
  return assertion
    .split(/(?<=[.!?])\s+/u)
    .find((sentence) => /does not establish|not a proof/u.test(sentence)) ?? null;
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
      <div className={styles.heroMain}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-eyebrow font-semibold uppercase tracking-[0.14em] text-[color:var(--ref-hero-muted)]">
            <Link href={collectionHref} className="rounded-sm underline-offset-4 hover:text-[color:var(--ref-hero-fg)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--ref-hero-fg)]">{collectionName}</Link>
            <span aria-hidden className="text-[color:var(--ref-hero-faint)]">/</span>
            <span className="font-mono normal-case tracking-normal text-[color:var(--ref-hero-fg)]">#{problemNumber}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button nativeButton={false} size="sm" className="bg-[color:var(--ref-hero-fg)] text-[color:var(--ref-hero-bg)] hover:opacity-90" render={<Link href={`${route}?view=work`} />}>Start work</Button>
            {statement?.locatorUrl ? <Button nativeButton={false} size="sm" variant="outline" className="border-[color:var(--ref-hero-line)] bg-transparent text-[color:var(--ref-hero-fg)] hover:bg-[color:var(--ref-hero-hover)] hover:text-[color:var(--ref-hero-fg)]" render={<a href={statement.locatorUrl} />}>
              Source <HugeiconsIcon icon={ArrowUpRight01Icon} aria-hidden className="size-3.5" />
            </Button> : null}
          </div>
        </div>
        <h1 className={styles.question}>{statement?.form === "prose" && question ? <ScientificText text={question} /> : state.problem.label}</h1>
        <p className="mt-4 max-w-2xl text-compact leading-6 text-[color:var(--ref-hero-muted)]">
          {statement ? <>Question retained from <span className="font-medium text-[color:var(--ref-hero-fg)]">{statement.sourceLabel}</span></> : "No written source statement is retained."}
        </p>
      </div>
      <dl className={styles.heroRail}>
        <div className={styles.heroFact}>
          <dt className="text-micro font-semibold uppercase tracking-[0.12em] text-[color:var(--ref-hero-faint)]">Formal targets</dt>
          <dd className={styles.factValue}><span className={styles.statusDot} data-tone="coral" aria-hidden /><span className="truncate capitalize">{formalTargets}</span></dd>
        </div>
        <div className={styles.heroFact}>
          <dt className="text-micro font-semibold uppercase tracking-[0.12em] text-[color:var(--ref-hero-faint)]">Source status</dt>
          <dd className={styles.factValue}><span className={styles.statusDot} data-tone="mint" aria-hidden /><span className="min-w-0 truncate"><span className="font-normal text-[color:var(--ref-hero-muted)]">{collectionName}:</span> <span className="capitalize">{sourceStatus}</span></span></dd>
        </div>
        <div className={styles.heroFact}>
          <dt className="text-micro font-semibold uppercase tracking-[0.12em] text-[color:var(--ref-hero-faint)]">Repository decision</dt>
          <dd className={styles.factValue}><span className={styles.statusDot} data-tone="cobalt" aria-hidden /><span className="truncate capitalize">{current ? `${humanize(current.standing)} contribution` : "No current contribution"}</span></dd>
        </div>
        <div className={styles.heroFact}>
          <dt className="text-micro font-semibold uppercase tracking-[0.12em] text-[color:var(--ref-hero-faint)]">Evidence here</dt>
          <dd className={styles.factValue}><span className={styles.statusDot} aria-hidden /><span className="truncate">{checks.length} {checks.length === 1 ? "check" : "checks"} · {coverage.declarations} formal</span></dd>
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
  const unresolved = current ? exactUnresolvedSentence(current.assertion) : null;
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

  return <div className={`${styles.reference} mt-5`}>
    <div className={styles.overviewGrid}>
      <div className={styles.contentStack}>
        <section aria-labelledby="current-state-heading" className={styles.statePanel}>
          <div className={styles.stateLead}>
            <div className={styles.stateAccent} aria-hidden />
            <div className={styles.stateBody}>
              <p className="text-micro font-bold uppercase tracking-[0.14em] text-[color:var(--ref-cobalt)]">Current state</p>
              <h2 id="current-state-heading" className={`${styles.stateHeadline} mt-3`}>
                {headline ?? (current ? <AssertionText text={current.assertion} /> : "No durable Result is current in this Repository.")}
              </h2>
              {unresolved ? <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 rounded-lg bg-[color:var(--ref-paper-translucent)] px-3 py-3 text-compact leading-5">
                <HugeiconsIcon icon={GitForkIcon} aria-hidden className="mt-0.5 size-4 text-[color:var(--ref-coral)]" />
                <p><span className="font-semibold">Unresolved by this result:</span> <AssertionText text={unresolved} /></p>
              </div> : null}
              {current ? <details className={`${styles.technical} mt-3 rounded-lg border border-[color:var(--ref-line)] bg-[color:var(--ref-paper-translucent)]`}>
                <summary>Read the exact result and limitations</summary>
                <div className="border-t border-[color:var(--ref-line)] px-4 py-4 text-compact leading-6">
                  <p><AssertionText text={current.assertion} /></p>
                  {current.conditions.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-[color:var(--ref-muted)]">{current.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul> : null}
                </div>
              </details> : null}
            </div>
          </div>
          <dl className={styles.stateMeta}>
            <div><dt className="text-micro font-semibold uppercase tracking-wide text-[color:var(--ref-muted)]">Type</dt><dd className="mt-1 text-compact font-semibold capitalize">{current ? humanize(current.assertion_type) : "—"}</dd></div>
            <div><dt className="text-micro font-semibold uppercase tracking-wide text-[color:var(--ref-muted)]">Evidence</dt><dd className="mt-1 text-compact font-semibold">{current?.evidence_count ?? 0} {current?.evidence_count === 1 ? "artifact" : "artifacts"}</dd></div>
            <div><dt className="text-micro font-semibold uppercase tracking-wide text-[color:var(--ref-muted)]">Reviewed</dt><dd className="mt-1 text-compact font-semibold">{formatSourceDate(review?.reviewed_at ?? null)}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="known-heading" className={styles.section}>
          <div className={styles.sectionHead}>
            <div><h2 id="known-heading" className={styles.sectionTitle}>Known landmarks</h2><p className="mt-1 text-compact text-[color:var(--ref-muted)]">Exact retained formal statements, not inferred scientific claims.</p></div>
            <Link href={`${route}?view=sources`} className="inline-flex items-center gap-1 text-compact font-semibold text-[color:var(--ref-cobalt)] underline-offset-4 hover:underline">All sources <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="size-3.5" /></Link>
          </div>
          {landmarks.length ? <figure className={styles.boundFigure}>
            {landmarks.map((occurrence, index) => <div key={occurrence.occurrence_key} className={styles.boundRow} data-bound={index === 0 ? "first" : "second"}>
              <div><p className="text-micro font-bold uppercase tracking-[0.12em] text-[color:var(--ref-muted)]">{humanize(occurrence.native_id.split(".").at(-1), "Formal statement")}</p><p className="mt-1 text-micro text-[color:var(--ref-muted)]">{humanize(occurrence.formal?.category_label, "Retained")}</p></div>
              <div className="min-w-0"><div className={styles.boundBar} aria-hidden /><p className="mt-2 overflow-x-auto font-mono text-meta leading-5"><ScientificText text={occurrence.summary ?? ""} /></p></div>
              {occurrence.locators.find((locator) => locator.url)?.url ? <a href={occurrence.locators.find((locator) => locator.url)?.url ?? "#"} className="text-meta font-semibold text-[color:var(--ref-cobalt)] underline-offset-4 hover:underline">Source</a> : null}
            </div>)}
            <figcaption className="border-t border-[color:var(--ref-line)] px-4 py-2.5 text-meta text-[color:var(--ref-muted)]">Shown from retained source material. Open each Source for its exact declaration, path and revision.</figcaption>
          </figure> : <p className="mt-3 rounded-lg border border-dashed border-[color:var(--ref-line)] p-4 text-compact text-[color:var(--ref-muted)]">No formal landmark is retained for this Problem.</p>}
        </section>

        <section aria-labelledby="latest-result-heading" className={styles.section}>
          <div className={styles.sectionHead}>
            <div><h2 id="latest-result-heading" className={styles.sectionTitle}>Latest result</h2><p className="mt-1 text-compact text-[color:var(--ref-muted)]">Durable output; active drafts and attempts live in Work.</p></div>
            <Link href={`${route}?view=results`} className="inline-flex items-center gap-1 text-compact font-semibold text-[color:var(--ref-cobalt)] underline-offset-4 hover:underline">All results <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="size-3.5" /></Link>
          </div>
          {current ? <div className={styles.resultRow}>
            <span data-check-outcome={dominantCheckOutcome(checks) ?? "none"} className={`${styles.resultGlyph} ${resultCheckPresentation.className}`}><HugeiconsIcon icon={resultCheckPresentation.icon} aria-hidden className="size-5" /></span>
            <div className="min-w-0">
              <p className="font-semibold">{headline ?? humanize(current.assertion_type, "Research result")}</p>
              <p className="mt-1 text-compact text-[color:var(--ref-muted)]">{review?.reviewed_by ?? "Reviewer not retained"} · {formatSourceDate(review?.reviewed_at ?? current.created)}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-meta text-[color:var(--ref-muted)]"><span>{current.evidence_count} evidence artifact</span><span className="capitalize">{checkSummary}</span><span>{current.source_bindings.length} exact source bindings</span></div>
            </div>
            <Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/repositories/${state.repositorySlug}/claims/${encodeURIComponent(current.id)}`} />}>Open result</Button>
          </div> : <p className="mt-3 rounded-lg border border-dashed border-[color:var(--ref-line)] p-4 text-compact text-[color:var(--ref-muted)]">No current Result is retained for this Problem.</p>}
        </section>

        <section aria-labelledby="work-heading" className={styles.section}>
          <div className={styles.sectionHead}>
            <div><h2 id="work-heading" className={styles.sectionTitle}>Work and open formal targets</h2><p className="mt-1 text-compact text-[color:var(--ref-muted)]">What is active or still unproved in the retained material.</p></div>
            <Button nativeButton={false} size="sm" render={<Link href={`${route}?view=work`} />}>Open Work</Button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-foreground p-4 text-background">
              <p className="text-micro font-bold uppercase tracking-[0.12em] text-background/75">Formal targets</p>
              <p className="mt-2 text-title font-medium tracking-tight">{openFormal.length}</p>
              <p className="mt-1 text-compact leading-5 text-background/75">retained declarations labelled open; proofs are not present in the retained file.</p>
            </div>
            <div className="rounded-xl bg-[color:var(--ref-cobalt-soft)] p-4">
              <p className="text-micro font-bold uppercase tracking-[0.12em] text-[color:var(--ref-cobalt)]">Source-reported activity</p>
              <p className="mt-2 text-title font-medium tracking-tight">{activity.length}</p>
              <p className="mt-1 text-compact leading-5 text-[color:var(--ref-muted)]">exact activity record{activity.length === 1 ? "" : "s"}; attribution is shown without implying review quality.</p>
            </div>
          </div>
        </section>
      </div>

      <aside aria-label="Problem facts" className={styles.rail}>
        <section className={styles.railSection}>
          <h2 className="text-compact font-bold">At a glance</h2>
          <dl className="mt-3 space-y-3 text-compact">
            <div><dt className="text-meta text-[color:var(--ref-muted)]">Last source update</dt><dd className="mt-0.5 font-semibold">{formatSourceDate(lastChecked)}</dd></div>
            <div><dt className="text-meta text-[color:var(--ref-muted)]">Current in</dt><dd className="mt-0.5 font-semibold">{state.repositoryName}</dd></div>
            <div><dt className="text-meta text-[color:var(--ref-muted)]">Topics</dt><dd className="mt-1 flex flex-wrap gap-1.5">{(state.problem.tags ?? []).map((tag) => <span key={tag} className="rounded-full bg-[color:var(--ref-paper)] px-2 py-1 text-meta">{tag}</span>)}</dd></div>
          </dl>
        </section>

        <section className={styles.railSection}>
          <h2 className="text-compact font-bold">Representations</h2>
          <div className={styles.representation}><span className={styles.representationIcon}><HugeiconsIcon icon={BookOpen01Icon} aria-hidden className="size-4" /></span><span className="min-w-0 text-compact font-medium">Source question</span><span className="text-meta text-[color:var(--ref-muted)]">1</span></div>
          <div className={styles.representation}><span className={styles.representationIcon}><HugeiconsIcon icon={SourceCodeIcon} aria-hidden className="size-4" /></span><span className="min-w-0 text-compact font-medium">Lean declarations</span><span className="text-meta text-[color:var(--ref-muted)]">{formal.length}</span></div>
          <div className={styles.representation}><span className={styles.representationIcon}><HugeiconsIcon icon={GitForkIcon} aria-hidden className="size-4" /></span><span className="min-w-0 text-compact font-medium">Source records</span><span className="text-meta text-[color:var(--ref-muted)]">{sourceCount}</span></div>
          {oeis.length ? <div className="mt-2 flex flex-wrap gap-1.5">{oeis.map((id) => <a key={id} href={`https://oeis.org/${id}`} className="rounded-md border border-[color:var(--ref-line)] px-2 py-1 font-mono text-meta hover:border-[color:var(--ref-cobalt)]">{id}</a>)}</div> : null}
        </section>

        <section className={styles.railSection}>
          <h2 className="text-compact font-bold">Related problems</h2>
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
