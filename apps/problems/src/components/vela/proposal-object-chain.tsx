import { ExactValue } from "@vela/ui/vela/exact-value";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@vela/ui/components/item";

export interface ProposalObjectRecord {
  proposal_id: string;
  status: string;
  content_root: string | null;
  receipt_root: string | null;
  decision_event_id: string | null;
  decision_plan_root: string | null;
  decision_provenance: string;
  producer_package_kind?: "submission_v1" | "receipt_v1" | "unrecorded";
  producer_package_id?: string | null;
  producer_package_root?: string | null;
}

function packageLabel(review: ProposalObjectRecord): string {
  if (review.producer_package_kind === "submission_v1") return "Published contribution";
  if (review.producer_package_kind === "receipt_v1" || review.receipt_root) {
    return "Historical Receipt";
  }
  return "Producer package";
}

export function ProposalObjectChain({ review }: { review: ProposalObjectRecord }) {
  const packageRoot = review.producer_package_root ?? review.receipt_root;
  return (
    <ItemGroup className="divide-y rounded-lg border">
      <Item className="items-start">
        <ItemContent>
          <ItemTitle>{packageLabel(review)}</ItemTitle>
          <ItemDescription>
            {review.producer_package_kind === "submission_v1"
              ? "Authenticated producer input. It does not check or accept the Assertion."
              : review.receipt_root
                ? "Retained producer package from the historical Receipt era."
                : "No authenticated producer package is retained for this historical Proposal."}
          </ItemDescription>
          {review.producer_package_id ? (
            <ExactValue value={review.producer_package_id} label="Exact Submission ID" />
          ) : null}
          {packageRoot ? <ExactValue value={packageRoot} label={`${packageLabel(review)} root`} /> : null}
        </ItemContent>
      </Item>
      <Item className="items-start">
        <ItemContent>
          <ItemTitle>Proposed change</ItemTitle>
          <ItemDescription>
            Requested scientific-state change. Proposed change status is {review.status.replaceAll("_", " ")}.
          </ItemDescription>
          <ExactValue value={review.proposal_id} label="Exact Proposal ID" />
          {review.content_root ? <ExactValue value={review.content_root} label="Exact Proposal root" /> : null}
        </ItemContent>
      </Item>
      <Item className="items-start">
        <ItemContent>
          <ItemTitle>Decision</ItemTitle>
          <ItemDescription>
            {review.decision_event_id
              ? `Recorded through ${review.decision_provenance.replaceAll("_", " ")}.`
              : "No repository-authority Decision has been recorded."}
          </ItemDescription>
          {review.decision_plan_root ? (
            <ExactValue value={review.decision_plan_root} label="Decision plan root" />
          ) : null}
          {review.decision_event_id ? (
            <ExactValue value={review.decision_event_id} label="Decision event" />
          ) : null}
        </ItemContent>
      </Item>
    </ItemGroup>
  );
}
