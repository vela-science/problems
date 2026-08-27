import Link from "next/link";
import { ArrowUp01Icon, CheckmarkCircle01Icon, MinusSignCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { AssertionText } from "@/components/vela/assertion-text";
import { Disclosure } from "@/components/vela/disclosure";
import { currentReview } from "@/components/vela/problem-provenance";
import { formatDate } from "@/lib/format";
import { problemReading } from "@/lib/problem-reading";
import { resolveProblemStatement, statementParagraphs } from "@/lib/problem-statement";
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

/* Absences the projection actually asserts, not a list of everything a reader
   might wish for. Each line here is a field that is null, an array that is
   empty, or a record kind this release does not carry. */
function absences(state: State, checks: Array<{ outcome: string }>) {
  const entries: string[] = [];
  entries.push("Problem-level Standing");
  if (!metadataString(state, "next_discriminator")) entries.push("A recorded next discriminator");
  entries.push("Related Problems");
  if (!checks.length) entries.push("Any retained check");
  entries.push("Literature or consensus coverage");
  entries.push("Human identity behind the named performers");
  return entries;
}

export function ProblemOverview({ state, route }: { state: State; route: string }) {
  const claims = state.claims ?? [];
  const current = claims.find((claim) => claim.id === state.currentClaimId) ?? null;
  const review = currentReview(state);
  const checks = review?.verification_records ?? [];
  const reading = problemReading({ currentAssertion: current?.assertion ?? null, repositoryName: state.repositoryName });
  const statement = resolveProblemStatement(state);
  const { question } = statementParagraphs(statement);
  const established = current ? exactResultHeadline(current.assertion) : null;
  const limitation = current ? exactResultLimitation(current.assertion) : null;
  const formal = state.sources?.occurrences?.filter((occurrence) => occurrence.formal) ?? [];
  const openFormal = formal.filter((occurrence) => occurrence.formal?.category_label?.toLowerCase() === "open");
  const lastSourceUpdate = metadataString(state, "status_last_update");

  /* Nothing has been accepted here. That is the state of 1,215 of the 1,217
     Erdős Problems in this release, so it gets a composition of its own rather
     than the rich page with its values removed. */
  if (reading.kind === "no-record") {
    const stages = [
      { label: "Source identity", present: true, detail: `${state.source?.title ? "Retained" : "Retained"} from ${state.problem.source_id.replace(/^source:/u, "")}` },
      { label: "Statement text", present: Boolean(question), detail: question ? "Retained" : "Not retained" },
      { label: "Formal declaration", present: formal.length > 0, detail: formal.length ? `${formal.length} retained` : "None associated" },
      { label: "Work and checks", present: checks.length > 0, detail: checks.length ? `${checks.length} retained` : "None recorded" },
      { label: "Decision", present: Boolean(review), detail: review ? humanize(review.status) : "No Repository has decided" },
    ];
    const present = stages.filter((stage) => stage.present).length;
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
            <span className={styles.kicker} id="exists-heading">What exists for this question</span>
            <span className={styles.kicker}>{present} of {stages.length} stages</span>
          </div>
          <div className={styles.ladder}>
            <div className={styles.ladderWire} aria-hidden />
            {stages.map((stage) => <div key={stage.label} className={styles.stage}>
              <div className={`${styles.stageMark} ${stage.present ? styles.stageMarkPresent : ""}`} />
              <div className={`${styles.stageLabel} ${stage.present ? "" : styles.stageAbsent}`}>{stage.label}</div>
              <div className={styles.stageDetail}>{stage.detail}</div>
            </div>)}
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
        <AbsencePanel entries={absences(state, checks)} />
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

      {/* Scope, drawn only where the Claim asserts the containment itself. */}
      {limitation ? <section className={styles.panel} aria-labelledby="scope-heading">
        <div className={styles.panelHead}>
          <span className={styles.kicker} id="scope-heading">Scope of what is proved</span>
        </div>
        <div className={styles.scope}>
          <div className={styles.scopeOuter}>
            <div className={styles.scopeRow}>
              <span className={styles.scopeLabel}>The question</span>
              <Badge variant="outline">Not established here</Badge>
            </div>
            {question ? <p className={styles.scopeText}><ScientificText text={question} /></p> : null}
            <div className={styles.scopeInner}>
              <div className={styles.scopeRow}>
                <span className={styles.scopeLabel}>Proved and accepted</span>
                <Badge variant="outline" className="capitalize">{humanize(current?.standing)}</Badge>
              </div>
              {established ? <p className={styles.scopeText}><AssertionText text={established} /></p> : null}
            </div>
            {/* Not the limitation sentence again: the answer above already
                carries it, and the figure's job is the relation. */}
            <p className={styles.scopeGap}>
              <HugeiconsIcon icon={ArrowUp01Icon} aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>The accepted scope sits inside the question, and does not reach it.</span>
            </p>
          </div>
        </div>
      </section> : null}

      <section className={styles.panel} aria-labelledby="claims-heading">
        <div className={styles.panelHead}>
          <span className={styles.kicker} id="claims-heading">Claims</span>
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
              {claim.evidence_count ?? 0} {claim.evidence_count === 1 ? "evidence item" : "evidence items"}
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
          <div className={styles.rowTitle}>
            {sentenceCase(humanize(check.property, "Scope not recorded"))}
            <div className={styles.rowMeta}>Scope: {humanize(check.property, "not recorded")}</div>
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
      <AbsencePanel entries={absences(state, checks)} />
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

function AbsencePanel({ entries }: { entries: string[] }) {
  return <section className={styles.panel}>
    <div className={styles.panelHead}>
      <span className={styles.kicker}>Not recorded in this release</span>
      <span className={styles.kicker}>{entries.length}</span>
    </div>
    {entries.map((entry) => <div key={entry} className={styles.absent}>
      <span className={styles.absentMark} aria-hidden />{entry}
    </div>)}
  </section>;
}

function ExactPanel({ state }: { state: State }) {
  return <Disclosure className={styles.panel} summary="Exact roots" meta="Record identity">
    <div>
      <div className={`${styles.fact} ${styles.factStack}`}><span className={styles.factKey}>Problem record</span><span className={`${styles.factValue} ${styles.exact} break-all`}>{state.anchor.problemRecordRoot}</span></div>
      <div className={`${styles.fact} ${styles.factStack}`}><span className={styles.factKey}>Projection</span><span className={`${styles.factValue} ${styles.exact} break-all`}>{state.anchor.projectionReleaseRoot}</span></div>
      <div className={`${styles.fact} ${styles.factStack}`}><span className={styles.factKey}>Source commit</span><span className={`${styles.factValue} ${styles.exact} break-all`}>{state.anchor.sourceCommit}</span></div>
    </div>
  </Disclosure>;
}
