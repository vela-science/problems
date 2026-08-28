import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { LeanBlock, ProofChips, proofStanding } from "@/components/vela/lean-block";
import type { ProblemSourceOccurrence } from "@vela/projection-data";

/* The authors' own prose, typeset. Docstrings arrive as LaTeX-flavored
 * paragraphs; each renders through the same math pipeline the rest of the
 * product uses, and nothing else is interpreted — a docstring is quoted
 * source text, not markdown this product authored. */
export function Docstring({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.trim().split(/\n{2,}/u);
  return <div className={className}>
    {paragraphs.map((paragraph, index) => (
      <p key={index} className="mt-3 max-w-[80ch] text-body leading-7 first:mt-0">
        <ScientificText text={paragraph.replaceAll("\n", " ")} />
      </p>
    ))}
  </div>;
}

export function formalFilePath(occurrence: ProblemSourceOccurrence): string | null {
  const modulePath = occurrence.formal?.module;
  return modulePath ? `${modulePath.replaceAll(".", "/")}.lean` : null;
}

const relationLabels: Record<string, string> = {
  formal_statement_reference: "formal statement reference",
  proof_manifest_reference: "proof manifest reference",
};

/* One declaration, whole: what it says (docstring), what it states (Lean),
 * and what the library declares about its proof. */
export function FormalStatementCard({ occurrence, showDocstring = true }: {
  occurrence: ProblemSourceOccurrence;
  showDocstring?: boolean;
}) {
  const formal = occurrence.formal;
  const code = occurrence.summary?.trim();
  if (!code) return null;
  const exactBlob = occurrence.locators.find(({ url }) => url?.includes("/blob/"))?.url ?? null;
  /* Only one standing needs explaining, and it is the consequential one: a
     proof with a hole in it is the case a reader is most likely to mistake for
     a proof. The rest speak for themselves in the chip. */
  const standing = proofStanding(formal?.proof_present ?? null, formal?.proof_sorry_free ?? null);
  return <article className="min-w-0" aria-label={occurrence.native_id}>
    {showDocstring && formal?.docstring ? <Docstring text={formal.docstring} className="mb-4" /> : null}
    <LeanBlock
      code={code}
      path={formalFilePath(occurrence)}
      declaration={occurrence.native_id}
      actions={exactBlob ? <Button nativeButton={false} size="sm" variant="ghost" render={<a href={exactBlob} />}>Exact file</Button> : null}
      chips={<>
        <ProofChips
          proofPresent={formal?.proof_present ?? null}
          proofKind={formal?.proof_kind ?? null}
          sorryFree={formal?.proof_sorry_free ?? null}
          categoryLabel={formal?.category_label ?? null}
        />
        {occurrence.relation_kind ? <Badge variant="outline">{relationLabels[occurrence.relation_kind] ?? occurrence.relation_kind.replaceAll("_", " ")}</Badge> : null}
        {occurrence.occurrence_status === "canonical_anchor" ? <Badge variant="outline">canonical occurrence</Badge> : null}
        {formal?.proof_locator ? <a href={formal.proof_locator} className="inline-flex min-h-6 items-center text-micro underline underline-offset-4">external proof</a> : null}
      </>}
    />
    {standing?.detail ? <p className="mt-2 text-meta leading-5 text-muted-foreground">{standing.detail}</p> : null}
  </article>;
}
