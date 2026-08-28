import { PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight01Icon as ArrowRight, FileCheckIcon as FileCheck2 } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { claimNeighbours,
  buildClaimStandingView,
  claimRecordById,
  repositoryBySlug,
  repositoryObjectSourceRecord,
  objectContextById,
  statusStateRoots,
  type ClaimStandingLineage,
  type ObjectContextGroup,
  type SiteObjectContext,
} from "@vela/projection-data";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { ExactValue } from "@vela/ui/vela/exact-value";
import { CopyButton } from "@vela/ui/vela/copy-button";
import { Disclosure } from "@/components/vela/disclosure";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { claimTitle, formatDate } from "@/lib/format";
import { FacetLink } from "@/components/vela/facet-link";
import { RecordSteps } from "@/components/vela/record-steps";
import { RecordPreview } from "@/components/vela/record-preview";
import { CanonicalBytes } from "@/components/vela/canonical-bytes";
import { SourceFile } from "@/components/vela/source-file";
import { recordTitle, stateAxis, stateLabel } from "@/lib/product-language";
import { parseSourceAssertion } from "@/lib/source-assertion";
import { RecordFacts } from "@/components/vela/record-facts";
import { RecordHeader } from "@/components/vela/record-header";
import { Button } from "@vela/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@vela/ui/components/collapsible";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { RootFact } from "@/components/vela/root-fact";
import { ReviewProvenance } from "@/components/vela/review-provenance";
import { resultConditionPresentation } from "@/lib/result-condition";

export const dynamicParams = true;
export const dynamic = "force-static";
export const revalidate = false;
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: PageProps<"/repositories/[slug]/claims/[id]">): Promise<Metadata> {
  const { slug, id } = await params;
  const claim = await claimRecordById(slug, id);
  return claim ? { title: recordTitle(claim), description: claim.assertion, alternates: { canonical: `/repositories/${slug}/claims/${id}` } } : {};
}

export function claimImpactSummary(context: SiteObjectContext | undefined) {
  const count = (direction: "incoming" | "outgoing", relation: string) =>
    context?.groups.find((group) => (
      group.direction === direction && group.relation === relation
    ))?.count ?? 0;
  return {
    supersedes: count("outgoing", "supersedes"),
    superseded_by: count("incoming", "supersedes"),
    direct_dependents: count("incoming", "depends"),
  };
}

export function relationshipHeading(group: ObjectContextGroup): string {
  const names: Record<string, [string, string]> = {
    contradicts: ["Contradicts", "Contradicted by"],
    depends: ["Depends on", "Required by"],
    describes: ["Describes", "Described by"],
    replicates: ["Replicates", "Replicated by"],
    supports: ["Supports", "Supported by"],
    supersedes: ["Supersedes", "Superseded by"],
    synthesized_from: ["Synthesized from", "Source for"],
  };
  const [outgoing, incoming] = names[group.relation] ?? [
    group.relation.replaceAll("_", " "),
    `${group.relation.replaceAll("_", " ")} from`,
  ];
  return group.direction === "outgoing" ? outgoing : incoming;
}

export default async function FindingPage({ params }: PageProps<"/repositories/[slug]/claims/[id]">) {
  const { slug, id } = await params;
  const [repository, claim, neighbours] = await Promise.all([
    repositoryBySlug(slug),
    claimRecordById(slug, id),
    claimNeighbours(slug, id),
  ]);
  if (!repository || !claim) notFound();
  const context = repository.graph ? await objectContextById(slug, id) : undefined;
  /* Sources link out to Claims; this is the return path. The same binding row
     that produced the outbound link resolves the source-native record, so a
     Claim can name the source it came from instead of dead-ending. */
  const boundSource = await repositoryObjectSourceRecord({
    repositorySlug: slug,
    objectKind: "claim",
    objectId: claim.id,
  });
  const sourceLocator = boundSource?.record.locators.find((entry) => entry.url)?.url ?? null;
  const ledger = `/repositories/${slug}/claims`;
  const citation = [
    repository.status.repository.name,
    `Claim ${claim.id}`,
    claim.root,
    `https://problems.science/repositories/${slug}/claims/${claim.id}`,
  ].filter(Boolean).join(". ");
  const stateRoots = statusStateRoots(repository.status);
  const standingView = buildClaimStandingView(claim, repository.reviews);
  /* Every scoped check bound to this Claim, across its Proposals, ordered by
     the property each one names. Flattening across lineages rather than
     reducing within one is the point: the pair that disagrees is what a reader
     has to see. */
  const assurance = standingView.lineages
    .flatMap((lineage) => lineage.verifications)
    .sort((left, right) => (left.property ?? left.id).localeCompare(right.property ?? right.id));
  const impact = claimImpactSummary(context);
  const affectedCount = impact.supersedes + impact.superseded_by + impact.direct_dependents;
  const display = claimTitle(claim.assertion, claim.id);
  /* claimTitle no longer falls back to the identifier, so an assertion with no
     promotable lead yields an empty title rather than a 64-hex heading. */
  const recordTitle = display.title || `${claim.assertion_type.replaceAll("_", " ")} Claim`;
  const assertionBody = display.title ? display.assertion : claim.assertion;
  const structured = parseSourceAssertion(claim.assertion);

  return (
    <PageShell archetype="reading" layout="reading">
      <RecordHeader
        kind="Claim"
        title={<span className="capitalize">{recordTitle}</span>}
        state={<>
          <StatusBadge state={standingView.standing}>{standingView.standing.replaceAll("_", " ")}</StatusBadge>
          {claim.contested ? <StatusBadge state="contested">contested source flag</StatusBadge> : null}
          {claim.retracted ? <StatusBadge state="retracted">retracted source flag</StatusBadge> : null}
        </>}
        provenance={<>
          <span>{repository.status.repository.name}</span>
          <span>recorded {formatDate(claim.created)}</span>
        </>}
        /* The slot was empty while Reproduce and the graph link sat stranded at
           the foot of the page. Stepping is what a reader of 2,782 records
           reaches for first. */
        actions={
          <RecordSteps
            previous={neighbours.previous}
            next={neighbours.next}
            hrefFor={(neighbour) => `/repositories/${slug}/claims/${neighbour}`}
            label="Claim"
          />
        }
      />
      {boundSource ? (
        <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-meta text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <dt className="text-eyebrow">Source</dt>
            <dd>
              <Link className="underline underline-offset-2 hover:text-foreground" href={`/sources/${encodeURIComponent(boundSource.binding.source_id)}`}>
                {boundSource.binding.source_id}
              </Link>
            </dd>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <dt className="text-eyebrow">Source record</dt>
            <dd className="min-w-0">
              <Link className="font-mono underline underline-offset-2 [overflow-wrap:anywhere] hover:text-foreground" href={`/sources/${encodeURIComponent(boundSource.binding.source_id)}?q=${encodeURIComponent(boundSource.record.native_id)}`}>
                {boundSource.record.native_id}
              </Link>
            </dd>
          </div>
          {sourceLocator ? (
            <div className="flex items-center gap-1.5">
              <dt className="text-eyebrow">Published at</dt>
              <dd><a className="underline underline-offset-2 hover:text-foreground" href={sourceLocator} rel="noreferrer nofollow" target="_blank">{new URL(sourceLocator).hostname}</a></dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <section aria-labelledby="assertion-heading">
        <h2 id="assertion-heading" className="mb-3 text-eyebrow text-muted-foreground">{structured.fields.length ? "Source-reported record" : "Canonical assertion"}</h2>
        {structured.fields.length ? (
          /* Four structured values, shown as values. Each links into the ledger
             facet it belongs to, so the record's own metadata is navigation. */
          <ul className="flex max-w-4xl flex-wrap items-center gap-2">
            {structured.fields.map((field) => (
              <li key={`${field.label}:${field.value}`}>
                {field.kind === "tag" ? (
                  <Link className="inline-flex items-center rounded border px-2 py-1 text-micro text-muted-foreground hover:bg-accent hover:text-foreground" href={`/repositories/${slug}/claims?q=${encodeURIComponent(field.value)}`}>{field.value}</Link>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-micro ${field.affirmative ? "text-foreground" : "text-muted-foreground opacity-70"}`}>
                    <span className="text-eyebrow text-muted-foreground">{field.label}</span>
                    {field.value}
                  </span>
                )}
              </li>
            ))}
            {structured.rest && !recordTitle.includes(structured.rest.replace(/:$/u, "")) ? <li className="text-compact text-muted-foreground">{structured.rest}</li> : null}
          </ul>
        ) : (
          <p className="max-w-4xl text-title leading-8 text-foreground"><ScientificText text={assertionBody} /></p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="standing-heading">
        <h2 id="standing-heading" className="mb-3 text-subtitle">Local Standing</h2>
        <ItemGroup className="divide-y">
          <Item size="sm" className="rounded-none px-0 py-3"><ItemContent><ItemTitle>Local Standing</ItemTitle><ItemDescription>Replayed at commit {repository.source.commit.slice(0, 12)}.</ItemDescription></ItemContent><StatusBadge state={standingView.standing}>{standingView.standing.replaceAll("_", " ")}</StatusBadge></Item>
          {claim.evidence_count ? <Item size="sm" className="rounded-none px-0 py-3"><ItemContent><ItemTitle>Evidence</ItemTitle><ItemDescription>{claim.evidence_count} retained {claim.evidence_count === 1 ? "span" : "spans"}.</ItemDescription></ItemContent><span className="shrink-0 font-mono text-meta text-muted-foreground">{claim.evidence_count}</span></Item> : null}
          {affectedCount ? <Item size="sm" className="rounded-none px-0 py-3"><ItemContent><ItemTitle>Correction impact</ItemTitle><ItemDescription>{impact.supersedes} supersedes · {impact.superseded_by} successors · {impact.direct_dependents} dependents</ItemDescription></ItemContent><span className="shrink-0 font-mono text-meta text-muted-foreground">{affectedCount} affected</span></Item> : null}
        </ItemGroup>

        {/* The assurance vector, above the fold and unreduced.

            This is the whole reason the Claim page exists in this shape. Every
            other surface answers "did it pass?" with one word, and for the
            Erdos 522 case every available single word is false: the Lean kernel
            accepted the theorem, and the statement it proves is vacuous. `pass`
            hides that nothing was established about the problem; `fail` hides
            that the development is sound. Both records are on the same
            Proposal, so both belong on the same screen, each naming the
            question it answered. */}
        {assurance.length > 1 ? (
          <div className="mt-6">
            <h3 className="text-label">Assurance</h3>
            <p className="mt-1 max-w-3xl text-meta text-muted-foreground">{assurance.length} scoped checks, each answering a different question. They do not combine into a single verdict, and none of them is the Claim&apos;s Standing.</p>
            <ItemGroup className="mt-2 divide-y">
              {assurance.map((check) => (
                <Item key={check.id} size="sm" className="items-start rounded-none px-0 py-3">
                  <ItemContent className="min-w-0">
                    <ItemTitle className="font-mono">{check.property ?? check.id}</ItemTitle>
                    <ItemDescription>{check.does_not_establish.length ? `Declares ${check.does_not_establish.length} limit${check.does_not_establish.length === 1 ? "" : "s"} on what it establishes.` : "Declares no limit on what it establishes."}</ItemDescription>
                  </ItemContent>
                  <StatusBadge state={check.outcome}>{check.outcome}</StatusBadge>
                </Item>
              ))}
            </ItemGroup>
          </div>
        ) : null}

        {standingView.lineage_state === "not_projected" ? null : (
          <div className="mt-6">
            {/* A sub-heading, so it must not match the section it sits inside. It was
              `text-subtitle` while its own parent H2 was `text-sm`, i.e. drawn
              larger than the heading that contained it. */}
          <h3 className="text-label">Evidence and Decision</h3>
            <p className="mt-1 text-meta text-muted-foreground">Exact retained path.</p>
            <div className="mt-3 space-y-3">{standingView.lineages.map((lineage) => <Lineage key={lineage.proposal.id} repository={repository.slug} lineage={lineage} />)}</div>
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="relationships-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="relationships-heading" className="text-subtitle">Exact relationships</h2>
            <p className="mt-1 text-meta text-muted-foreground">Typed edges retained by this projection.</p>
          </div>
          <span className="font-mono text-meta text-muted-foreground">{context?.relationship_count ?? 0} relationships</span>
        </div>
        {context?.groups.length ? <div className="space-y-6">
          {context.groups.map((group) => <section key={group.key} aria-labelledby={`relationship-${group.key.replaceAll(":", "-")}`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 id={`relationship-${group.key.replaceAll(":", "-")}`} className="text-label text-muted-foreground">{relationshipHeading(group)}</h3>
              <span className="font-mono text-meta text-muted-foreground">{group.count}</span>
            </div>
            <ItemGroup className="divide-y">
              {group.relationships.map((relationship) => <Item key={relationship.id} role="listitem" className="items-start rounded-none px-0 py-4">
                <ItemContent className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
                    <span>{relationship.related.kind.replaceAll("_", " ")}</span>
                    <span aria-hidden>·</span>
                    {/* `ObjectContextNode.standing` is the graph projection's
                        one mixed column, same as `graph_nodes.standing`: a
                        related Proposal carries `pending_review` here and a
                        related verifier attachment carries `pass`. Printed bare
                        beside a Claim's own Standing they all read as standing,
                        so each names its own axis, recovered from the kind. */}
                    <span>{stateLabel(relationship.related.standing, stateAxis(relationship.related.standing, relationship.related.kind))}</span>
                    <span aria-hidden>·</span>
                    <span>{relationship.trust ?? "unclassified"} edge</span>
                    {relationship.inferred ? <><span aria-hidden>·</span><span>materialized</span></> : null}
                  </div>
                  <ItemTitle>
                    {relationship.related.href
                      ? <Link href={relationship.related.href} className="hover:underline">{relationship.related.label}</Link>
                      : relationship.related.label}
                  </ItemTitle>
                  <ItemDescription className="mt-1 line-clamp-none">{relationship.evidence ?? "No edge evidence text is retained."}</ItemDescription>
                  {relationship.source_root ? <div className="mt-3 max-w-full"><ExactValue value={relationship.source_root} label={`${group.relation} edge source root`} /></div> : null}
                </ItemContent>
                <ItemActions className="basis-full justify-end sm:basis-auto">
                  <Button nativeButton={false} variant="ghost" size="sm" aria-label={`Inspect ${relationship.related.id} in graph`} render={<Link href={`/graph?repository=${repository.slug}&lens=research&node=${encodeURIComponent(relationship.related.id)}`} />}>Graph <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button>
                </ItemActions>
              </Item>)}
            </ItemGroup>
          </section>)}
        </div> : <Item variant="muted"><ItemContent><ItemTitle>No rooted graph relationships</ItemTitle><ItemDescription>No typed edge is retained for it.</ItemDescription></ItemContent></Item>}
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-8">
          {/* Absence stated once, below the evidence, rather than as three empty
              sections occupying the opening screen. A zero is a fact about this
              release; it is not a result, and it does not outrank real content. */}
          <section aria-labelledby="absent-heading">
            <h2 id="absent-heading" className="mb-3 text-subtitle">Not recorded for this Claim</h2>
            <ul className="max-w-3xl space-y-1 text-compact text-muted-foreground">
              {claim.evidence_count ? null : <li>No evidence span is retained.</li>}
              {affectedCount ? null : <li>No correction supersedes, succeeds, or depends on it.</li>}
              {standingView.lineage_state === "not_projected" ? <li>No current Proposal is bound to it.</li> : null}
              {claim.evidence_count && affectedCount && standingView.lineage_state !== "not_projected" ? <li>Every projected relation for this Claim is shown above.</li> : null}
            </ul>
          </section>

          {/* The projection retains conditions as a list, and each one is a
              separate limit on the Claim. Joined into a paragraph they read as
              one qualification with several clauses. */}
          <section><h2 className="mb-3 text-subtitle">Scope and conditions</h2>
            {claim.conditions.length ? (
              <ul className="max-w-3xl list-disc space-y-1 pl-5 text-body leading-6 text-muted-foreground">
                {claim.conditions.map((condition) => <li key={condition}>{resultConditionPresentation(condition)}</li>)}
              </ul>
            ) : (
              <p className="max-w-3xl text-body leading-6 text-muted-foreground">No additional conditions are projected for this record. Inspect the exact source for complete caveats.</p>
            )}
          </section>
          <Item variant="outline" className="items-start"><ItemMedia variant="icon"><HugeiconsIcon icon={FileCheck2} aria-hidden /></ItemMedia><ItemContent><ItemTitle>Reproduce the source snapshot</ItemTitle><ItemDescription>Replay establishes the exact record and checks. It does not add scientific authority.</ItemDescription></ItemContent><ItemActions className="basis-full justify-end sm:basis-auto"><Button nativeButton={false} variant="outline" render={<Link href={`/repositories/${repository.slug}/reproduce`} />}>Reproduce <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button></ItemActions></Item>
          {repository.graph ? <Button nativeButton={false} variant="outline" render={<Link href={`/graph?repository=${repository.slug}&lens=research&node=${encodeURIComponent(claim.id)}`} />}>Inspect graph neighborhood <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button> : null}
          {/* A citation that names a record, not a truth.
            *
            * The page carried nothing to take away: a reader who wanted to
            * refer to this Result elsewhere had to assemble an address, an id
            * and a root by hand from three separate controls. The record root
            * is what makes the reference exact — it identifies these bytes,
            * not whatever this Claim later becomes — so it is the part the
            * citation is built around.
            *
            * It states the Repository that accepted it, because Standing is
            * Repository-local and a citation that omits whose Standing it is
            * would assert more than the record does. */}
          <Disclosure className="rounded-lg border px-3 py-2" summary="Cite this Result" summaryClassName="text-compact font-medium">
            <p className="mt-2 text-meta text-muted-foreground">Identifies these exact bytes. A correction or supersession produces a different record.</p>
            <div className="mt-2 flex items-start gap-2">
              <p className="min-w-0 flex-1 break-all font-mono text-micro leading-5">{citation}</p>
              <CopyButton compact value={citation} label="Copy citation" />
            </div>
          </Disclosure>
        </div>

        <aside aria-labelledby="claim-facts-heading">
          <h2 id="claim-facts-heading" className="mb-3 text-subtitle">This record</h2>
          <RecordFacts
            /* The values that are also ledger parameters are links to the
               ledger filtered by them. Reading that a Claim is `theoretical`
               used to be the end of the thought; the other 2,738 were a manual
               filter rebuild away. `Kind` said "Claim" on a Claim page, under a
               heading that already said "Theoretical Claim" — a row that
               repeated the two things above it — so it names the assertion kind,
               which is the part a reader can act on. */
            facts={[
              {
                label: "Assertion kind",
                value: claim.assertion_type
                  ? <FacetLink base={ledger} param="kind" value={claim.assertion_type} />
                  : "not recorded",
                absent: !claim.assertion_type,
              },
              { label: "Standing", value: <FacetLink base={ledger} param="standing" value={standingView.standing} /> },
              {
                label: "Source type",
                value: claim.source_type
                  ? <FacetLink base={ledger} param="source" value={claim.source_type} />
                  : "not recorded",
                absent: !claim.source_type,
              },
              { label: "Source", value: claim.source_title ?? "not recorded", absent: !claim.source_title },
              { label: "Recorded", value: formatDate(claim.created), absent: !claim.created },
              {
                label: "Evidence",
                value: claim.evidence_count ? `${claim.evidence_count} retained ${claim.evidence_count === 1 ? "span" : "spans"}` : "no retained span",
                absent: !claim.evidence_count,
              },
            ]}
          />
          {/* The file this record is, at the commit the release pins. A page
              that prints a content address and never the file it addresses
              asks a reader to take the address on faith. */}
          <SourceFile
            className="mt-4"
            remote={repository.source.remote}
            commit={repository.source.commit}
            path={claim.source_path}
          />
        </aside>
      </div>

      {/* The bytes before the identity, because the identity is a digest OF the
          bytes and a reader who sees the address first has nothing to check it
          against. */}
      <CanonicalBytes className="mt-10 rounded-lg border" record={claim.record} root={claim.root} />

      <Collapsible className="mt-4 rounded-lg border">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-compact font-medium">Exact record identity <span className="text-meta text-muted-foreground">{4 + (claim.root ? 1 : 0) + stateRoots.length} values</span></CollapsibleTrigger>
        <CollapsibleContent className="border-t p-4"><dl className="grid gap-4 sm:grid-cols-2"><RootFact label="Claim ID" value={claim.id} />{claim.root ? <RootFact label="Claim root" value={claim.root} /> : null}<RootFact label="Repository" value={repository.status.repository.id} /><RootFact label="Source commit" value={repository.source.commit} /><RootFact label="Tree" value={repository.source.tree} />{stateRoots.map((root) => <RootFact key={root.label} label={root.label} value={root.value} />)}</dl></CollapsibleContent>
      </Collapsible>
    </PageShell>
  );
}

function Lineage({ repository, lineage }: { repository: string; lineage: ClaimStandingLineage }) {
  return <Collapsible className="rounded-lg border">
    <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-compact font-medium"><span className="min-w-0 truncate">Proposal <RecordPreview id={lineage.proposal.id}>{lineage.proposal.id}</RecordPreview></span><StatusBadge axis="proposal" state={lineage.proposal.status}>{lineage.proposal.status.replaceAll("_", " ")}</StatusBadge></CollapsibleTrigger>
    <CollapsibleContent className="border-t p-3">
      <ItemGroup className="divide-y">
        <Item className="items-start rounded-none px-0 py-3"><ItemContent><ItemTitle>Submission</ItemTitle>{lineage.submission ? <><ItemDescription>Authenticated producer evidence. A Submission neither verifies nor accepts the Claim.</ItemDescription>{lineage.submission.id ? <ExactValue value={lineage.submission.id} label="Submission ID" /> : <p className="mt-2 text-meta text-muted-foreground">Submission ID is not projected.</p>}{lineage.submission.root ? <ExactValue value={lineage.submission.root} label="Submission root" /> : <p className="mt-2 text-meta text-muted-foreground">Submission root is not projected.</p>}</> : <ItemDescription>No exact current Submission is retained for this Proposal. Historical producer lineage is not inferred.</ItemDescription>}</ItemContent></Item>
        {lineage.verifications.length ? lineage.verifications.map((verification) => <Item key={verification.id} className="items-start rounded-none px-0 py-3"><ItemContent>
          {/* Property first, then outcome. A record answers a named question,
              and the answer is only meaningful once the reader knows which
              one — two records on this Proposal can disagree and both be
              right. */}
          <div className="flex flex-wrap items-center gap-2">
            <ItemTitle>{verification.property ?? "Verification Record"}</ItemTitle>
            <StatusBadge state={verification.outcome}>{verification.outcome}</StatusBadge>
          </div>
          <ItemDescription>Scoped evidence. Its outcome does not decide Standing.</ItemDescription>
          <div className="mt-2"><ReviewProvenance record={{
            verifier_actor: verification.verifier,
            verifier_profile: verification.verifier_profile,
            reviewer_kind: verification.reviewer_kind,
            reviewer_display_name: verification.reviewer_display_name,
            reviewer_identifier: verification.reviewer_identifier,
            reviewer_provider: verification.reviewer_provider,
            reviewer_version: verification.reviewer_version,
            review_method_root: verification.review_method_root,
          }} /></div>
          {/* What the verifier refused to claim. It has always been retained
              and was rendered only on the Proposal, so a reader arriving at a
              Claim saw a green check and never saw what it declined to cover. */}
          {verification.does_not_establish.length ? (
            <div className="mt-2">
              <p className="text-eyebrow text-muted-foreground">Does not establish</p>
              <ul className="mt-1 max-w-3xl list-disc space-y-0.5 pl-5 text-compact text-muted-foreground">
                {verification.does_not_establish.map((limit) => <li key={limit}>{limit}</li>)}
              </ul>
            </div>
          ) : null}
          <ExactValue value={verification.id} label="Verification Record ID" />
          <ExactValue value={verification.root} label="Verification Record root" />
        </ItemContent></Item>) : <Item className="items-start rounded-none px-0 py-3"><ItemContent><ItemTitle>Verification Record</ItemTitle><ItemDescription>No exact Verification Record is retained for this Proposal.</ItemDescription></ItemContent></Item>}
        <Item className="items-start rounded-none px-0 py-3"><ItemContent><div className="flex flex-wrap items-center gap-2"><ItemTitle>Proposal</ItemTitle><StatusBadge axis="proposal" state={lineage.proposal.status}>{lineage.proposal.status.replaceAll("_", " ")}</StatusBadge></div><ItemDescription>The requested change to Standing, and the Claim root it binds.</ItemDescription><ExactValue value={lineage.proposal.id} label="Proposal ID" />{lineage.proposal.claim_root ? <ExactValue value={lineage.proposal.claim_root} label="Claim root bound by Proposal" /> : <p className="mt-2 text-meta text-muted-foreground">The exact bound Claim root is not projected for this historical Proposal.</p>}</ItemContent><ItemActions className="basis-full justify-end sm:basis-auto"><Button nativeButton={false} variant="ghost" size="sm" render={<Link href={`/repositories/${repository}/proposals/${encodeURIComponent(lineage.proposal.id)}`} />}>Proposal record <HugeiconsIcon icon={ArrowRight} aria-hidden data-icon="inline-end" /></Button></ItemActions></Item>
        <Item className="items-start rounded-none px-0 py-3"><ItemContent><ItemTitle>Decision</ItemTitle>{lineage.decision ? <><ItemDescription>{lineage.decision.reason ?? "A Decision is retained, but its historical reason is not projected."}</ItemDescription>{lineage.decision.event_id ? <ExactValue value={lineage.decision.event_id} label="Decision event" /> : <p className="mt-2 text-meta text-muted-foreground">Decision event ID is not projected.</p>}{lineage.decision.plan_root ? <ExactValue value={lineage.decision.plan_root} label="Decision plan root" /> : null}</> : <ItemDescription>No Decision is retained. Every check can pass while Standing stays unassessed.</ItemDescription>}</ItemContent></Item>
      </ItemGroup>
    </CollapsibleContent>
  </Collapsible>;
}
