import Link from "next/link";
import { cn } from "@vela/ui/lib/utils";
import { ProposalGlyph, type ProposalStatus, type VerificationOutcome } from "@vela/ui/vela/state-glyph";
import { formatDate, machineInstant, plural } from "@/lib/format";

/* When this Repository was decided, and on what.
 *
 * `projection.reviews` is fetched on every request to this route and was drawn
 * nowhere: the page counted Proposals and then described the loop in general
 * terms. What the Overview needs from those records is the shape — thirteen
 * terminal records inside two days, one refused, one withdrawn, nothing since —
 * and that is a single lane over time. The per-Proposal ledger is `/proposals`,
 * one click from every mark, so nothing here reprints it.
 *
 * The mark is `ProposalGlyph` from `@vela/ui`, which draws this axis pair —
 * ring is Proposal status, core is Verification outcome — for the ledger one
 * click away. This file drew a second one for a while, and the two disagreed:
 * a withdrawn Proposal was ruled on one surface and unruled on the other, and
 * fail and inconclusive shared a core here while the shared glyph keeps them
 * apart. What the rail owns is the time axis and the halo, which is geometry
 * rather than vocabulary.
 *
 * Gold is the snapshot rule and nothing else. A gold connector between marks
 * would carry no information — twelve of thirteen strokes would be identical —
 * and would make gold the page's dominant ink.
 *
 * One `<ol>` serves as both the figure and its ledger. Above `sm` each item is
 * a mark positioned on the track and its summary is read only by assistive
 * technology; below `sm` the track is dropped and the same items are rows. That
 * is a recomposition, not a second rendering, and it is what keeps the target
 * size honest at 375px where thirteen marks would sit 25px apart. */

export type DecisionMark = {
  proposalId: string;
  /** `projection.reviews.status`, the Proposal axis. */
  status: ProposalStatus;
  /** `reviewed_at` falling back to `created_at`. A record with neither is not drawn. */
  at: string | null;
  actor: string | null;
  reason: string | null;
  /** `verificationCore` over the retained Verification Records, derived by
      repository-data and never here. */
  verification: VerificationOutcome;
  verifiers: string[];
};

const dayFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/* One sentence per outcome. `error` gets its own because a check that could not
   run and a check that ran without deciding are different facts, and this
   sentence printed the first as the second. */
function verificationSentence(mark: DecisionMark): string {
  const records = plural(mark.verifiers.length, "Verification Record");
  switch (mark.verification) {
    case "pass":
      return `${records} retained, every recorded outcome pass.`;
    case "fail":
      return `${records} retained, a recorded outcome is fail.`;
    case "error":
      return `${records} retained, a recorded outcome is error.`;
    case "inconclusive":
      return `${records} retained, the recorded outcomes are inconclusive.`;
    default:
      return "No Verification Record is retained.";
  }
}

/* Decisions cluster: six of the thirteen on erdős sit inside 35 minutes of a
   62-hour axis. The ground-coloured halo is what makes that read as marks
   stacked on one another rather than as a single wider disc. No mark moves; the
   crowding is the record. It sits behind the shared glyph rather than inside
   it, because the glyph's ring already reaches the edge of its own box. */
function Mark({ status, verification }: Pick<DecisionMark, "status" | "verification">) {
  return (
    <span className="relative block size-4 shrink-0">
      <span aria-hidden className="absolute -inset-px rounded-full bg-background" />
      <ProposalGlyph className="relative" status={status} verification={verification} />
    </span>
  );
}

export function DecisionRail({
  marks,
  snapshotAt,
  slug,
  className,
}: {
  marks: DecisionMark[];
  /** `published_snapshot_at`, which is where the axis ends. */
  snapshotAt: string;
  slug: string;
  className?: string;
}) {
  const drawn = marks
    .map((mark) => ({ mark, time: mark.at ? Date.parse(mark.at) : Number.NaN }))
    .filter((entry) => Number.isFinite(entry.time))
    .sort((first, second) => second.time - first.time);
  if (!drawn.length) return null;

  const times = drawn.map((entry) => entry.time);
  const first = Math.min(...times);
  const last = Math.max(...times);
  const snapshot = Date.parse(snapshotAt);
  const span = snapshot - first;
  /* The scale divides by the span, so the guard belongs on the denominator and
     not on the number of marks: a Repository whose only record is timestamped at
     the snapshot has no track to place anything on. Below three marks a time
     axis is chrome over nothing, so both cases fall back to the rows. */
  const rail = drawn.length >= 3 && span > 0;
  /* 4% inset each side, so the first mark and the snapshot rule are not cut by
     the figure's own edge. A record retained later than the published snapshot
     would otherwise draw outside the track. */
  const position = (time: number) => Math.min(96, Math.max(4, 4 + (92 * (time - first)) / span));
  const lastPosition = rail ? position(last) : 96;
  const records = drawn.reduce((sum, entry) => sum + entry.mark.verifiers.length, 0);
  const range = dayFormat.format(first) === dayFormat.format(last)
    ? dayFormat.format(first)
    : `${dayFormat.format(first)} to ${dayFormat.format(last)}`;

  return (
    <figure className={cn("min-w-0", className)}>
      <div className={cn("min-w-0", rail && "sm:relative sm:h-8")}>
        {rail ? (
          <>
            <span
              aria-hidden
              className="absolute top-1/2 hidden h-px bg-border sm:block"
              style={{ left: "4%", width: `${lastPosition - 4}%` }}
            />
            <span
              aria-hidden
              className="absolute top-1/2 hidden border-t border-dashed sm:block"
              style={{ left: `${lastPosition}%`, width: `${96 - lastPosition}%` }}
            />
            <span aria-hidden className="absolute top-0 hidden h-8 w-px bg-direction sm:block" style={{ left: "96%" }} />
          </>
        ) : null}

        <ol className={cn("min-w-0 divide-y", rail && "sm:divide-y-0")}>
          {drawn.map((entry, index) => {
            const mark = entry.mark;
            const summary = `${index + 1} of ${drawn.length}. Proposal ${mark.status.replaceAll("_", " ")} ${formatDate(mark.at)} by ${mark.actor ?? "an actor the record does not name"}. ${verificationSentence(mark)}`;
            return (
              <li
                key={mark.proposalId}
                className={cn("min-w-0 py-3", rail && "sm:absolute sm:top-0 sm:-translate-x-1/2 sm:py-0")}
                style={rail ? { left: `${position(entry.time)}%` } : undefined}
              >
                <Link
                  href={`/repositories/${slug}/proposals/${encodeURIComponent(mark.proposalId)}`}
                  className={cn(
                    "flex items-start gap-2 rounded",
                    rail && "sm:grid sm:size-8 sm:place-items-center sm:rounded-full sm:hover:bg-accent",
                  )}
                >
                  <Mark status={mark.status} verification={mark.verification} />
                  {/* The row text hides only where the track replaces it. In the
                      ledger form there is no track, so hiding it would leave a
                      glyph standing alone. */}
                  <span className={cn("min-w-0 text-compact [overflow-wrap:anywhere]", rail && "sm:sr-only")}>{summary}</span>
                </Link>
                <div className={cn("mt-1 min-w-0 pl-6", rail && "sm:hidden")}>
                  {mark.reason ? <p className="text-meta text-muted-foreground">{mark.reason}</p> : null}
                  {mark.verifiers.map((verifier, ordinal) => (
                    <p key={`${verifier}:${ordinal}`} className="mt-1 font-mono text-micro text-muted-foreground [overflow-wrap:anywhere]">
                      {verifier}
                    </p>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {rail ? (
        <div
          className="mt-2 hidden justify-between font-mono text-micro text-muted-foreground sm:flex"
          style={{ paddingLeft: "4%", paddingRight: "4%" }}
        >
          <time dateTime={machineInstant(first)}>{dayFormat.format(first)}</time>
          <time dateTime={machineInstant(snapshot)}>snapshot {dayFormat.format(snapshot)}</time>
        </div>
      ) : null}

      <figcaption className="mt-3 max-w-[80ch] text-meta text-muted-foreground">
        {plural(records, "Verification Record")} under {plural(drawn.length, "Proposal")}, {range}.{" "}
        {rail ? "Position is the recorded decision time; the " : "The "}
        ring is Proposal status and the core is the Verification outcome.
        {rail ? " It is not rank and confers nothing." : ""}
      </figcaption>
    </figure>
  );
}
