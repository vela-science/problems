import {
  Agreement02Icon,
  Alert02Icon,
  ArrowRight02Icon,
  ArrowTurnBackwardIcon,
  Audit02Icon,
  CheckmarkBadge02Icon,
  CircleDotIcon,
  CircleSlashTwoIcon,
  Clock01Icon,
  DashedLineCircleIcon,
  GitCommitHorizontalIcon,
  HelpCircleIcon,
  PencilEdit02Icon,
  Refresh01Icon,
  Shield01Icon,
  ShieldBlockchainIcon,
  ShieldMinusIcon,
  Tick02Icon,
  UnavailableIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

export type StatusTone = "evidence" | "progress" | "caution" | "conflict" | "neutral";

const tones: Record<StatusTone, string> = {
  evidence: "border-[color-mix(in_srgb,var(--status-evidence)_45%,var(--border))] bg-[color-mix(in_srgb,var(--status-evidence)_8%,transparent)] text-[var(--status-evidence)]",
  progress: "border-[color-mix(in_srgb,var(--status-progress)_45%,var(--border))] bg-[color-mix(in_srgb,var(--status-progress)_8%,transparent)] text-[var(--status-progress)]",
  caution: "border-[color-mix(in_srgb,var(--status-caution)_50%,var(--border))] bg-[color-mix(in_srgb,var(--status-caution)_8%,transparent)] text-[var(--status-caution)]",
  conflict: "border-[color-mix(in_srgb,var(--status-conflict)_50%,var(--border))] bg-[color-mix(in_srgb,var(--status-conflict)_8%,transparent)] text-[var(--status-conflict)]",
  neutral: "border-border bg-muted/50 text-muted-foreground",
};

const icons = {
  evidence: Shield01Icon,
  progress: Tick02Icon,
  caution: Alert02Icon,
  conflict: Alert02Icon,
  neutral: DashedLineCircleIcon,
};

/* Vela keeps four independent state vocabularies and the protocol is explicit
 * that collapsing them is the named failure mode. They are grouped here so the
 * axis a state belongs to stays visible in the source, and so no two axes can
 * quietly share a glyph:
 *
 *   standing     what an authorized human Decision established
 *   verification what a scoped machine check reported
 *   proposal     where a Proposal sits in the review lifecycle
 *   integrity    whether the repository replays and passes strict checks
 *
 * Verification keeps the shield family and evidence teal; a Decision keeps the
 * commit family and progress green. Different hue, different glyph, different
 * word — so "verification passed" can never be read as "accepted".
 *
 * Every state also gets its own icon. Five states previously shared
 * Alert02Icon, which left them separated by colour alone (WCAG 1.4.1). */
export type StateAxis = "standing" | "verification" | "proposal" | "integrity";

/* One word is legal on more than one axis: a Proposal and a Claim can both be
 * `accepted`. The protocol's lifecycle vocabularies (vela docs/TERMINOLOGY.md,
 * "Lifecycle vocabularies") name `rejected` and `withdrawn` on the Proposal
 * axis only — Claim standing runs unassessed, accepted, accepted_with_conditions,
 * retracted, superseded, corrected — so a Decision that rejects a Proposal is
 * still a Proposal word. The map can only carry one axis per word, so a caller
 * rendering `accepted` as Claim standing passes `axis` explicitly rather than
 * shipping a badge whose `data-axis` names the wrong vocabulary.
 *
 * `axis` is optional because a word the protocol names on no axis has none,
 * and saying so is not the same as leaving it out. `recorded` and `contested`
 * were both filed under standing, three lines below a comment reciting the six
 * words that axis actually runs — neither is among them. The cost was not
 * theoretical: the projection writes `recorded` onto every Artifact and
 * Problem node, so those rows rendered as "Claim standing · recorded", naming
 * a vocabulary the row was never measured against. `recorded` says the
 * repository retains the object; `contested` is a producer-side import flag on
 * a Claim. Both are facts, neither is a ruling, and the surfaces that print
 * them fall back to the bare word. */
const states: Record<string, { tone: StatusTone; icon: typeof Shield01Icon; axis?: StateAxis }> = {
  /* standing — only a Decision moves these. All six the protocol declares, so
     a word arriving from a future Decision is not silently axis-less. */
  accepted: { tone: "progress", icon: GitCommitHorizontalIcon, axis: "standing" },
  accepted_with_conditions: { tone: "caution", icon: Agreement02Icon, axis: "standing" },
  unassessed: { tone: "neutral", icon: DashedLineCircleIcon, axis: "standing" },
  superseded: { tone: "neutral", icon: ArrowRight02Icon, axis: "standing" },
  corrected: { tone: "caution", icon: PencilEdit02Icon, axis: "standing" },
  retracted: { tone: "conflict", icon: CircleSlashTwoIcon, axis: "standing" },

  /* no axis — retention and a producer flag, not a lifecycle position */
  recorded: { tone: "neutral", icon: CircleDotIcon },
  contested: { tone: "conflict", icon: UnavailableIcon },

  /* verification — scoped evidence, never acceptance */
  verified: { tone: "evidence", icon: Shield01Icon, axis: "verification" },
  pass: { tone: "evidence", icon: Shield01Icon, axis: "verification" },
  fail: { tone: "conflict", icon: ShieldBlockchainIcon, axis: "verification" },
  inconclusive: { tone: "neutral", icon: HelpCircleIcon, axis: "verification" },
  error: { tone: "neutral", icon: Alert02Icon, axis: "verification" },
  not_attempted: { tone: "neutral", icon: ShieldMinusIcon, axis: "verification" },

  /* proposal — workflow position, no colour of its own beyond the terminal ones */
  pending_review: { tone: "caution", icon: Clock01Icon, axis: "proposal" },
  reviewed: { tone: "neutral", icon: Audit02Icon, axis: "proposal" },
  rejected: { tone: "conflict", icon: CircleSlashTwoIcon, axis: "proposal" },
  withdrawn: { tone: "neutral", icon: ArrowTurnBackwardIcon, axis: "proposal" },

  /* integrity — replay and strict answer different questions than either above */
  replayed: { tone: "evidence", icon: Refresh01Icon, axis: "integrity" },
  strict_pass: { tone: "evidence", icon: CheckmarkBadge02Icon, axis: "integrity" },
  strict_blocked: { tone: "conflict", icon: Alert02Icon, axis: "integrity" },
  not_initialized: { tone: "neutral", icon: ShieldMinusIcon, axis: "integrity" },
};

/* The state → tone half of the map, for a surface that paints a state without
   rendering a badge. A graph canvas takes literal colour rather than the class
   strings above, and deriving the tone here is what stopped the map and the
   badge over it from assigning the same word opposite hues. */
export const stateTones: Record<string, StatusTone> = Object.fromEntries(
  Object.entries(states).map(([state, semantics]) => [state, semantics.tone]),
);

/* The state → axis half, for a surface that must name the axis in words rather
   than carry it in `data-axis`. A projection column written from four axes at
   once (`search_documents.standing`, `graph_nodes.standing`) recovers the axis
   from this rather than from a second literal, which is the drift `stateTones`
   was introduced to stop one map over.

   Words with no axis are absent rather than present-and-undefined, so a caller
   asking this map whether a word has an axis gets `undefined` from a miss and
   never an axis name it then has to disbelieve. */
export const stateAxesByWord: Record<string, StateAxis> = Object.fromEntries(
  Object.entries(states)
    .filter((entry): entry is [string, { tone: StatusTone; icon: typeof Shield01Icon; axis: StateAxis }] =>
      entry[1].axis !== undefined)
    .map(([state, semantics]) => [state, semantics.axis]),
);

/* The state → glyph half, for a surface that draws a state's mark without
   rendering a badge. The Decision stream carried its own two-row copy of this
   and filed `accepted` and `rejected` on one axis, which is the conflation the
   map above exists to prevent. */
export const stateIcons: Record<string, typeof Shield01Icon> = Object.fromEntries(
  Object.entries(states).map(([state, semantics]) => [state, semantics.icon]),
);

/* The tone → solid fill, for a surface that paints a tone as an area rather
   than as a badge: a composition segment, a signal dot. Keyed by tone rather
   than by state, so it cannot be derived from the map above. Two Observatory
   components held their own copies and one was missing the neutral row, which
   is why the vocabulary is declared once here and imported. Neutral has no
   status hue by definition, so it takes the muted rule colour. */
export const toneFills: Record<StatusTone, string> = {
  evidence: "bg-status-evidence",
  progress: "bg-status-progress",
  caution: "bg-status-caution",
  conflict: "bg-status-conflict",
  neutral: "bg-muted-foreground/55",
};

type StatusBadgeProps = {
  children: React.ReactNode;
  icon?: "commit";
  /** Overrides the axis the state word maps to, for words legal on two axes. */
  axis?: StateAxis;
  className?: string;
} & (
  | { state: string; tone?: never }
  | { state?: never; tone: StatusTone }
);

export function StatusBadge({ tone, state, children, icon, axis, className }: StatusBadgeProps) {
  const semantics = state ? states[state] : undefined;
  const resolvedTone = semantics?.tone ?? tone ?? "neutral";
  const statusIcon = icon === "commit"
    ? GitCommitHorizontalIcon
    : semantics?.icon ?? icons[resolvedTone];
  return (
    <Badge
      variant="outline"
      data-state={state}
      data-axis={axis ?? semantics?.axis}
      data-tone={resolvedTone}
      className={cn("h-6 gap-1.5 rounded px-2 text-xs font-medium leading-none", tones[resolvedTone], className)}
    >
      <HugeiconsIcon icon={statusIcon} aria-hidden className="size-3" />
      <span>{children}</span>
    </Badge>
  );
}
