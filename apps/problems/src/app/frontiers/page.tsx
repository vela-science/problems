import type { Metadata } from "next";
import { pluralAuthorityReferenceProjection } from "@vela/projection-data";
import { Alert, AlertDescription, AlertTitle } from "@vela/ui/components/alert";
import { Badge } from "@vela/ui/components/badge";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@vela/ui/components/table";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { PageSection, PageShell } from "@vela/ui/vela/page-shell";
import { PageIntro } from "@/components/vela/page-intro";
import { RecordId } from "@/components/vela/record-id";

export const metadata: Metadata = {
  title: "Frontiers",
  description: "Derived, rebuildable discovery queries over attributed Vela Repository state.",
  alternates: { canonical: "/frontiers" },
};

const view = pluralAuthorityReferenceProjection;
const repositoryNames = new Map(view.repositories.map((repository) => [repository.repository_id, repository.name]));

export default function FrontiersPage() {
  return <PageShell archetype="data" className="flex flex-col gap-8">
    <PageIntro
      title="Frontiers"
      description="Rebuildable discovery queries over exact, attributed Repository state. A Frontier is never a Repository and never determines what globally stands."
    />

    <PageSection className="grid gap-8 pt-0">
      <Alert>
        <AlertTitle>Reference demonstration</AlertTitle>
        <AlertDescription>
          The two authority histories below are exact Protocol 1 fixtures replayed from frozen Git bundles. The correction and downstream work are deliberately synthetic until the real consequential-correction packet is available.
        </AlertDescription>
      </Alert>

      <section aria-labelledby="portable-input-heading" className="grid gap-4">
        <div className="border-b pb-3">
          <h2 id="portable-input-heading" className="text-title">One portable Submission</h2>
          <p className="mt-1.5 max-w-3xl text-meta text-muted-foreground">Both Repositories ingest these exact producer bytes and derive the same Claim identity.</p>
        </div>
        <dl className="grid gap-x-8 gap-y-4 text-meta sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Submission</dt><dd className="mt-1"><RecordId value={view.portable_submission.submission_root} label="Submission root" /></dd></div>
          <div><dt className="text-muted-foreground">Producer</dt><dd className="mt-1 font-mono text-micro">{view.portable_submission.producer}</dd></div>
          <div><dt className="text-muted-foreground">Claim</dt><dd className="mt-1"><RecordId value={view.portable_submission.claim_root} label="Claim root" /></dd></div>
          <div><dt className="text-muted-foreground">Assertion</dt><dd className="mt-1">{view.portable_submission.assertion}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="local-outcomes-heading" className="grid gap-4">
        <div className="border-b pb-3">
          <h2 id="local-outcomes-heading" className="text-title">Two local outcomes</h2>
          <p className="mt-1.5 max-w-3xl text-meta text-muted-foreground">A rejected Proposal and an unassessed Claim are different facts. Neither row borrows the other Repository&apos;s Decision or Standing.</p>
        </div>
        <Table aria-label="Repository-local Decisions and Standing">
          <TableHeader>
            <TableRow>
              <TableHead>Repository</TableHead>
              <TableHead>Local Decision</TableHead>
              <TableHead>Local Standing</TableHead>
              <TableHead>Attributed performer</TableHead>
              <TableHead>Exact source root</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.repositories.map((repository) => <TableRow key={repository.repository_id}>
              <TableCell className="min-w-60 whitespace-normal align-top">
                <p className="font-medium">{repository.name}</p>
                <p className="mt-1 font-mono text-micro text-muted-foreground">{repository.repository_id}</p>
                <div className="mt-1"><RecordId value={repository.source.authority_keyset_root} label="Local authority keyset root" /></div>
              </TableCell>
              <TableCell className="align-top"><StatusBadge state={repository.decision.status}>{repository.decision.status}</StatusBadge></TableCell>
              <TableCell className="align-top"><StatusBadge state={repository.local_standing}>{repository.local_standing}</StatusBadge></TableCell>
              <TableCell className="max-w-72 whitespace-normal align-top">
                <p className="font-mono text-micro">{repository.decision.performer}</p>
                <p className="mt-1 break-all font-mono text-[0.68rem] text-muted-foreground">authority: {repository.decision.principal_id}</p>
                <div className="mt-1"><RecordId value={repository.decision.decision_record_root} label="Decision record root" /></div>
                <div className="mt-1"><RecordId value={repository.decision.event_root} label="Decision Event root" /></div>
              </TableCell>
              <TableCell className="align-top">
                <RecordId value={repository.source.repository_root} label="Repository root" />
                <div className="mt-1"><RecordId value={repository.source.replay_projection_root} label="Vela projection root" /></div>
                <div className="mt-1"><RecordId value={repository.source.evidence_root} label="Repository evidence root" /></div>
                <p className="mt-1 text-micro text-muted-foreground">0.977.4 replay verified · {repository.source.git_commit.slice(0, 12)}</p>
              </TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </section>

      <section aria-labelledby="correction-heading" className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
          <div>
            <h2 id="correction-heading" className="text-title">Shared correction, bounded consequences</h2>
            <p className="mt-1.5 max-w-3xl text-meta text-muted-foreground">The correction seam binds the exact shared predecessor, then derives affected work without changing either local outcome.</p>
          </div>
          <Badge variant="outline">synthetic reference fixture</Badge>
        </div>
        <dl className="grid gap-x-8 gap-y-4 text-meta sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Corrected predecessor</dt><dd className="mt-1"><RecordId value={view.correction.shared_predecessor.claim_root} label="Predecessor Claim root" /></dd></div>
          <div><dt className="text-muted-foreground">Synthetic successor</dt><dd className="mt-1"><RecordId value={view.correction.synthetic_successor.claim_root} label="Synthetic successor Claim root" /></dd></div>
          <div><dt className="text-muted-foreground">Affected downstream work</dt><dd className="mt-1 font-mono">{view.correction.affected_work_count}</dd></div>
          <div><dt className="text-muted-foreground">Preserved independent work</dt><dd className="mt-1 font-mono">{view.correction.unaffected_work_count}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="derived-frontiers-heading" className="grid gap-4">
        <div className="border-b pb-3">
          <h2 id="derived-frontiers-heading" className="text-title">Derived Frontiers</h2>
          <p className="mt-1.5 max-w-3xl text-meta text-muted-foreground">Each identity belongs to a query definition. Results are rooted to this registry projection, disposable, and rebuilt when source roots change.</p>
        </div>
        <ItemGroup className="divide-y rounded-lg border bg-card px-4">
          {view.frontiers.map((frontier) => <Item key={frontier.id} className="rounded-none px-0 py-4" size="sm">
            <ItemContent>
              <ItemTitle className="line-clamp-none flex-wrap">{frontier.name} <Badge variant="secondary">{frontier.members.length} open</Badge></ItemTitle>
              <ItemDescription className="line-clamp-none">{frontier.members.map((member) => `${repositoryNames.get(member.repository_id)}: ${member.safe_next_action}`).join(" ")}</ItemDescription>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-micro text-muted-foreground">
                <span className="font-mono">{frontier.id}</span>
                <RecordId value={frontier.result_root} label="Frontier result root" />
                <span>authority effect: none</span>
                <span>persistence: none</span>
              </div>
            </ItemContent>
          </Item>)}
        </ItemGroup>
      </section>

      <p className="border-t pt-4 text-micro text-muted-foreground">
        Registry projection <RecordId value={view.projection_root} label="Registry projection root" />. Discarding or rebuilding it changes no Repository, Decision, Event, or Standing.
      </p>
    </PageSection>
  </PageShell>;
}
