import Link from "next/link";
import { Avatar, AvatarFallback } from "@vela/ui/components/avatar";
import { cn } from "@vela/ui/lib/utils";
import { performerProfileSegment } from "@/lib/performer-route";

/* A person, with a mark beside their name.
 *
 * Every catalogue a reader arrives from puts an avatar next to whoever did the
 * thing — it is the fastest scan target on a row and the strongest signal that
 * a list is of acts by people. Vela had `Avatar` installed and used it in
 * exactly one component, so every other row naming an author was a bare string.
 *
 * Initials, not a photograph. A Repository's authors are Git identities and this
 * product has no image for them, will not fetch one from a third party (the CSP
 * is `connect-src 'self'`), and must not invent one.
 *
 * Machine performers use a squared fallback only when retained provenance says
 * they are a machine. A display name is never evidence of actor kind. */
export type ActorKind = "human" | "agent" | "ai_model" | "organization" | "deterministic_tool" | "unknown";

function isMachine(kind: ActorKind | null | undefined) {
  return kind === "agent" || kind === "ai_model" || kind === "deterministic_tool";
}

function actorInitials(name: string, machine: boolean) {
  if (machine) return "AI";
  return name
    .split(/[\s._-]+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Actor({
  name,
  kind = "unknown",
  performerId,
  className,
}: {
  name: string | null | undefined;
  kind?: ActorKind | null;
  performerId?: string | null;
  className?: string;
}) {
  if (!name) return null;
  const machine = isMachine(kind);
  const initials = actorInitials(name, machine);
  const content = <>
    <Avatar className={cn("size-5", machine && "rounded-md vela-machine-mark")}>
      <AvatarFallback className={cn("text-micro", machine && "rounded-md vela-machine-mark font-semibold")}>{initials}</AvatarFallback>
    </Avatar>
    <span className="min-w-0 truncate">{name}</span>
  </>;
  if (performerId) return <Link href={`/people/${performerProfileSegment(performerId)}`} className={cn("inline-flex min-w-0 items-center gap-1.5 hover:underline", className)} title={name} aria-label={name}>{content}</Link>;

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)} title={name}>
      {content}
    </span>
  );
}

export function Performer({
  name,
  kind = "unknown",
  performerId,
  detail,
  className,
}: {
  name: string | null | undefined;
  kind?: ActorKind | null;
  performerId?: string | null;
  detail?: string | null;
  className?: string;
}) {
  if (!name) return null;
  const machine = isMachine(kind);
  const content = <>
    <Avatar className={cn("size-8 shrink-0", machine && "rounded-md vela-machine-mark")}>
      <AvatarFallback className={cn("text-micro font-semibold", machine && "rounded-md vela-machine-mark")}>{actorInitials(name, machine)}</AvatarFallback>
    </Avatar>
    <span className="min-w-0">
      <span className="block truncate text-compact font-semibold">{name}</span>
      {detail ? <span className="block truncate text-micro text-muted-foreground">{detail}</span> : null}
    </span>
  </>;
  if (performerId) return <Link href={`/people/${performerProfileSegment(performerId)}`} className={cn("inline-flex min-w-0 items-center gap-2.5 hover:underline", className)} aria-label={name}>{content}</Link>;
  return <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>{content}</span>;
}
