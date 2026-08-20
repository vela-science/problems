import { StatusBadge } from "@vela/ui/vela/status-badge";
import { cn } from "@vela/ui/lib/utils";
import type { ProblemDiscovery, ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

/* The badge names its subject, because without one it reads as a verdict on
   the Problem. Erdős 321 shipped "Accepted locally" over a Claim whose own
   assertion says it "supplies a candidate answer ... not a proof of it", and
   the sentence that qualified it sat two blocks below and lost. A Claim is
   what an authorised Decision ruled on, so a Claim is what the word belongs
   to.

   The authority is named rather than gestured at. "locally" carried the
   Repository scope correctly but left the reader to guess which Repository,
   and Standing is per-Repository — there is no global one. Where the name is
   unavailable the wording falls back to the scope word rather than inventing
   an authority. */
export function localStandingLabel(standings: string[], repositoryName?: string | null): string {
  const values = [...new Set(standings)];
  const scope = repositoryName ? `in ${repositoryName}` : "locally";
  if (values.length === 0) return repositoryName ? `Not assessed in ${repositoryName}` : "Not assessed locally";
  if (values.length > 1) return repositoryName ? `Mixed Standing in ${repositoryName}` : "Mixed local Standing";
  const word = values[0]!.replaceAll("_", " ");
  return `${standings.length === 1 ? "Claim" : "Claims"} ${word} ${scope}`;
}

/* What the Standing actually ranges over.
 *
 * An earlier version of this said a Claim never binds the Problem's own
 * canonical occurrence and always ranges over reviewed references. That was
 * false: `reviewedProblemBindingOccurrences` returns the canonical occurrence
 * first, with `relation_kind: null`, and for a Problem with no reviewed entity
 * it returns nothing else — so on Erdős 887, one of the two Problems this
 * Repository has admitted a Claim about, the page said "not to this Problem's
 * own statement" about a binding that was exactly that. The sentence existed
 * to stop an overstatement and was making one in the other direction.
 *
 * A null relation is the Problem's own statement. Everything else is a
 * reference to it from another Source, and the two are named apart. */
const relationNoun: Record<string, [string, string]> = {
  formal_statement_reference: ["formal statement reference", "formal statement references"],
  proof_manifest_reference: ["proof manifest reference", "proof manifest references"],
  attributed_activity_reference: ["attributed activity record", "attributed activity records"],
  attributed_classification_reference: ["attributed classification record", "attributed classification records"],
};

export function standingScopeSentence(state: State): string | null {
  const bindings = state.claims.flatMap((claim) => claim.source_bindings ?? []);
  /* No bindings means no claim: `problemClaimsFromBindingRows` creates a claim
     only while processing a binding row, so an empty list is unreachable
     rather than an absence to word. */
  if (!state.claims.length || !bindings.length) return null;
  const canonical = bindings.filter(({ relation_kind }) => !relation_kind).length;
  const counts = new Map<string, number>();
  for (const binding of bindings) {
    if (!binding.relation_kind) continue;
    counts.set(binding.relation_kind, (counts.get(binding.relation_kind) ?? 0) + 1);
  }
  const references = [...counts].map(([kind, count]) => {
    const nouns = relationNoun[kind] ?? ["reviewed source occurrence", "reviewed source occurrences"];
    return `${count} ${count === 1 ? nouns[0] : nouns[1]}`;
  });
  if (canonical && !references.length) return "Scoped to this Problem's own retained statement.";
  if (!canonical) return `Scoped to ${references.join(" and ")}, not to this Problem's own statement.`;
  return `Scoped to this Problem's own retained statement and ${references.join(" and ")}.`;
}

/* This file keeps the label derivations the Workspace prelude and the
   discovery-row variant below share. The "Contribution path" cell is gone from
   both surfaces for the reason the directory dropped it: a hard-coded literal
   that never varied between rows is not a fact about the row. */
export function ProblemDiscoveryFacts({ problem, className }: { problem: ProblemDiscovery; className?: string }) {
  const standing = problem.record.local_standing ?? "unassessed";
  return <dl className={cn("flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-meta", className)}>
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <dt className="text-eyebrow text-muted-foreground">Source status</dt>
      <dd className="text-label capitalize">{problem.record.declared_status}</dd>
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <dt className="text-eyebrow text-muted-foreground">Local Standing</dt>
      <dd><StatusBadge state={standing} axis="standing">{localStandingLabel(problem.record.local_standing ? [problem.record.local_standing] : [])}</StatusBadge></dd>
    </div>
  </dl>;
}
