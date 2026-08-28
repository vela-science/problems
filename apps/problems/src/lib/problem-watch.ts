import { assessAnchorFreshness, type AnchorFreshness, type ProblemActivity, type ScientificAnchor } from "@vela/activity-data/contracts";
import { problemReachStops } from "@/lib/problem-reach";
import { scientificProblemState, type ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

export type ProblemWatch = {
  /** When this account first followed a state of this Problem. */
  since: string;
  followedRoot: string;
  /** Which axis of the anchor moved, and which fields on it. */
  moved: AnchorFreshness;
  /** Reach stages the record has acquired since the watch began. */
  gained: string[];
  /** Reach stages the record no longer retains. */
  lost: string[];
  /** The followed release is no longer readable, so the two tracks cannot be compared. */
  reachUnavailable: boolean;
};

/* What has moved since this account started watching.
 *
 * A follow binds to one exact anchor and never migrates to a later one. That
 * is the invariant the activity store enforces and the live proof asserts:
 * a new release must not silently inherit a follow of a state the reader has
 * not seen. Read the other way round, it is a notification for free — a
 * followed root that is no longer the current root is exactly the statement
 * "this record moved while you were away", and the product was throwing it on
 * the floor and rendering an unpressed Follow button in its place.
 *
 * What the watch is allowed to say is bounded on purpose. It reports the reach
 * axis this Problem already draws in three places, and the anchor fields that
 * differ. It does not summarise, rank, digest, or aggregate across Problems,
 * and it never says a question was answered — reaching Decision is a Repository
 * accepting a Claim, which is not the same sentence and never becomes it.
 *
 * The comparison is a second exact read at the followed release root, so a
 * release that has since been pruned yields no track rather than a guess. */
export async function problemWatch(
  state: State,
  activity: Pick<ProblemActivity, "anchors" | "following" | "followedAnchorRoots">,
): Promise<ProblemWatch | null> {
  if (activity.following || !activity.followedAnchorRoots.length) return null;
  const followed = new Set<string>(activity.followedAnchorRoots);
  const anchors = activity.anchors
    .filter((anchor) => followed.has(anchor.root))
    .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt));
  const earliest = anchors[0];
  /* A followed root with no anchor row is unreadable rather than absent: the
     follow is real, and saying nothing is more honest than inventing a date. */
  if (!earliest) return null;

  const moved = assessAnchorFreshness(earliest, state.anchor as ScientificAnchor);
  if (moved.state === "current") return null;

  const now = problemReachStops(state);
  let gained: string[] = [];
  let lost: string[] = [];
  let reachUnavailable = false;
  try {
    const before = await scientificProblemState(
      state.repositorySlug,
      state.problem.problem,
      earliest.projectionReleaseRoot,
    );
    if (!before) throw new Error("the followed release does not retain this Problem");
    const previous = new Map(problemReachStops(before).map((stop) => [stop.label, stop.reached]));
    gained = now.filter((stop) => stop.reached && previous.get(stop.label) === false).map((stop) => stop.label);
    lost = now.filter((stop) => !stop.reached && previous.get(stop.label) === true).map((stop) => stop.label);
  } catch {
    reachUnavailable = true;
  }

  return { since: earliest.capturedAt, followedRoot: earliest.root, moved, gained, lost, reachUnavailable };
}

/* One sentence, in the vocabulary the track already uses. Reach is the axis a
   reader has seen on Overview, on Work and in the rail, so a watch that speaks
   any other language is a second ontology for the same fact. */
export function problemWatchSentence(watch: ProblemWatch): string {
  if (watch.gained.length && !watch.lost.length) {
    return `Reach advanced to ${listed(watch.gained)}.`;
  }
  if (watch.lost.length && !watch.gained.length) {
    return `The record no longer retains ${listed(watch.lost)}.`;
  }
  if (watch.gained.length && watch.lost.length) {
    return `Reach advanced to ${listed(watch.gained)}, and the record no longer retains ${listed(watch.lost)}.`;
  }
  if (watch.reachUnavailable) {
    return "The release you followed is no longer readable here, so the two states cannot be compared stage by stage.";
  }
  return "The anchor moved and the record reaches exactly as far as it did.";
}

function listed(labels: string[]): string {
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
