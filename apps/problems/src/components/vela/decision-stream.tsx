import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { GitCommitHorizontalIcon } from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback } from "@vela/ui/components/avatar";
import { stateIcons, stateTones, type StatusTone } from "@vela/ui/vela/status-badge";
import { RecordId } from "@/components/vela/record-id";
import { WorkSessionRef } from "@/components/vela/work-session-ref";
import { RelativeTime } from "@/components/vela/relative-time";

/* The authority event stream, which is the thing "Activity" was always naming.
 *
 * `vela log` emits `vela.authority-log.v1` — every covered repository-authority
 * event with its actor, target, timestamp and a written human `reason`. The
 * projection already carries the decided half of that on `projection.reviews`
 * (`reviewed_by`, `reviewed_at`, `decision_reason`, `decision_event_id`), and
 * nothing rendered it: the page read `runs` instead, whose table root is the
 * hash of an empty array, and reported "no retained activity".
 *
 * Drawn as a log rather than a link list, which is what made the surface read
 * as a social feed. Adaptation of Tailwind Plus Application UI v4
 * `lists/feeds/01-simple-with-icons`: the connector rail, the ring-cut event
 * mark and the right-aligned time are the mechanics taken. Its Heroicons are
 * replaced by Hugeicons, its raw palette ramps by status tokens,
 * its anchors by next/link, and its single-line "content + target" body by the
 * Decision's own written reason, which is the entire point of the surface.
 * Recorded in docs/editorial-references.md.
 *
 * The mark is keyed to disposition, never to recency: a calendar position is
 * not evidence, and the page says so. */

export type DecisionEntry = {
  repository: string;
  repositoryName: string;
  proposalId: string;
  status: string;
  claim: string;
  target: string;
  actor: string | null;
  actorClass: "human" | "agent" | null;
  sessionRef: string | null;
  authorityPrincipalId: string | null;
  reason: string | null;
  recordedAt: string | null;
  eventId: string | null;
};

/* The glyph and the hue come from the badge's own map, the way sigma-map.tsx
 * takes them. This file used to carry a private two-row table for `accepted`
 * and `rejected`, which filed both on one axis where the shared map puts
 * acceptance on standing and rejection on the proposal axis — the conflation
 * the shared map exists to prevent. Only tone → wash class lives here, because
 * this renderer paints a ring rather than rendering a badge.
 *
 * A withdrawal is the producer taking its own Proposal back, so it never
 * reaches this stream: /decisions filters it out by provenance and draws it in
 * its own section. */
const wash: Record<StatusTone, string> = {
  evidence: "bg-status-evidence/15 text-status-evidence",
  progress: "bg-status-progress/15 text-status-progress",
  caution: "bg-status-caution/15 text-status-caution",
  conflict: "bg-status-conflict/15 text-status-conflict",
  neutral: "bg-muted text-muted-foreground",
};

/* A status this release does not know about is drawn as an event with no
 * disposition: the commit glyph on a neutral tone. Falling through to a
 * specific mark would put a ruling on a row that never carried one. */
function markFor(status: string): { icon: typeof GitCommitHorizontalIcon; tone: string } {
  return {
    icon: stateIcons[status] ?? GitCommitHorizontalIcon,
    tone: wash[stateTones[status] ?? "neutral"],
  };
}

/* An actor is an authority identity, not a display name. Initials are derived
 * only from a human-looking one; a device or agent identity keeps a neutral
 * glyph, and the exact string is always the title and the visible mono text. */
function initials(actor: string): string | null {
  const human = actor.match(/^([A-Za-z]+)\s+([A-Za-z]+)/u);
  return human ? `${human[1]![0]}${human[2]![0]}`.toUpperCase() : null;
}

export function DecisionStream({ entries }: { entries: DecisionEntry[] }) {
  return (
    <ul className="-mb-6">
      {entries.map((entry, index) => {
        const mark = markFor(entry.status);
        const badge = entry.actor ? initials(entry.actor) : null;
        return (
          <li key={`${entry.repository}:${entry.proposalId}`}>
            <div className="relative pb-6">
              {index === entries.length - 1 ? null : (
                <span aria-hidden className="absolute left-4 top-9 -ml-px h-full w-px bg-border" />
              )}
              <div className="relative flex gap-3">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-background ${mark.tone}`}>
                  <HugeiconsIcon icon={mark.icon} aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="min-w-0 text-compact">
                      <span className="font-medium text-foreground">{entry.status.replaceAll("_", " ")}</span>
                      <span className="text-muted-foreground"> in </span>
                      <Link className="underline-offset-2 hover:underline" href={`/repositories/${entry.repository}`}>
                        {entry.repositoryName}
                      </Link>
                    </p>
                    <RelativeTime className="shrink-0 text-micro text-muted-foreground" value={entry.recordedAt} />
                  </div>

                  <Link
                    className="mt-1 block text-body underline-offset-2 hover:underline"
                    href={`/repositories/${entry.repository}/proposals/${encodeURIComponent(entry.proposalId)}`}
                  >
                    {entry.claim || entry.target || entry.proposalId}
                  </Link>

                  {entry.reason ? (
                    <p className="mt-1.5 max-w-[80ch] text-compact text-muted-foreground">{entry.reason}</p>
                  ) : (
                    <p className="mt-1.5 text-compact text-muted-foreground">No reason is retained with this Decision.</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {entry.actor ? (
                      <span className="flex min-w-0 items-center gap-1.5" title={entry.actor}>
                        <Avatar className="size-5">
                          <AvatarFallback className="text-micro">{badge ?? "··"}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 truncate font-mono text-micro text-muted-foreground">{entry.actor}</span>
                      </span>
                    ) : null}
                    {entry.actorClass ? (
                      <span className="text-micro text-muted-foreground">
                        {entry.actorClass === "agent" ? "Agent performer" : "Human performer"}
                      </span>
                    ) : null}
                    {entry.sessionRef ? (
                      <span className="text-micro text-muted-foreground" title={entry.sessionRef}>
                        <WorkSessionRef reference={entry.sessionRef} prefix={18} />
                      </span>
                    ) : null}
                    <RecordId value={entry.proposalId} copy={false} />
                  </div>
                  {entry.authorityPrincipalId ? (
                    <p className="mt-1 font-mono text-micro text-muted-foreground">
                      Repository authority {entry.authorityPrincipalId}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
