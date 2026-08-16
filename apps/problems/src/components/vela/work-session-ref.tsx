import { RecordId } from "@/components/vela/record-id";

/* The external work session a Decision names, labelled as what it is.
 *
 * A Decision may retain a reference to the generic work session it came out
 * of — an Entire checkpoint, today. The reference rendered as a bare
 * `entire:checkpoint:01K…` string beside the Decision's other facts, with
 * nothing saying it pointed outside Vela at all, so it read as one more
 * opaque Vela identifier.
 *
 * Only the reference is retained. Vela stores no transcript, no checkpoint
 * contents and no session history: that provenance belongs to Entire, and
 * when it is absent it is unavailable rather than reconstructed here. Naming
 * the scheme is the whole of what this adds — it does not resolve, fetch or
 * link, because a link would imply this product can show you what is on the
 * other end of it. */

const SCHEMES: Record<string, string> = {
  entire: "Entire",
};

export function workSessionScheme(reference: string): string | null {
  const scheme = reference.split(":")[0];
  return scheme ? SCHEMES[scheme] ?? null : null;
}

export function WorkSessionRef({ reference, prefix = 22 }: { reference: string; prefix?: number }) {
  const scheme = workSessionScheme(reference);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      <span>{scheme ? `${scheme} session` : "work session"}</span>
      <RecordId value={reference} prefix={prefix} copy={false} />
    </span>
  );
}
