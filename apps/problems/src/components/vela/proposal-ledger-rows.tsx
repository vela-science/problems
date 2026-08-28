import Link from "next/link";
import { Item, ItemContent, ItemGroup } from "@vela/ui/components/item";
import { ScientificText } from "@vela/ui/vela/scientific-text";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { RecordId } from "@/components/vela/record-id";
import { RelativeTime } from "@/components/vela/relative-time";

export type ProposalEntry = {
  repository: string;
  repositoryName: string;
  proposalId: string;
  status: string;
  kind: string;
  claim: string;
  recordedAt: string | null;
  actor: string | null;
  reason: string | null;
  contentRoot: string | null;
  receiptRoot: string | null;
  decisionEventId: string | null;
  decisionProvenance: string;
};

/* Rows, not an accordion.
 *
 * `AccordionTrigger` renders inside shadcn's `<h3>`, so the release Proposal
 * roll-up turned each of its nineteen rows into a heading whose text was the
 * entire row — one of them 400 characters long, beginning "accepted Kernel-
 * verified Lean theorems claim.add At Formal Conjectures PR #4578 commit
 * a3b9c2f…". The document outline was nineteen paragraphs, so no screen-reader
 * user could skim the page at all, and a sighted reader got a click between
 * them and every Decision reason while `/decisions` printed the same reasons
 * open.
 *
 * The detail was never the problem — the Proposal record page already renders
 * it well and is one click away. What a roll-up owes a reader is the ability to
 * scan nineteen of them, so this uses an Item on hairlines, the assertion as
 * the row's own text, and the state as a badge that names its axis. */
export function ProposalLedgerRows({ entries }: { entries: ProposalEntry[] }) {
  return (
    <ItemGroup className="gap-1">
      {entries.map((entry) => (
        <Item
          key={`${entry.repository}:${entry.proposalId}`}
          className="items-start rounded-lg px-3 py-3.5 transition-colors duration-200 hover:bg-muted/40"
        >
          <ItemContent className="min-w-0 gap-1.5">
            <div className="flex min-w-0 items-baseline justify-between gap-3">
            <p className="min-w-0 break-words text-body">
              <Link
                href={`/repositories/${entry.repository}/proposals/${encodeURIComponent(entry.proposalId)}`}
                className="hover:underline"
              >
                <ScientificText text={entry.claim || entry.proposalId} />
              </Link>
            </p>
              <RelativeTime value={entry.recordedAt} className="shrink-0 text-micro text-muted-foreground" />
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-micro text-muted-foreground">
              <StatusBadge axis="proposal" state={entry.status}>
                {entry.status.replaceAll("_", " ")}
              </StatusBadge>
              <span>{entry.repositoryName}</span>
              <span aria-hidden className="text-muted-foreground">·</span>
              <span className="font-mono">{entry.kind}</span>
              <span aria-hidden className="text-muted-foreground">·</span>
              <RecordId value={entry.proposalId} prefix={14} copy={false} />
            </div>

            {/* The Decision reason, open. It is the only field that
                distinguishes one settled Proposal from another, and it was the
                one thing the accordion hid. */}
            {entry.reason ? (
              <p className="max-w-[85ch] text-compact text-muted-foreground">{entry.reason}</p>
            ) : null}
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  );
}
