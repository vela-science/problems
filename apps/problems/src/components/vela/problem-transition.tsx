import { currentReview } from "@/components/vela/problem-provenance";
import { problemReading } from "@/lib/problem-reading";
import type { ScientificProblemState } from "@/lib/scientific-state";
import styles from "./problem-transition.module.css";

type State = NonNullable<ScientificProblemState>;

export type TransitionStage = {
  key: string;
  label: string;
  value: string;
  /** `recorded` draws a filled mark, `standing` an amber one, `absent` an
   *  outline. Absence is a state with its own mark, never a blank. */
  tone: "recorded" | "standing" | "absent";
};

function humanize(value: string | null | undefined, fallback: string) {
  return value?.replaceAll("_", " ").replaceAll("-", " ") || fallback;
}

function metadataString(state: State, key: string) {
  const value = (state.problem.metadata as Record<string, unknown> | null)?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/* Did the current Claim replace an earlier one, and is that earlier one still
   retained? A correction relation is the only evidence for a prior state; the
   absence of one means the record has none, not that none happened. */
function priorClaim(state: State) {
  const current = (state.claims ?? []).find((claim) => claim.id === state.currentClaimId) ?? null;
  const record = current?.record && typeof current.record === "object" ? current.record as { relations?: unknown } : null;
  const relations = Array.isArray(record?.relations) ? record.relations : [];
  for (const candidate of relations) {
    if (!candidate || typeof candidate !== "object") continue;
    const relation = candidate as { kind?: unknown; target_claim_id?: unknown };
    if (!["corrects", "supersedes"].includes(String(relation.kind))) continue;
    if (typeof relation.target_claim_id !== "string") continue;
    return {
      kind: String(relation.kind),
      claim: (state.claims ?? []).find((claim) => claim.id === relation.target_claim_id) ?? null,
    };
  }
  return null;
}

/* The complete transition the source contract names, derived rather than
 * written: prior justified state, the work selected, Verification, the human
 * or agent Decision, the Standing that follows, and the next decisive gap.
 *
 * Every stage reports what the record holds or says plainly that it holds
 * nothing. The last stage is almost always absent, and that is the point: no
 * release so far records a next discriminator, and a spine that quietly ended
 * at "Standing" would imply the loop closes when it does not. */
export function problemTransition(state: State): TransitionStage[] {
  const review = currentReview(state);
  const checks = review?.verification_records ?? [];
  const passed = checks.filter((check) => check.outcome === "pass").length;
  const current = (state.claims ?? []).find((claim) => claim.id === state.currentClaimId) ?? null;
  const prior = priorClaim(state);
  const reading = problemReading({ currentAssertion: current?.assertion ?? null, repositoryName: state.repositoryName });
  const producer = review?.producer_package?.producer_actor ?? null;
  const evidence = current?.evidence_count ?? 0;
  const nextGap = metadataString(state, "next_discriminator");

  return [
    {
      key: "prior",
      label: "Prior state",
      value: prior
        ? `Accepted, then ${prior.kind === "corrects" ? "corrected" : "superseded"}`
        : "None retained",
      tone: prior ? "recorded" : "absent",
    },
    {
      key: "work",
      label: "Work",
      value: producer
        ? `${humanize(producer.replace(/^agent:/u, ""), "Recorded")} · ${evidence} ${evidence === 1 ? "evidence item" : "evidence items"}`
        : "No submitted work retained",
      tone: producer ? "recorded" : "absent",
    },
    {
      key: "verification",
      label: "Verification",
      value: checks.length ? `${passed} of ${checks.length} scoped ${checks.length === 1 ? "check" : "checks"} passed` : "No check retained",
      tone: checks.length ? "recorded" : "absent",
    },
    {
      key: "decision",
      label: "Decision",
      value: review ? `${humanize(review.status, "recorded")} by ${state.repositoryName}` : "No Repository has decided",
      tone: review ? "recorded" : "absent",
    },
    {
      key: "standing",
      label: "Standing",
      value: reading.kind === "no-record"
        ? "Nothing recorded here"
        : reading.kind === "open"
          ? "Open in this repository"
          : "A Result stands here",
      tone: reading.kind === "no-record" ? "absent" : "standing",
    },
    {
      key: "gap",
      label: "Next gap",
      value: nextGap ?? "Not recorded",
      tone: nextGap ? "recorded" : "absent",
    },
  ];
}

export function ProblemTransition({ state }: { state: State }) {
  const stages = problemTransition(state);
  return <section aria-labelledby="transition-heading" className={styles.panel}>
    <div className={styles.head}>
      <h2 id="transition-heading" className={styles.kicker}>How the state got here</h2>
      <span className={styles.kicker}>{stages.filter((stage) => stage.tone !== "absent").length} of {stages.length} recorded</span>
    </div>
    <ol className={styles.spine}>
      <span aria-hidden className={styles.wire} />
      {stages.map((stage) => <li key={stage.key} className={styles.stage}>
        <span aria-hidden className={`${styles.mark} ${stage.tone === "recorded" ? styles.markRecorded : stage.tone === "standing" ? styles.markStanding : styles.markAbsent}`} />
        <span className={styles.label}>{stage.label}</span>
        <span className={`${styles.value} ${stage.tone === "absent" ? styles.valueAbsent : ""}`}>{stage.value}</span>
      </li>)}
    </ol>
  </section>;
}
