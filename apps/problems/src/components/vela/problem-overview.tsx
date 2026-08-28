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
import { problemReading } from "@/lib/problem-reading";
import type { ScientificProblemState } from "@/lib/scientific-state";
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

export function ProblemOverview({ state, route }: { state: State; route: string }) {
  const claims = state.claims ?? [];
  const current = claims.find((claim) => claim.id === state.currentClaimId) ?? null;
  const review = currentReview(state);
  const checks = review?.verification_records ?? [];
  const reading = problemReading({ currentAssertion: current?.assertion ?? null, repositoryName: state.repositoryName });
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
  if (reading.kind === "no-record") {
    return <div className={styles.overview}>
      <div className={styles.column}>
        <div className={styles.answer}>
          <h2 className={styles.answerHeadline}>{reading.headline}</h2>
          <p className={styles.answerDetail}>
            This question is held by identity and source locator. No Result, check or Decision is represented for it in
            this release.
          </p>
        </div>

        <section className={styles.panel} aria-labelledby="exists-heading">
          <div className={styles.panelHead}>
            <span className={styles.kicker} id="exists-heading">How far the record reaches</span>
            <span className={styles.kicker}>{reachStops.filter((stop) => stop.reached).length} of {reachStops.length} stages</span>
          </div>
          <div className={styles.scope}>
            <Reach stops={reachStops} endpoint="The question" caption={reachCaption} />
          </div>
        </section>

        <p className={styles.answerDetail}>
          Work happens in a Vela Repository, not on this page. When a Repository accepts a Result against this question,
          its Decision and evidence project here with their scope and authority intact.
        </p>
        <div className={styles.actions}>
          <Button nativeButton={false} render={<Link href={`${route}/work`} />}>Start work</Button>
          <Button nativeButton={false} variant="outline" render={<Link href={`${route}/sources`} />}>Open sources</Button>
        </div>
      </div>

      <aside className={styles.rail} aria-label="Problem facts">
        <ProblemFacts state={state} lastSourceUpdate={lastSourceUpdate} />
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
        {checks.length ? <div className={styles.note}>
          Verification did not accept the Claim. The Repository Decision did, and a passing check reports only what its
          own scope covers.
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
        <div className={styles.fact}><span className={styles.factKey}>Problem Standing</span><span className={styles.factValue} style={{ fontWeight: 400 }}>Not recorded</span></div>
      </section>

      <ProblemFacts state={state} lastSourceUpdate={lastSourceUpdate} openFormal={openFormal.length} formal={formal.length} />
      <ExactPanel state={state} />
    </aside>
  </div>;
}

function ProblemFacts({ state, lastSourceUpdate, openFormal, formal }: {
  state: State;
  lastSourceUpdate: string | null;
  openFormal?: number;
  formal?: number;
}) {
  return <section className={styles.panel}>
    <div className={styles.panelHead}>
      <span className={styles.kicker}>Source axes</span>
      <span className={styles.kicker}>Attributed</span>
    </div>
    <div className={styles.fact}>
      <span className={styles.factKey}>Source reports</span>
      <span className={`${styles.factValue} capitalize`}>{humanize(state.problem.declared_status, "Not stated")}</span>
    </div>
    {typeof formal === "number" ? <div className={styles.fact}>
      <span className={styles.factKey}>Formal declarations</span>
      <span className={styles.factValue}>{formal}{openFormal ? ` · ${openFormal} open` : ""}</span>
    </div> : null}
    <div className={styles.fact}>
      <span className={styles.factKey}>Source updated</span>
      <span className={styles.factValue}>{lastSourceUpdate ? formatDate(lastSourceUpdate) : "Not recorded"}</span>
    </div>
    <div className={styles.note}>A source report is not this Problem&apos;s state here.</div>
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
  return <Disclosure className={styles.panel} summary="Exact roots" meta="Record identity">
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
