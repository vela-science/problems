import { cn } from "@vela/ui/lib/utils";

/* Each Repository's face.
 *
 * Every product that makes a repository feel like a place gives it one — an
 * owner avatar on GitHub, an org mark on Hugging Face. The Problems had
 * nothing: four Repositories rendered as four identical rows of text, so the
 * container the whole product is organised around had no identity at all.
 *
 * The retained editorial composition draws each Repository as a constellation whose marks
 * bind to real counts. This is that idea
 * at identity scale, and it decodes the same way — the seven stars are the
 * seven stages of the loop, filled where this Repository has reached them, with
 * the gold route running as far as recorded Standing carries.
 *
 * So the mark is not decoration and is not a hash of the slug: two Repositories
 * look different exactly insofar as their state differs. A Repository with no
 * Decision has a visibly shorter route than one that replays to Standing. */

export type RepositoryMarkStage = boolean;

export function RepositoryMark({
  reached,
  className,
  title,
}: {
  /* Seven flags, in loop order: source, submission, proposal, verification,
     decision, replay, standing. */
  reached: RepositoryMarkStage[];
  className?: string;
  title?: string;
}) {
  /* A fixed arc, so position is stable and comparable between Repositories rather
     than being a second, unreadable variable. */
  const points = [
    [3, 14], [7, 8], [12, 5], [17, 4], [22, 6], [26, 11], [29, 17],
  ] as const;
  /* The route stops at the first stage NOT reached, not at the last one that
     was. A Repository that replays and holds Standing but has recorded no
     Decision has a gap in its loop, and drawing gold straight past it would
     claim a continuity the records do not have. */
  const gap = reached.indexOf(false);
  const carried = gap === -1 ? reached.length - 1 : gap - 1;

  return (
    <svg
      viewBox="0 0 32 22"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      className={cn("h-5 w-7 shrink-0 overflow-visible", className)}
    >
      {points.slice(0, -1).map(([x, y], index) => {
        const next = points[index + 1]!;
        const lit = index < carried;
        return (
          <line
            key={`${x}-${y}`}
            x1={x}
            y1={y}
            x2={next[0]}
            y2={next[1]}
            stroke={lit ? "var(--direction)" : "var(--border)"}
            strokeWidth={lit ? 1 : 0.75}
            strokeDasharray={lit ? undefined : "1.5 1.5"}
          />
        );
      })}
      {points.map(([x, y], index) => (
        <circle
          key={`${x}:${y}`}
          cx={x}
          cy={y}
          r={index === carried ? 2 : 1.5}
          fill={reached[index] ? "currentColor" : "var(--background)"}
          stroke="currentColor"
          strokeWidth={reached[index] ? 0 : 1}
          strokeDasharray={reached[index] ? undefined : "1.2 1.2"}
        />
      ))}
    </svg>
  );
}

/* Derived in one place so the mark and the Repository's own header can never
   disagree about what this Repository has reached. */
export function repositoryStages(counts: {
  source: boolean;
  submissions: number;
  proposals: number;
  verifications: number;
  decisions: number;
  replayed: boolean;
  accepted: number;
}): RepositoryMarkStage[] {
  return [
    counts.source,
    counts.submissions > 0,
    counts.proposals > 0,
    counts.verifications > 0,
    counts.decisions > 0,
    counts.replayed,
    counts.accepted > 0,
  ];
}
