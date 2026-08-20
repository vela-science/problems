import Link from "next/link";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  MinusSignCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@vela/ui/components/item";
import { AssertionText } from "@/components/vela/assertion-text";
import { Performer } from "@/components/vela/actor";
import { compactResultLimitation, dominantCheckOutcome, exactResultHeadline, summarizeCheckOutcomes } from "@/components/vela/problem-overview-reference";
import { currentReview } from "@/components/vela/problem-provenance";
import { formatDate } from "@/lib/format";
import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;

function checkPresentation(outcome: ReturnType<typeof dominantCheckOutcome>) {
  if (outcome === "pass") return { icon: CheckmarkCircle01Icon, className: "bg-status-progress/10 text-status-progress" };
  if (outcome === "fail") return { icon: CancelCircleIcon, className: "bg-destructive/10 text-destructive" };
  if (outcome === "error") return { icon: AlertCircleIcon, className: "bg-status-caution/15 text-status-caution" };
  return { icon: MinusSignCircleIcon, className: "bg-muted text-muted-foreground" };
}

export function HomeResultRow({ state, href, number }: { state: State; href: string; number: string }) {
  const result = state.claims.find((claim) => claim.id === state.currentClaimId) ?? null;
  const review = currentReview(state);
  if (!result || !review) return null;

  const checks = review.verification_records ?? [];
  const outcome = dominantCheckOutcome(checks);
  const presentation = checkPresentation(outcome);
  const producer = review.producer_package?.producer_actor ?? null;
  const headline = exactResultHeadline(result.assertion);
  const limitation = compactResultLimitation(result.assertion);

  /* One stretched link, not a wrapping one. `Performer` is itself a link to
     the submitter, and an anchor inside an anchor is invalid HTML — React
     failed hydration on the home page over exactly this. The row link covers
     the row through `after:inset-0` instead, so the submitter link stays a
     sibling and stays reachable. */
  return <Item className="vela-object-row relative -mx-2 items-start gap-3 rounded-lg px-2 py-4" render={<li />}>
    <ItemMedia
      aria-hidden
      data-check-outcome={outcome ?? "none"}
      className={`mt-0.5 size-8 rounded-full ${presentation.className}`}
    >
      <HugeiconsIcon icon={presentation.icon} className="size-4" />
    </ItemMedia>
    <ItemContent>
      <ItemTitle className="line-clamp-none flex-wrap gap-2">
        <Link
          href={`${href}/results`}
          aria-label={`Open reviewed Result for Erdős problem ${number}`}
          className="text-compact font-semibold after:absolute after:inset-0 group-hover/item:text-primary focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
        >
          Erdős problem {number}
        </Link>
        <Badge variant="outline">Accepted by {state.repositoryName}</Badge>
      </ItemTitle>
      <ItemDescription className="max-w-[78ch] text-compact leading-6 text-foreground">
        <AssertionText text={headline ?? result.assertion} />
      </ItemDescription>
      {limitation ? <ItemDescription className="text-meta leading-5">
        <span className="font-medium text-foreground">Scope:</span> <AssertionText text={limitation} />
      </ItemDescription> : null}
      <ItemDescription className="relative line-clamp-none flex w-fit flex-wrap items-center gap-x-3 gap-y-1 text-meta">
        {producer ? <Performer name={producer} kind="agent" performerId={producer} detail="Submitted by" /> : <span>Submitter not recorded</span>}
        <span>{summarizeCheckOutcomes(checks)}</span>
        {review.reviewed_at ? <time dateTime={review.reviewed_at}>{formatDate(review.reviewed_at)}</time> : null}
      </ItemDescription>
    </ItemContent>
    <ItemActions className="self-start">
      <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="mt-2 hidden size-4 text-muted-foreground transition-transform duration-150 group-hover/item:translate-x-0.5 sm:block" />
    </ItemActions>
  </Item>;
}
