import { Avatar, AvatarFallback } from "@vela/ui/components/avatar";
import { cn } from "@vela/ui/lib/utils";

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
 * A machine actor gets no avatar. `vela`, `Canopus Agent` and
 * `github-actions[bot]` are not people, and drawing them as people is the kind
 * of small false claim this product exists not to make. */
const MACHINE = /^(vela|canopus|github-actions|agent[:@]|local:|.*\[bot\])/iu;

export function Actor({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  if (!name) return null;
  const machine = MACHINE.test(name);
  const initials = name
    .split(/[\s._-]+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)} title={name}>
      {machine ? null : (
        <Avatar className="size-4">
          <AvatarFallback className="text-[0.5rem]">{initials}</AvatarFallback>
        </Avatar>
      )}
      <span className={cn("min-w-0 truncate", machine && "font-mono")}>{name}</span>
    </span>
  );
}
