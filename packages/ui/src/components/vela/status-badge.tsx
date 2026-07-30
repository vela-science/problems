import { Alert02Icon, DashedLineCircleIcon, GitCommitHorizontalIcon, Shield01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
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

export function StatusBadge({ tone, children, icon, className }: {
  tone: StatusTone;
  children: React.ReactNode;
  icon?: "commit";
  className?: string;
}) {
  const statusIcon = icon === "commit" ? GitCommitHorizontalIcon : icons[tone];
  return (
    <Badge variant="outline" className={cn("h-6 gap-1.5 rounded px-2 text-xs font-medium leading-none", tones[tone], className)}>
      <HugeiconsIcon icon={statusIcon} aria-hidden className="size-3" />
      <span>{children}</span>
    </Badge>
  );
}
