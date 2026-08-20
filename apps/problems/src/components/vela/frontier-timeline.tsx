import { StatusBadge, type StatusTone } from "@vela/ui/vela/status-badge";
import { RootFact } from "@/components/vela/root-fact";
import { RecordId } from "@/components/vela/record-id";
import { formatDate } from "@/lib/format";
import { Disclosure } from "@/components/vela/disclosure";

/* How the frontier moved: the ordered temporal states a Problem's accepted
 * knowledge passed through, each one a first-layer sentence with the Results
 * it added or removed and the evidence flow that carried the move. This is a
 * presentational surface only — it takes typed props and fetches nothing, so
 * the reader that produces these states can land as a separate change.
 *
 * Two house rules govern the shape. Exact roots and event identifiers live
 * only inside the details disclosure, matching the "Exact identities" idiom
 * one section up. And every stated relationship carries a visible basis chip
 * — source-asserted, checked, repository decision, derived from records, or
 * heuristic advisory — so no edge in the flow is an unlabeled line a reader
 * has to trust. */

/** How a stated relationship is known. The chip renders this string as its
 *  visible label; the tone maps it into the existing status vocabulary
 *  without inventing a hue. */
export type FrontierBasis =
  | "source-asserted"
  | "checked"
  | "repository decision"
  | "derived from records"
  | "heuristic advisory";

/** A Result the state added to or removed from the frontier. */
export type FrontierResultRef = {
  /** Reader-facing Result title, never an identifier. */
  title: string;
  /** Optional address of the Result's own page. */
  href?: string | null;
};

/** One step in the evidence flow behind a move:
 *  Submission → Check → Repository Decision → Result standing. */
export type FrontierEvidenceStep = {
  stage: "submission" | "check" | "repository decision" | "result standing";
  /** First-layer sentence-case label, e.g. "Check passed". */
  label: string;
  /** How this step is known. */
  basis: FrontierBasis;
  /** Optional short qualifier, e.g. a performer or an outcome word. */
  detail?: string | null;
};

/** Exact anchors for one state. Rendered only inside the details
 *  disclosure, never in the first reading layer. */
export type FrontierAnchors = {
  repository_root_before?: string | null;
  repository_root_after?: string | null;
  semantic_delta_root?: string | null;
  event_ids?: string[];
};

/** One temporal state of the frontier. */
export type FrontierState = {
  /** Stable key — an event id or a synthetic reader key. */
  id: string;
  /** First-layer label, e.g. "Result accepted", "Result corrected". */
  label: string;
  /** ISO-8601 instant, or null when the projection retained none. */
  at: string | null;
  /** Results this state added to the frontier. */
  accepted: FrontierResultRef[];
  /** Results this state removed (corrected, superseded, retracted). */
  removed: FrontierResultRef[];
  /** Ordered evidence flow behind the move. */
  evidence: FrontierEvidenceStep[];
  /** Exact technical anchors, disclosure-only. */
  anchors?: FrontierAnchors | null;
};

/** An unresolved item, stated as one plain first-layer sentence,
 *  e.g. "4 formalizations; equivalence not established." */
export type FrontierGap = {
  id: string;
  sentence: string;
  /** How the gap statement is known, when the reader can say. */
  basis?: FrontierBasis;
  /** The exact record or occurrence identifier the sentence is about.
   *  Disclosure-only, never part of the first-layer sentence. */
  ref?: string | null;
};

/** The whole prop contract, for the integration seam in ProblemHistory. */
export type FrontierTimelineData = {
  states: FrontierState[];
  gaps: FrontierGap[];
};

/* Basis maps into the existing tone vocabulary rather than a new palette:
 * checked and derived from records are the evidence family, a repository
 * decision is the decision family, and the two non-authoritative bases stay
 * neutral. The visible label — not the colour — is what separates members of
 * one family, which is the same rule the status axes follow; the neutral pair
 * carries its distinguishing prefixes ("source-", "heuristic") in the label. */
const basisTones: Record<FrontierBasis, StatusTone> = {
  "source-asserted": "neutral",
  checked: "evidence",
  "repository decision": "progress",
  "derived from records": "evidence",
  "heuristic advisory": "neutral",
};

function BasisChip({ basis }: { basis: FrontierBasis }) {
  return (
    <StatusBadge
      tone={basisTones[basis]}
      icon={basis === "repository decision" ? "commit" : undefined}
      className="shrink-0"
    >
      <span className="sr-only">basis: </span>
      {basis}
    </StatusBadge>
  );
}

function ResultRefs({ lead, refs }: { lead: string; refs: FrontierResultRef[] }) {
  if (!refs.length) return null;
  return (
    <div className="mt-3 min-w-0">
      <p className="text-meta font-medium text-muted-foreground">{lead}</p>
      <ul className="mt-1 space-y-1">
        {refs.map((ref) => (
          <li key={ref.href ?? ref.title} className="min-w-0 text-compact">
            {ref.href
              ? <a href={ref.href} className="font-medium text-primary underline-offset-4 hover:underline">{ref.title}</a>
              : ref.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Anchors({ anchors }: { anchors: FrontierAnchors }) {
  const roots = [
    ["Repository root before", anchors.repository_root_before],
    ["Repository root after", anchors.repository_root_after],
    ["Semantic delta", anchors.semantic_delta_root],
  ].filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0);
  const events = anchors.event_ids ?? [];
  if (!roots.length && !events.length) return null;
  return (
    <Disclosure className="border-t px-4 py-3 text-meta" summaryClassName="font-medium" summary="Technical details">
      {roots.length ? (
        <dl className="mt-3 space-y-3">
          {roots.map(([label, value]) => <RootFact key={label} label={label} value={value} />)}
        </dl>
      ) : null}
      {events.length ? (
        <div className="mt-3 min-w-0">
          <p className="text-label text-muted-foreground">Events</p>
          <ul className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {events.map((eventId) => <li key={eventId}><RecordId value={eventId} label="event" /></li>)}
          </ul>
        </div>
      ) : null}
    </Disclosure>
  );
}

export function FrontierTimeline({ states, gaps = [] }: { states: FrontierState[]; gaps?: FrontierGap[] }) {
  /* No retained movement and no stated gaps is a statement about the reader's
     input, not about the Problem — render nothing rather than an apology. */
  if (!states.length && !gaps.length) return null;

  return (
    <section aria-labelledby="frontier-moved-heading">
      <div>
        <h2 id="frontier-moved-heading" className="text-title">How the frontier moved</h2>
        <p className="mt-1 text-meta text-muted-foreground">Each state the accepted record passed through, with the evidence that carried it.</p>
      </div>

      {states.length ? (
        <ol className="relative mt-6 space-y-0 before:absolute before:bottom-5 before:left-[.9375rem] before:top-5 before:w-px before:bg-border">
          {states.map((state) => (
            <li key={state.id} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
              <span aria-hidden className="relative z-10 mt-4 size-8 rounded-full border-8 border-background bg-status-evidence ring-1 ring-border forced-colors:border-2" />
              <article className="vela-object-surface vela-object-row min-w-0 overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
                  <p className="text-label font-semibold">{state.label}</p>
                  <time dateTime={state.at ?? undefined} className="text-meta text-muted-foreground">{formatDate(state.at)}</time>
                </header>
                <div className="p-4">
                  <ResultRefs lead="Accepted" refs={state.accepted} />
                  <ResultRefs lead="Removed" refs={state.removed} />
                  {state.evidence.length ? (
                    <div className="mt-4 min-w-0">
                      <p className="text-meta font-medium text-muted-foreground">Evidence flow</p>
                      <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2">
                        {state.evidence.map((step, index) => (
                          <li key={`${step.stage}:${index}`} className="flex min-w-0 items-center gap-x-2">
                            {index > 0 ? <span aria-hidden className="text-muted-foreground">→</span> : null}
                            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-compact">{step.label}</span>
                              {step.detail ? <span className="text-meta text-muted-foreground">{step.detail}</span> : null}
                              <BasisChip basis={step.basis} />
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
                {state.anchors ? <Anchors anchors={state.anchors} /> : null}
              </article>
            </li>
          ))}
        </ol>
      ) : null}

      {gaps.length ? (
        <div className="mt-6">
          <h3 className="text-label font-semibold">Still unresolved</h3>
          <ul className="mt-2 space-y-2">
            {gaps.map((gap) => (
              <li key={gap.id} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-compact">
                <span className="min-w-0">{gap.sentence}</span>
                {gap.basis ? <BasisChip basis={gap.basis} /> : null}
                {gap.ref ? (
                  <Disclosure className="min-w-0 basis-full text-meta" summaryClassName="font-medium text-muted-foreground" summary="Exact identity">
                    <div className="mt-1"><RecordId value={gap.ref} /></div>
                  </Disclosure>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
