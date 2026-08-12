import { cn } from "../../lib/utils";

/** Canonical responsive Vela sail, transcribed from @vela/brand masters. */
export function BrandMark({
  profile = "full",
  size = profile === "micro" ? 22 : 44,
  className,
}: {
  profile?: "full" | "micro";
  size?: number;
  className?: string;
}) {
  const height = profile === "micro" ? size : Math.round(size * 0.8);
  return <svg viewBox={profile === "micro" ? "0 0 256 256" : "0 0 1000 800"} fill="none" aria-hidden focusable="false" className={cn("block flex-none overflow-visible", className)} style={{ width: size, height }}>
    {profile === "micro" ? <>
      <path fill="currentColor" d="M30 205 C88 203 151 169 207 30 C194 101 159 170 119 205 Z M211 43 H221 V205 H211 Z" />
      <path fill="var(--vela-mark-accent, var(--direction, var(--vela-direction)))" d="M20 205 C91 204 163 202 234 211 L232 220 C164 212 91 213 21 216 Z" />
    </> : <>
      <path fill="currentColor" d="M80 650 C300 646 560 610 800 82 C742 286 638 506 520 650 Z" />
      <path fill="currentColor" d="M520 650 C628 590 724 392 800 82 C770 322 734 516 690 650 Z" />
      <path stroke="currentColor" strokeLinecap="round" strokeWidth="12" d="M818 116 L818 650" />
      <path stroke="var(--vela-mark-accent, var(--direction, var(--vela-direction)))" strokeLinecap="round" strokeWidth="12" d="M65 657 C320 651 585 623 915 670" />
    </>}
  </svg>;
}
