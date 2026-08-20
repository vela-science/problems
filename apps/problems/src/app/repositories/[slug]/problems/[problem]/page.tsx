import { PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight01Icon as ArrowRight } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { nativeSourceRecordByIdentity, repositoryBySlug, problemDetail } from "@vela/projection-data";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { Button } from "@vela/ui/components/button";
import { canonicalProblemPath } from "@vela/projection-data";
import { publicProblemPath } from "@/lib/problem-routes";
import { ProblemSourceFacts } from "@/components/vela/problem-source-facts";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@vela/ui/components/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@vela/ui/components/item";
import { RecordHeader } from "@/components/vela/record-header";
import { decodeHtmlEntities } from "@vela/ui/lib/html-entities";
export const dynamicParams = true;
export const dynamic = "force-static";
export const revalidate = false;
export function generateStaticParams() {
  return [];
}
export async function generateMetadata({
  params,
}: PageProps<"/repositories/[slug]/problems/[problem]">): Promise<Metadata> {
  const { slug, problem } = await params;
  const repository = await repositoryBySlug(slug);
  return repository
    ? {
        title: `${repository.status.repository.name}: problem ${problem}`,
        description: `Exact rooted records for problem ${problem} in the ${repository.status.repository.name} repository.`,
        /* The Problem's address, not this view's own.
         *
         * This declared itself canonical while the sitemap had stopped
         * publishing it, which left exactly the duplicate-indexing situation
         * dropping it was meant to fix: two URLs for one record, each claiming
         * to be the one. This page is the advanced record view of a Problem
         * that lives at the canonical address, so it points there. */
        alternates: { canonical: canonicalProblemPath(slug, problem) ?? `/repositories/${slug}/problems/${problem}` },
      }
    : {};
}
export default async function ProblemPage({
  params,
}: PageProps<"/repositories/[slug]/problems/[problem]">) {
  const { slug, problem } = await params;
  /* An identifier shape, not `^\d+$`. Erdős numbers a problem; the ledger's own
     ordinal expression guards `~ '^[0-9]+$'` precisely because a source may
     not, and a digits-only route guard would 404 every such problem before the
     projection was ever asked. This only keeps unbounded junk out of the
     on-demand render cache — `problemDetail` returning nothing is what decides
     the page does not exist. */
  if (!/^[\w.:-]{1,64}$/u.test(problem)) notFound();
  const detail = await problemDetail(slug, problem);
  if (!detail) notFound();
  const record = detail.record;
  /* Problems deliberately have no Repository-object binding until a Claim is
     admitted. Their occurrence identity is already exact in the source-native
     ledger, so provenance reads that identity directly instead of asking for
     a removed `problem` binding or a graph node that does not exist. */
  const source = await nativeSourceRecordByIdentity({
    sourceId: record.source_id,
    nativeId: record.node_id,
    nativeKind: record.native_kind,
  });
  if (!source) throw new Error(`Problem ${slug}/${problem} is missing its exact source-native occurrence`);
  const locator = source.locators.find((entry) => entry.url)?.url ?? null;
  const ledger = (name: string, value: string) =>
    `/repositories/${slug}/problems?${new URLSearchParams({ [name]: value })}`;
  return (
    <PageShell archetype="default" layout="reading">
      {/* The kind and the identifier are the eyebrow; the statement is the
          record and so it is the largest text. The heading used to be the
          builder's label, `Erdős problem 1`, which is the word for the type
          printed above the statement it names. That is the Record archetype, so
          this route stopped hand-drawing it and takes the shared header. */}
      <RecordHeader
        kind="Problem"
        title={record.statement
          ? <ScientificText text={decodeHtmlEntities(record.statement)} />
          : `Problem ${problem}`}
        state={<>
          <span className="font-mono text-micro tabular-nums text-muted-foreground">{record.node_id}</span>
        </>}
        actions={<>
          <Button
            nativeButton={false}
            variant="outline"
            render={
              <Link
                href={publicProblemPath(slug, problem) ?? `/repositories/${slug}/problems`}
              />
            }
          >
            Open Current State{" "}
            <HugeiconsIcon
              icon={ArrowRight}
              aria-hidden
              data-icon="inline-end"
            />
          </Button>
        </>}
      />
      <ProblemSourceFacts record={record} locator={locator} ledgerHref={ledger} className="mb-8 mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-meta text-muted-foreground" />
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-subtitle">Matching claims</h2>
          <span className="font-mono text-meta text-muted-foreground">
            {detail.claims.length}
          </span>
        </div>
        {detail.claims.length ? (
          <ItemGroup className="divide-y">
            {detail.claims.map((claim) => {
              /* `claim.has_proposal` is the existence of a Proposal targeting this
                 Claim, including a pending one. It was drawn here as "reviewed
                 record" in the tone reserved for accepted standing, which read
                 a submission as an acceptance. Standing is its own badge, the
                 Proposal fact is its own badge, and the source's flags are
                 neither, as the Claim record page already has them. */
              const standing = claim.standing;
              return (
                <Item
                  key={claim.id}
                  className="items-start rounded-none px-0 py-4"
                >
                  <ItemContent>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge axis="standing" state={standing}>{standing.replaceAll("_", " ")}</StatusBadge>
                      {claim.has_proposal ? <StatusBadge axis="proposal" state="reviewed">Proposal recorded</StatusBadge> : null}
                      {claim.contested ? <StatusBadge state="contested">contested source flag</StatusBadge> : null}
                      {claim.retracted ? <StatusBadge state="retracted">retracted source flag</StatusBadge> : null}
                      <span className="font-mono text-meta text-muted-foreground">
                        {claim.id}
                      </span>
                    </div>
                    <ItemTitle className="sr-only">{claim.id}</ItemTitle>
                    <ItemDescription className="line-clamp-3 text-foreground">
                      <ScientificText text={decodeHtmlEntities(claim.assertion)} />
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions className="basis-full justify-end sm:basis-auto">
                    <Button
                      nativeButton={false}
                      variant="ghost"
                      size="sm"
                      render={
                        <Link
                          href={`/repositories/${slug}/claims/${claim.id}`}
                        />
                      }
                    >
                      Open{" "}
                      <HugeiconsIcon
                        icon={ArrowRight}
                        aria-hidden
                        data-icon="inline-end"
                      />
                    </Button>
                  </ItemActions>
                </Item>
              );
            })}
          </ItemGroup>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No direct claims</EmptyTitle>
              <EmptyDescription>
                This problem has no directly related claim record.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent><Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/repositories/${slug}/claims`} />}>Browse this Repository’s Claims</Button></EmptyContent>
          </Empty>
        )}
      </section>
    </PageShell>
  );
}
