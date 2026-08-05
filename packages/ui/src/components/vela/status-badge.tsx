import {
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

/* Three words are legal on more than one axis: a Proposal and a Claim can both
 * be `accepted`, and `rejected` / `withdrawn` read as Proposal workflow here
 * but are a Decision's wording elsewhere. The map can only carry one axis per
 * word, so a caller rendering the other one passes `axis` explicitly rather
 * than shipping a badge whose `data-axis` names the wrong vocabulary. */
const states: Record<string, { tone: StatusTone; icon: typeof Shield01Icon; axis: StateAxis }> = {
  /* standing — only a Decision moves these */
  accepted: { tone: "progress", icon: GitCommitHorizontalIcon, axis: "standing" },
  unassessed: { tone: "neutral", icon: DashedLineCircleIcon, axis: "standing" },
  recorded: { tone: "neutral", icon: CircleDotIcon, axis: "standing" },
  superseded: { tone: "neutral", icon: ArrowRight02Icon, axis: "standing" },
  corrected: { tone: "caution", icon: PencilEdit02Icon, axis: "standing" },
  contested: { tone: "conflict", icon: UnavailableIcon, axis: "standing" },
  retracted: { tone: "conflict", icon: CircleSlashTwoIcon, axis: "standing" },

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
