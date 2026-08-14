import Link from "next/link";
import type { ClaimSummary } from "@vela/projection-data";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { Item, ItemContent } from "@vela/ui/components/item";
import { cn } from "@vela/ui/lib/utils";
import { StateGlyph } from "@vela/ui/vela/state-glyph";
import { RecordId } from "@/components/vela/record-id";
import { claimKey } from "@/lib/claim-key";
import { claimTitle, plural } from "@/lib/format";
import { parseSourceAssertion } from "@/lib/source-assertion";
import { RelativeTime } from "@/components/vela/relative-time";

/* One Claim, as a reader of this repository would name it.
 *
 * The row used to open with the assertion and close with two buttons that went
 * where the row already went. Fifty rows of the same sentence with the noun
 * swapped is not a ledger, and a hundred controls that duplicate the row link
 * is not access. So: the domain's own key leads and is the row's link, the
 * state the glyph draws is written out beside it, and the identity facts a
 * reader sorts and filters by are on the line below.
 *
 * The two glyph axes are supplied separately and neither is inferred from the
 * other. `verification` comes from a retained Verification Record and from
 * nothing else — deriving it from standing is what put a filled core, and the
 * words "verification passed", on every accepted Claim in the release. */

export type ClaimRowProps = {
  claim: ClaimSummary;
  href: string;
  /** A Verification Record for this Claim reported a pass. */
  verified: boolean;
  /** Absent when the result set holds one assertion kind and the chip cannot narrow it. */
  kindHref?: string;
};

/* The ring is the standing the projection retains, and nothing is promoted onto
   it. `contested` and `retracted` are producer-side flags carried in from the
   legacy source record, and a Claim's conditions are authored by the Submission
   that made it, so drawing them as `corrected` and `accepted_with_conditions`
   said an authority had ruled where none had. Both are written out below as
   what they are.

   The column is read straight. It used to hold `pending_review`, a
   Proposal-axis word, and the translation onto the standing axis lived in
   `@vela/projection-data` so the ledger row and the record page could not answer
   differently; the projection now writes the standing axis's own vocabulary and
   there is nothing left to translate. */

export function ClaimRow({ claim, href, verified, kindHref }: ClaimRowProps) {
  const standing = claim.standing;
  const display = claimTitle(claim.assertion, claim.id);
  const key = claimKey({
    assertion: claim.assertion,
    conditions: claim.conditions,
    sourceTitle: claim.source_title,
  });
  /* The lead is the row's one destination. Where the domain has no notation for
     this record the promoted lead carries the link, and where the assertion has
     no promotable lead the identifier does. */
  const lead = key?.value ?? display.title;

  /* The promoted lead is dropped from the body only when it is what the row led
     with. Leading with the domain key and still trimming it would start the
     assertion mid-sentence, which on a Submission row means starting inside a
     digest. */
  const body = key ? claim.assertion : display.assertion;

  /* Source-derived rows carry the adapter's flattened metadata sentence. On a
     record page a partial parse is refused; here the fields are worth more than
     the sentence, and `keepProse` returns the mathematics that follows them. */
  const structured = claim.source_type === "database_record"
    ? parseSourceAssertion(body, { keepProse: true })
    : { fields: [], rest: body };
  /* What survives the parse on a metadata-only row is the lead again. */
  const restText = structured.rest.replace(/:\s*$/u, "").trim();
  const showRest = restText.length > 0 && restText !== display.title && restText !== lead;

  return (
    <Item className="items-start rounded-none px-0 py-4">
      <StateGlyph className="mt-1" standing={standing} verification={verified ? "pass" : "not_attempted"} />
      <ItemContent className="min-w-0 gap-1">
        {/* Mono for a domain key, because it is an exact value; the promoted
            lead is a sentence and stays in interface type. */}
        {/* `break-words`, because a qualified Lean name is one unbroken token —
            `Erdos730.FullDensityTheorem.pairSet_infinite` ran off the right edge
            of a 375px viewport and the rest of the name was simply gone. */}
        <Link href={href} className={cn("min-w-0 break-words text-body text-foreground hover:underline", key && "font-mono")}>
          {lead || <RecordId value={claim.id} copy={false} />}
        </Link>

        {structured.fields.length ? (
          <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {structured.fields.map((field) => (
              <li
                key={`${field.label}:${field.value}`}
                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-micro ${field.affirmative ? "text-foreground" : "text-muted-foreground opacity-70"}`}
              >
                {field.kind === "tag" ? null : <span className="text-eyebrow uppercase text-muted-foreground">{field.label}</span>}
                {field.value}
              </li>
            ))}
          </ul>
        ) : null}

        {showRest ? (
          <p className="line-clamp-2 text-compact text-muted-foreground">
            <ScientificText text={structured.rest} />
          </p>
        ) : null}

        {/* One meta line, middot-joined.
            These were two paragraphs — the two state axes and the flags on one,
            the sort and facet keys on the next — separated by nothing but a
            line break. So a row stood eight lines tall on a phone before its
            neighbour began, and fifty of them made a ledger you scroll rather
            than scan. A spaced middot is this system's separator for inline
            facts of one kind on one line, and it was the thing missing that
            made two lines look necessary.

            The words stay even though the glyph draws standing and verification:
            a mark carries an axis only for a reader who already knows the mark. */}
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-micro text-muted-foreground">
          {[
            <span key="standing">{standing.replaceAll("_", " ")}</span>,
            <span key="verification">{verified ? "verification passed" : "no Verification Record"}</span>,
            claim.retracted ? <span key="retracted">retracted source flag</span> : null,
            claim.contested ? <span key="contested">contested source flag</span> : null,
            /* Always rendered, including at zero. The Evidence sort orders by
               this count, so a row that simply omits it when there is none
               leaves a reader unable to see what put it last. */
            <span key="evidence">{claim.evidence_count ? plural(claim.evidence_count, "evidence span") : "no evidence span"}</span>,
            claim.conditions.length ? <span key="conditions">{plural(claim.conditions.length, "condition")}</span> : null,
            claim.relation_count ? <span key="relations">{plural(claim.relation_count, "relation")}</span> : null,
            claim.revision && claim.revision > 1 ? <span key="revision">revision {claim.revision}</span> : null,
            kindHref ? (
              <Link key="kind" className="underline-offset-2 hover:text-foreground hover:underline" href={kindHref}>
                {claim.assertion_type.replaceAll("_", " ")}
              </Link>
            ) : null,
            claim.source_title ? <span key="source" className="min-w-0 max-w-full truncate">{claim.source_title}</span> : null,
            <RelativeTime key="recorded" value={claim.created} />,
            /* The lead is `lead || <RecordId>`, so a row without a promoted
               domain key already prints the identifier as its title. Printing
               it again in the meta line gave those rows the same value twice,
               once at each end. */
            lead ? <RecordId key="id" value={claim.id} label="Assertion identifier" /> : null,
          ].filter(Boolean).map((fact, index) => (
            <span key={(fact as { key: string }).key} className="inline-flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden className="text-muted-foreground/50">·</span> : null}
              {fact}
            </span>
          ))}
        </p>
      </ItemContent>
    </Item>
  );
}
