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

  return <li className="min-w-0">
    <Link
      href={`${href}?view=results`}
      className="vela-object-row group -mx-2 grid min-w-0 gap-3 rounded-lg px-2 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start"
      aria-label={`Open reviewed Result for Erdős problem ${number}`}
    >
      <span
        aria-hidden
        data-check-outcome={outcome ?? "none"}
        className={`mt-0.5 grid size-8 place-items-center rounded-full ${presentation.className}`}
      >
        <HugeiconsIcon icon={presentation.icon} className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-compact font-semibold">Erdős problem {number}</span>
          <Badge variant="outline">Accepted by {state.repositoryName}</Badge>
        </span>
        <span className="mt-1.5 line-clamp-2 block max-w-[78ch] text-compact leading-6 text-foreground">
          <AssertionText text={headline ?? result.assertion} />
        </span>
        {limitation ? <span className="mt-1 line-clamp-2 block text-meta leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">Scope:</span> <AssertionText text={limitation} />
        </span> : null}
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground">
          {producer ? <Performer name={producer} kind="agent" performerId={producer} detail="Result performer" /> : <span>Performer not retained</span>}
          <span>{summarizeCheckOutcomes(checks)}</span>
          {review.reviewed_at ? <time dateTime={review.reviewed_at}>{formatDate(review.reviewed_at)}</time> : null}
        </span>
      </span>
      <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden className="mt-2 hidden size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 sm:block" />
    </Link>
  </li>;
}
