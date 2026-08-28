import Link from "next/link";
import { CopyButton } from "@vela/ui/vela/copy-button";
import { CheckmarkCircle01Icon, MinusSignCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { AssertionText } from "@/components/vela/assertion-text";
import { Disclosure } from "@/components/vela/disclosure";
import { Reach } from "@/components/vela/reach";
import { problemReachCaption, problemReachStops } from "@/lib/problem-reach";
import { currentReview } from "@/components/vela/problem-provenance";
import { formatDate } from "@/lib/format";
import { problemReading, problemSourceResolution } from "@/lib/problem-reading";
import { problemOpening } from "@/lib/problem-opening";
import { activityStrings } from "@/components/vela/problem-activity-records";
import type { ProblemNeighbourhood, ScientificProblemState } from "@/lib/scientific-state";
import { exactResultHeadline, exactResultLimitation } from "@/components/vela/problem-overview-reference";
import styles from "./problem-overview.module.css";

type State = NonNullable<ScientificProblemState>;

function humanize(value: string | null | undefined, fallback = "Not recorded") {
  return value?.replaceAll("_", " ").replaceAll("-", " ") || fallback;
}

function sentenceCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function metadataString(state: State, key: string) {
  const value = (state.problem.metadata as Record<string, unknown> | null)?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/* What a Claim replaced, and what replaced it.
 *
 * Two Results on Erdős 94 render byte-identical — the same assertion, the same
 * evidence count — separated only by a standing badge, so a reader cannot
 * answer "why is there a second one?" without opening both. The record already
 * carries the answer: a `supersedes` or `corrects` relation naming the Claim it
 * replaced. In a product about lineage, lineage was the missing column.
 *
 * Read in both directions, because a row needs whichever end it is on. */
function claimLineage(claims: Array<{ id: string; record?: unknown }>) {
  const replaces = new Map<string, string>();
  const replacedBy = new Map<string, string>();
  for (const claim of claims) {
    const record = claim.record && typeof claim.record === "object" ? claim.record as { relations?: unknown } : null;
    const relations = Array.isArray(record?.relations) ? record.relations : [];
    for (const candidate of relations) {
      if (!candidate || typeof candidate !== "object") continue;
      const relation = candidate as { kind?: unknown; target_claim_id?: unknown };
      if (!["corrects", "supersedes"].includes(String(relation.kind))) continue;
      if (typeof relation.target_claim_id !== "string") continue;
      replaces.set(claim.id, relation.target_claim_id);
      replacedBy.set(relation.target_claim_id, claim.id);
    }
  }
  return { replaces, replacedBy };
}

export function ProblemOverview({ state, route, neighbourhood }: {
  state: State;
  route: string;
  neighbourhood?: ProblemNeighbourhood | null;
}) {
  const claims = state.claims ?? [];
  const current = claims.find((claim) => claim.id === state.currentClaimId) ?? null;
  const review = currentReview(state);
  const checks = review?.verification_records ?? [];
  const sourceResolution = problemSourceResolution(state);
  const reading = problemReading({ currentAssertion: current?.assertion ?? null, repositoryName: state.repositoryName, sourceResolution });
  const established = current ? exactResultHeadline(current.assertion) : null;
  const limitation = current ? exactResultLimitation(current.assertion) : null;
  const formal = state.sources?.occurrences?.filter((occurrence) => occurrence.formal) ?? [];
  const openFormal = formal.filter((occurrence) => occurrence.formal?.category_label?.toLowerCase() === "open");
  const lastSourceUpdate = metadataString(state, "status_last_update");
  const lineage = claimLineage(claims);

  /* Both readings of a Problem measure the same axis, and so does Work, so the
     derivation lives in one module rather than in each surface that draws it. */
  const reachStops = problemReachStops(state);
  const reachCaption = problemReachCaption(state);

  /* Nothing has been accepted here. That is the state of 1,215 of the 1,217
     Erdős Problems in this release, so it gets a composition of its own rather
     than the rich page with its values removed. */
  if (reading.kind === "no-record" || reading.kind === "source-resolved") {
    return <div className={styles.overview}>
      <div className={styles.column}>
        <div className={styles.answer}>
          <h2 className={styles.answerHeadline}>{reading.headline}</h2>
          {/* One clause. The boundary was stated four times on this screen —
              here, in the reach caption, in a paragraph above the actions, and
              in the rail note — and the track below already draws Decision as
              unreached. Structure carries it; the sentence only names it. */}
          {sourceResolution ? <p className={styles.answerDetail}>No Repository has ruled on it here.</p> : null}
        </div>

        <section className={styles.panel} aria-labelledby="exists-heading">
          <div className={styles.panelHead}>
            <span className={styles.kicker} id="exists-heading">How far the record reaches</span>
            <span className={styles.kicker}>{reachStops.filter((stop) => stop.reached).length} of {reachStops.length} stages</span>
          </div>
          <div className={styles.scope}>
            {/* No caption on this branch. The headline states the reading and
                the track's own stages read "Decision · None here" and "The
                question · Not reached" — a caption is the third telling of one
                fact. Work keeps its caption: there the track is the only prose
                in the rail. */}
            <Reach stops={reachStops} endpoint="The question" caption={undefined} />
          </div>
        </section>

        <OpeningPanel state={state} route={route} />

        {neighbourhood ? <NeighbourhoodPanel neighbourhood={neighbourhood} /> : null}

        <div className={styles.actions}>
          <Button nativeButton={false} render={<Link href={`${route}/work`} />}>Start work</Button>
          <Button nativeButton={false} variant="outline" render={<Link href={`${route}/sources`} />}>Open sources</Button>
        </div>
      </div>

      <aside className={styles.rail} aria-label="Problem facts">
        <ProblemFacts lastSourceUpdate={lastSourceUpdate} />
        <ReportedActivityPanel state={state} route={route} />
        <ExactPanel state={state} />
      </aside>
    </div>;
  }

  return <div className={styles.overview}>
    <div className={styles.column}>
      <div className={styles.answer}>
        <h2 className={styles.answerHeadline}>{reading.headline}</h2>
        {limitation
          ? <p className={styles.answerDetail}><AssertionText text={sentenceCase(limitation)} /></p>
          : <p className={styles.answerDetail}>The accepted Claim records no limitation on its own scope, so this page cannot say what it leaves open.</p>}
      </div>

      <section className={styles.panel} aria-labelledby="reach-heading">
        <div className={styles.panelHead}>
          <span className={styles.kicker} id="reach-heading">How far the record reaches</span>
          <span className={styles.kicker}>{reachStops.filter((stop) => stop.reached).length} of {reachStops.length} stages</span>
        </div>
        <div className={styles.scope}>
          <Reach stops={reachStops} endpoint="The question" caption={reachCaption} />
        </div>
      </section>

      {/* The containment figure carries what the track cannot: the two
          statements themselves, and which one sits inside the other. Drawn only
          where the Claim asserts the containment itself. */}
      {limitation ? <section className={styles.panel} aria-labelledby="scope-heading">
        <div className={styles.panelHead}>
          <span className={styles.kicker} id="scope-heading">Scope of what is proved</span>
        </div>
        <div className={styles.scope}>
          <div className={styles.scopeOuter}>
            {/* The outer region names the question; it no longer reprints it.
                The question is now the page's h1 in full, a few hundred pixels
                above, so setting the same statement again here put one long
                mathematical sentence on the screen twice. The figure's job is
                the containment relation, and containment needs the boundary
                labelled, not restated. */}
            <div className={styles.scopeRow}>
              <span className={styles.scopeLabel}>The question above</span>
              <Badge variant="outline">Not established here</Badge>
            </div>
            <div className={styles.scopeInner}>
              <div className={styles.scopeRow}>
                <span className={styles.scopeLabel}>Proved and accepted</span>
                <Badge variant="outline" className="capitalize">{humanize(current?.standing)}</Badge>
              </div>
              {established ? <p className={styles.scopeText}><AssertionText text={established} /></p> : null}
            </div>
          </div>
        </div>
      </section> : null}

      {/* "Results", not "Claims". These are the same `state.claims` records the
          section tab above calls Results, and `kindLabel` in product-language
          already maps `claim` to `Result` for every other reader-facing
          surface. One record wearing two ontological nouns is the worst
          available slip in a product whose thesis is that Claim, Verification,
          Decision and Standing are separate axes — a reader cannot tell
          whether the difference is vocabulary or substance. */}
      <section className={styles.panel} aria-labelledby="results-heading">
        <div className={styles.panelHead}>
          <span className={styles.kicker} id="results-heading">Results</span>
          <span className={styles.kicker}>{claims.length}</span>
        </div>
        {claims.map((claim) => <div
          key={claim.id}
          className={`${styles.row} ${claim.id === state.currentClaimId ? styles.rowCurrent : ""}`}
          style={{ gridTemplateColumns: "minmax(0,1fr) 7.5rem" }}
        >
          <div className={styles.rowTitle}>
            <AssertionText text={exactResultHeadline(claim.assertion) ?? claim.assertion} />
            <div className={styles.rowMeta}>
              {claim.created ? <>{formatDate(claim.created)} · </> : null}
              {claim.evidence_count ?? 0} {claim.evidence_count === 1 ? "evidence item" : "evidence items"}
              {lineage.replaces.has(claim.id) ? " · replaces an earlier Result" : ""}
              {lineage.replacedBy.has(claim.id) ? " · replaced by a later Result" : ""}
              {claim.id === state.currentClaimId ? " · current" : ""}
            </div>
          </div>
          <Badge variant="outline" className="justify-self-start capitalize">{humanize(claim.standing)}</Badge>
        </div>)}
      </section>

      <section className={styles.panel} aria-labelledby="checks-heading">
        <div className={styles.panelHead}>
          <span className={styles.kicker} id="checks-heading">Checks</span>
          <span className={styles.kicker}>{checks.length} scoped</span>
        </div>
        {checks.length ? checks.map((check) => <div
          key={check.verification_record_id}
          className={styles.row}
          style={{ gridTemplateColumns: "1.25rem minmax(0,1fr) 4.5rem" }}
        >
          <HugeiconsIcon
            icon={check.outcome === "pass" ? CheckmarkCircle01Icon : MinusSignCircleIcon}
            aria-hidden
            className={check.outcome === "pass" ? "size-4 text-status-progress" : "size-4 text-muted-foreground"}
          />
          {/* The row used to print `check.property` twice — once sentence-cased
              as the title, then again under it as "Scope: …". Same string, no
              second reading. What a check does not establish is the fact worth
              adding here, and it is the one a reader is most likely to assume
              away; where the record has none, the title stands alone. */}
          <div className={styles.rowTitle}>
            {sentenceCase(humanize(check.property, "Scope not recorded"))}
            {check.does_not_establish?.length
              ? <div className={styles.rowMeta}>Does not establish: {check.does_not_establish.join(" ")}</div>
              : null}
          </div>
          <span className="text-right text-[0.78125rem] capitalize">{humanize(check.outcome)}</span>
        </div>) : <div className={styles.note}>No check is retained for this Problem.</div>}
        {/* Kept, shortened: a reader who takes a passing check for acceptance
            has misread the product's central distinction. */}
        {checks.length ? <div className={styles.note}>
          A check reports only its own scope. The Decision accepted the Claim, not the check.
        </div> : null}
      </section>

      <div className={styles.actions}>
        <Button nativeButton={false} render={<Link href={`${route}/results`} />}>Inspect evidence</Button>
        <Button nativeButton={false} variant="outline" render={<Link href={`/repositories/${state.repositorySlug}/reproduce`} />}>Reproduce checks</Button>
        <Button nativeButton={false} variant="outline" render={<Link href={`${route}/work`} />}>Start work</Button>
      </div>
    </div>

    <aside className={styles.rail} aria-label="Problem facts">
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.kicker}>Authority</span>
          <span className={styles.kicker}>Repository-local</span>
        </div>
        <div className={styles.fact}><span className={styles.factKey}>Repository</span><span className={styles.factValue}>{state.repositoryName}</span></div>
        <div className={styles.fact}><span className={styles.factKey}>Decision</span><span className={`${styles.factValue} capitalize`}>{review ? humanize(review.status) : "None"}</span></div>
        <div className={styles.fact}><span className={styles.factKey}>Recorded</span><span className={styles.factValue}>{formatDate(review?.reviewed_at ?? review?.created_at ?? null)}</span></div>
        {review?.reviewed_by ? <div className={`${styles.fact} ${styles.factStack}`}>
          <span className={styles.factKey}>Decided by</span>
          <span className={`${styles.factValue} ${styles.exact}`}>{review.reviewed_by}</span>
        </div> : null}
        {/* The sentence, then the field. "Problem Standing: Not recorded" is
            two pieces of protocol in four words: that a Problem carries a
            Standing of its own, and that it is separate from the Result just
            accepted above. Both facts matter, and neither survives the reader
            not already knowing them. */}
        <div className={styles.factStack}>
          <span className={styles.factKey}>The question itself</span>
          <span className={styles.factValue} style={{ fontWeight: 400 }}>No Repository has ruled on it</span>
          <span className={styles.exact}>problem_standing: not_recorded</span>
        </div>
      </section>

      <ProblemFacts lastSourceUpdate={lastSourceUpdate} openFormal={openFormal.length} formal={formal.length} />
      <ExactPanel state={state} />
    </aside>
  </div>;
}

function ProblemFacts({ lastSourceUpdate, openFormal, formal }: {
  lastSourceUpdate: string | null;
  openFormal?: number;
  formal?: number;
}) {
  return <section className={styles.panel}>
    <div className={styles.panelHead}>
      <span className={styles.kicker}>Source axes</span>
      <span className={styles.kicker}>Attributed</span>
    </div>
    {/* The source's own word is no longer restated here. It is the page's
        headline where the source records a finding, and it is a stage on the
        reach axis in every case — so this row was the third telling of one
        fact, and the only one of the three that gave it no context. What
        remains is what the axis does not carry: when the source last touched
        the record, and how much of it is formal. */}
    {typeof formal === "number" ? <div className={styles.fact}>
      <span className={styles.factKey}>Formal declarations</span>
      <span className={styles.factValue}>{formal}{openFormal ? ` · ${openFormal} open` : ""}</span>
    </div> : null}
    <div className={styles.fact}>
      <span className={styles.factKey}>Source updated</span>
      <span className={styles.factValue}>{lastSourceUpdate ? formatDate(lastSourceUpdate) : "Not recorded"}</span>
    </div>
  </section>;
}

function ExactPanel({ state }: { state: State }) {
  /* Copy controls, because these are the values a reader takes somewhere else.
     The panel printed three 64-character roots with no way to lift one: the
     reproduce runbook has copy buttons on every command, and the identity panel
     — the reason to trust any of it — had none. Selecting the row by hand also
     took the label with the value, which is what `factStack` was hiding. */
  const roots = [
    { label: "Problem record", value: state.anchor.problemRecordRoot },
    { label: "Projection", value: state.anchor.projectionReleaseRoot },
    { label: "Source commit", value: state.anchor.sourceCommit },
  ];
  return <Disclosure className={styles.panel} summary="Exact roots" meta="What this page read">
    <div>
      {roots.map(({ label, value }) => <div key={label} className={`${styles.fact} ${styles.factStack}`}>
        <span className={styles.factKey}>{label}</span>
        <span className={`${styles.factValue} ${styles.exact} break-all`}>
          {value}
          {value ? <CopyButton compact value={String(value)} label={`Copy ${label.toLowerCase()}`} /> : null}
        </span>
      </div>)}
      {/* The agent interface, said once, where machine-facing identity already
          lives. This page registers typed operations on `document.modelContext`,
          which nothing visible announced — so an agent that was not already
          driving the page, and every person evaluating the product, saw no sign
          the capability existed. A strategy review of this site concluded the
          interface had not been built. It had; it was only unannounced. */}
      <p className={`${styles.note} mt-3`}>
        This page exposes typed read and Work operations to a browser agent.{" "}
        <a href="/llms.txt" className="font-medium text-foreground underline underline-offset-4">llms.txt</a>{" "}
        names them and the boundary they cannot cross.
      </p>
    </div>
  </Disclosure>;
}

/* The stage this record has not reached, and what reaching it takes.
 *
 * The empty Problem is the most-opened screen in the product and had the least
 * on it: an identity, a locator, and a track saying the record goes no further.
 * A reader willing to help could not learn what helping would consist of. This
 * says it, derived from the same reach axis drawn above, and its last stage is
 * deliberately one this site cannot perform. */
function OpeningPanel({ state, route }: { state: State; route: string }) {
  const opening = problemOpening(state, route);
  if (!opening) return null;
  return <section className={styles.panel} aria-labelledby="opening-heading">
    <div className={styles.panelHead}>
      <span className={styles.kicker} id="opening-heading">What this record is missing</span>
      <span className={styles.kicker}>{opening.stage}</span>
    </div>
    <div className={styles.scope}>
      <p className={styles.scopeText} style={{ marginTop: 0, fontWeight: 500 }}>{opening.missing}</p>
      <p className={styles.scopeText}>{opening.step}</p>
      {opening.action ? <div className={styles.actions}>
        <Button nativeButton={false} size="sm" variant="outline" render={<a href={opening.action.href} />}>{opening.action.label}</Button>
      </div> : null}
    </div>
  </section>;
}

/* Where this Problem sits, in its source's own filing.
 *
 * Every Topic here was written onto this Problem by the source that owns it.
 * Nothing is computed, scored or ranked, and the siblings are in the source's
 * own identifier order — a "problems you might like" list is exactly what the
 * product's claims boundary forbids, and the difference between that and this
 * is that this one asserts no judgement about any of them. */
function NeighbourhoodPanel({ neighbourhood }: { neighbourhood: ProblemNeighbourhood }) {
  return <section className={styles.panel} aria-labelledby="neighbourhood-heading">
    <div className={styles.panelHead}>
      <span className={styles.kicker} id="neighbourhood-heading">Where the source files it</span>
      <span className={styles.kicker}>{neighbourhood.total} share a topic</span>
    </div>
    <div className={styles.topics}>
      {neighbourhood.topics.map((topic) => <Link key={topic.key} href={topic.href} className={styles.topic}>
        <span>{topic.name}</span>
        <span className={styles.topicCount}>{topic.problemCount}</span>
      </Link>)}
    </div>
    {neighbourhood.recorded.length ? <>
      {neighbourhood.recorded.map((sibling) => <Link key={sibling.path} href={sibling.path} className={`${styles.row} ${styles.siblingRow}`}>
        <span className={styles.rowTitle}>{sibling.label}</span>
        <span className={styles.rowMeta} style={{ marginTop: 0, textAlign: "right" }}>{humanize(sibling.standing)}</span>
      </Link>)}
      <div className={styles.note}>
        Carrying a Standing. <Link href={neighbourhood.href} className={styles.noteLink}>Browse the topic</Link>.
      </div>
    </> : <div className={styles.note}>
      None carries a Standing. <Link href={neighbourhood.href} className={styles.noteLink}>Browse the topic</Link>.
    </div>}
  </section>;
}

/* Who has touched this question, where a source reports it.
 *
 * The Work tab already counts these records and renders them in full. The count
 * is not the fact a reader wants on an otherwise-empty page — a bare "3" says
 * nothing, and "Codex, GPT-5.2 Thinking" says who. Human and machine performers
 * are weighted the same, and none of this carries Standing. */
function ReportedActivityPanel({ state, route }: { state: State; route: string }) {
  const entries = state.attributedRecords ?? [];
  if (!entries.length) return null;
  const performers = new Map<string, string>();
  for (const { occurrence, record } of entries) {
    const metadata = record.metadata as Record<string, unknown>;
    for (const name of activityStrings(metadata.ai_systems).concat(
      activityStrings(metadata.model),
      activityStrings(metadata.humans),
      activityStrings(metadata.human_collaborators),
    )) if (!performers.has(name)) performers.set(name, occurrence.source_label);
  }
  if (!performers.size) return null;
  return <section className={styles.panel}>
    <div className={styles.panelHead}>
      <span className={styles.kicker}>Reported activity</span>
      <span className={styles.kicker}>{entries.length} {entries.length === 1 ? "record" : "records"}</span>
    </div>
    {[...performers].slice(0, 6).map(([name, source]) => <div key={name} className={styles.fact}>
      <span className={styles.factKey}>{source}</span>
      <span className={styles.factValue}>{name}</span>
    </div>)}
    <div className={styles.note}>
      Reported, not reviewed. <Link href={`${route}/work`} className={styles.noteLink}>The records</Link>.
    </div>
  </section>;
}
