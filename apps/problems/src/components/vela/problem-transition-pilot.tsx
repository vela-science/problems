import Link from "next/link";
import {
  ArrowRight01Icon,
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  GitCommitHorizontalIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { AssertionText } from "@/components/vela/assertion-text";
import { Disclosure } from "@/components/vela/disclosure";
import { currentReview } from "@/components/vela/problem-provenance";
import { formatDate } from "@/lib/format";
import type { ScientificProblemState } from "@/lib/scientific-state";
import styles from "./problem-transition-pilot.module.css";

type State = NonNullable<ScientificProblemState>;
type Claim = State["claims"][number];

function humanize(value: string | null | undefined, fallback = "Not recorded") {
  return value?.replaceAll("_", " ").replaceAll("-", " ") || fallback;
}

function sentenceMatching(assertion: string, pattern: RegExp) {
  return assertion.split(/(?<=[.!?])\s+/u).find((sentence) => pattern.test(sentence)) ?? null;
}

function resultHeadline(assertion: string) {
  const proved = assertion.match(/\bproves that\s+(.+?),\s+matching\b/u);
  const established = assertion.match(/\bestablishes\s+([^,]+),\s+which\b/u);
  const value = proved?.[1] ?? established?.[1];
  if (!value) return assertion.split(/(?<=[.!?])\s+/u)[0] ?? assertion;
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function correctionForCurrent(state: State, current: Claim | null) {
  if (!current?.record || typeof current.record !== "object") return null;
  const relations = (current.record as { relations?: unknown }).relations;
  if (!Array.isArray(relations)) return null;
  for (const candidate of relations) {
    if (!candidate || typeof candidate !== "object") continue;
    const relation = candidate as { kind?: unknown; target_claim_id?: unknown };
    if (!["corrects", "supersedes"].includes(String(relation.kind))) continue;
    if (typeof relation.target_claim_id !== "string") continue;
    const before = state.claims.find((claim) => claim.id === relation.target_claim_id) ?? null;
    return { kind: String(relation.kind), before };
  }
  return null;
}

function checkLabel(value: string | null | undefined) {
  if (!value) return "Scope not recorded";
  const label = humanize(value);
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function metadataString(state: State, key: string) {
  const value = (state.problem.metadata as Record<string, unknown> | null)?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function Problem94TransitionPilot({ state, route }: { state: State; route: string }) {
  const current = state.claims.find((claim) => claim.id === state.currentClaimId) ?? null;
  const review = currentReview(state);
  const checks = review?.verification_records ?? [];
  const correction = correctionForCurrent(state, current);
  const sameStatement = Boolean(correction?.before && current && correction.before.assertion === current.assertion);
  const limitation = current ? sentenceMatching(current.assertion, /does not establish|not a proof/u) : null;
  const established = current ? resultHeadline(current.assertion) : null;
  const passedChecks = checks.filter((check) => check.outcome === "pass").length;
  const producer = review?.producer_package?.producer_actor ?? "Producer not recorded";
  const decisionActor = review?.reviewed_by ?? "Decision performer not recorded";
  const evidenceCount = current?.evidence_count ?? 0;
  const formal = state.sources.occurrences.filter((occurrence) => occurrence.formal);
  const exactReferences = current?.source_bindings?.length ?? 0;
  const lastSourceUpdate = metadataString(state, "status_last_update");

  const transitionStages = [
    { label: "Before", value: correction?.before ? "Accepted partial result · later corrected" : "Not retained" },
    { label: "Work reviewed", value: `${humanize(producer.replace(/^agent:/u, ""))} · ${evidenceCount} evidence items` },
    { label: "Checks", value: `${passedChecks} of ${checks.length} scoped checks passed` },
    { label: "Decision", value: `${humanize(review?.status)} by ${state.repositoryName}` },
    { label: "Now", value: current ? "Partial result accepted · headline problem open" : "No current result" },
    { label: "Next", value: "Key gap not recorded" },
  ];

  return <div className={styles.layout}>
    <main className={styles.mainColumn}>
      <section aria-labelledby="problem-standing-heading" className={styles.answerCard}>
        <div className={styles.answerIntro}>
          <p>Current answer · bounded to this repository</p>
          <h2 id="problem-standing-heading">Open in the state represented here.</h2>
          <p>No accepted Result represented in this release establishes the cubic distance-multiplicity conjecture.</p>
        </div>

        <div className={styles.answerSection}>
          <h3>What we know</h3>
          <p>A narrower identity has an accepted result in this repository.</p>
          <div className={styles.resultReceipt}>
            <HugeiconsIcon icon={CheckmarkCircle01Icon} aria-hidden />
            <p>{established ? <AssertionText text={established} /> : "No current Result is recorded."}</p>
            <div><Badge variant="outline">{current ? "Accepted partial result" : "No accepted result"}</Badge><span>Accepted by this repository</span></div>
          </div>
        </div>

        <div className={styles.answerSection}>
          <h3>What remains open</h3>
          <p>{limitation ? <AssertionText text={limitation} /> : "No explicit limitation is recorded."}</p>
        </div>

        <div className={styles.answerActions}>
          <Button nativeButton={false} render={<Link href={`${route}/results`} />}>Inspect evidence</Button>
          <Button nativeButton={false} variant="outline" render={<Link href={`/repositories/${state.repositorySlug}/reproduce`} />}>Reproduce checks</Button>
          <Button nativeButton={false} variant="outline" render={<Link href={`${route}/work`} />}>Start research</Button>
        </div>
      </section>

      <section aria-labelledby="retained-transition-heading" className={styles.transitionCard}>
        <header>
          <div><p>Latest meaningful update</p><h2 id="retained-transition-heading">{formatDate(review?.reviewed_at ?? review?.created_at ?? null)} · record corrected</h2></div>
          <Badge variant="secondary">Current update</Badge>
        </header>
        <dl>
          <div><dt>What changed</dt><dd>{correction ? "Correction relationship fixed" : "Not recorded"}</dd></div>
          <div><dt>What did not</dt><dd>{sameStatement ? "Scientific claim" : "Not established"}</dd></div>
          <div><dt>Accepted here</dt><dd>{current ? `Partial result in ${state.repositoryName}` : "No current result"}</dd></div>
          <div><dt>Still open</dt><dd>Headline cubic conjecture</dd></div>
        </dl>
      </section>

      <section aria-labelledby="coverage-rights-heading" className={styles.rightsCard}>
        <h2 id="coverage-rights-heading">Sources and rights</h2>
        <dl>
          <div><dt><HugeiconsIcon icon={SourceCodeIcon} aria-hidden />Formal Conjectures</dt><dd><span>Exact retained source</span><strong>Apache-2.0</strong></dd></div>
          <div><dt><HugeiconsIcon icon={BookOpen01Icon} aria-hidden />Erdős Problems</dt><dd><span>Identity and status reference only</span><strong>Source license not established</strong></dd></div>
        </dl>
      </section>

      <Disclosure className={styles.disclosure} summaryClassName={styles.disclosureSummary} summary="Technical details" meta="Replay and exact roots">
        <div className={styles.technicalBody}>
          <p>Ordinary Repository history is the portable public record. Verify it with <code>vela replay</code> and inspect deterministic output with <code>vela projection --json</code>.</p>
          <dl>
            <div><dt>Repository root</dt><dd>{state.anchor.repositoryRoot}</dd></div>
            <div><dt>Projection root</dt><dd>{state.anchor.projectionReleaseRoot}</dd></div>
            <div><dt>Source commit</dt><dd>{state.anchor.sourceCommit}</dd></div>
            <div><dt>Profile scope and licensing</dt><dd>Detached projection completeness is not established by this page.</dd></div>
          </dl>
        </div>
      </Disclosure>

      <Disclosure className={styles.disclosure} summaryClassName={styles.disclosureSummary} summary="Limits & missing data" meta="Explicit absences">
        <ul className={styles.limitList}>
          <li><strong>Authoritative Problem-level standing</strong><span>Not recorded. The answer above is a bounded Problems synthesis.</span></li>
          <li><strong>Global coverage or consensus</strong><span>Not established.</span></li>
          <li><strong>Next discriminator, active approach, and related Problem edges</strong><span>Not recorded.</span></li>
          <li><strong>Fresh kernel or mathematical verification; external, upstream, or independent human adoption</strong><span>Not recorded by the two retained checks.</span></li>
          <li><strong>Cross-provider, host, source-byte, Repository, or tool independence</strong><span>Not established; the checks disclose a shared dependency.</span></li>
          <li><strong>Checkable source-code custody on the Result view</strong><span>Not verified by this page.</span></li>
          <li><strong>Raw prompts, tool calls, and private traces</strong><span>Not exposed in this public projection.</span></li>
          <li><strong>Per-Problem machine-readable rights and detached Repository Profile licensing</strong><span>Not exposed completely by the current public response.</span></li>
        </ul>
      </Disclosure>
    </main>

    <aside aria-label="Problem 94 evidence and state" className={styles.evidenceRail}>
      <section className={styles.railStanding}>
        <div className={styles.railHeading}><h2>Current state</h2><Badge variant="outline">Problem open</Badge></div>
        <div className={styles.standingPair}>
          <div><span>Partial result</span><strong>{current ? humanize(current.standing) : "Not recorded"}</strong></div>
          <div><span>Confidence</span><strong>Not recorded</strong></div>
        </div>
        <p className={styles.nextGap}><span>Next key gap</span><strong>Not recorded</strong></p>
      </section>

      <section>
        <div className={styles.railHeading}><h2>Evidence checks</h2><span>{checks.length} scoped checks</span></div>
        <ol className={styles.checkList}>
          {checks.map((check) => <li key={check.verification_record_id}><HugeiconsIcon icon={CheckmarkCircle01Icon} aria-hidden /><span><strong>{checkLabel(check.property)}</strong><small>{humanize(check.outcome)} · does not establish the headline Problem</small></span></li>)}
        </ol>
      </section>

      <section>
        <div className={styles.railHeading}><h2>How we got here</h2><span>Complete loop</span></div>
        <ol className={styles.stateLoop}>
          {transitionStages.map((stage, index) => <li key={stage.label}><span>{index + 1}</span><div><strong>{stage.label}</strong><small>{stage.value}</small></div></li>)}
        </ol>
      </section>

      <Disclosure className={styles.railDisclosure} summaryClassName={styles.railDisclosureSummary} summary="Record details" meta={`${evidenceCount} evidence · ${exactReferences} exact source`}>
        <div className={styles.railDetails}>
          <p className={styles.technicalAxes}>Technical state axes: Verification → Repository Decision → Standing.</p>
          <dl className={styles.railFacts}>
            <div><dt>Formal declarations</dt><dd>{formal.length}</dd></div>
            <div><dt>Source statements</dt><dd>1</dd></div>
            <div><dt>Global coverage</dt><dd>Not established</dd></div>
            <div><dt>Source update</dt><dd>{lastSourceUpdate ? formatDate(lastSourceUpdate) : "Not recorded"}</dd></div>
          </dl>
          <div className={styles.decisionBlock}>
            <div className={styles.railHeading}><h2>Repository Decision</h2><span>{humanize(review?.status)}</span></div>
            <div className={styles.decisionReceipt}>
              <HugeiconsIcon icon={GitCommitHorizontalIcon} aria-hidden />
              <div><strong>{decisionActor}</strong><span>{state.repositoryName} · {formatDate(review?.reviewed_at ?? review?.created_at ?? null)}</span><small>Verification informed this Decision; it did not make it.</small></div>
            </div>
          </div>
          <nav aria-label="Inspect Problem 94 records" className={styles.railLinks}>
            <Link href={`${route}/results`}>Results <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden /></Link>
            <Link href={`${route}/history`}>History <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden /></Link>
            <Link href={`${route}/sources`}>Sources <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden /></Link>
            <Link href={`${route}/work`}>Work <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden /></Link>
          </nav>
        </div>
      </Disclosure>
    </aside>
  </div>;
}
