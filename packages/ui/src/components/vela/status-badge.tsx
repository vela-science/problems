import {
  Alert02Icon,
  Audit02Icon,
  CheckmarkBadge02Icon,
  CircleDotIcon,
  CircleSlashTwoIcon,
  DashedLineCircleIcon,
  GitCommitHorizontalIcon,
  Refresh01Icon,
  Shield01Icon,
  Tick02Icon,
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

const states: Record<string, { tone: StatusTone; icon: typeof Shield01Icon }> = {
  accepted: { tone: "progress", icon: GitCommitHorizontalIcon },
  applied: { tone: "progress", icon: GitCommitHorizontalIcon },
  verified: { tone: "evidence", icon: Shield01Icon },
  pass: { tone: "evidence", icon: Shield01Icon },
  replayed: { tone: "evidence", icon: Refresh01Icon },
  strict_pass: { tone: "evidence", icon: CheckmarkBadge02Icon },
  reviewed: { tone: "neutral", icon: Audit02Icon },
  recorded: { tone: "neutral", icon: CircleDotIcon },
  pending_review: { tone: "caution", icon: Alert02Icon },
  contested: { tone: "conflict", icon: Alert02Icon },
  rejected: { tone: "conflict", icon: CircleSlashTwoIcon },
  retracted: { tone: "conflict", icon: CircleSlashTwoIcon },
  strict_blocked: { tone: "conflict", icon: Alert02Icon },
  withdrawn: { tone: "conflict", icon: CircleSlashTwoIcon },
};

type StatusBadgeProps = {
  children: React.ReactNode;
  icon?: "commit";
  className?: string;
} & (
  | { state: string; tone?: never }
  | { state?: never; tone: StatusTone }
);

export function StatusBadge({ tone, state, children, icon, className }: StatusBadgeProps) {
  const semantics = state ? states[state] : undefined;
  const resolvedTone = semantics?.tone ?? tone ?? "neutral";
  const statusIcon = icon === "commit"
    ? GitCommitHorizontalIcon
    : semantics?.icon ?? icons[resolvedTone];
  return (
    <Badge
      variant="outline"
      data-state={state}
      data-tone={resolvedTone}
      className={cn("h-6 gap-1.5 rounded px-2 text-xs font-medium leading-none", tones[resolvedTone], className)}
    >
      <HugeiconsIcon icon={statusIcon} aria-hidden className="size-3" />
      <span>{children}</span>
    </Badge>
  );
}
