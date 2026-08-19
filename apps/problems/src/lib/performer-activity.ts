import "server-only";

import { unstable_cache } from "next/cache";
import { reviewVerification } from "@vela/projection-data";
import { problemLabel, resolveProblemStatement, statementParagraphs } from "@/lib/problem-statement";
import {
  discoveredProblems,
  reviewedProblemSourceCoverage,
  scientificProblemState,
  type ProblemDiscovery,
  type ScientificProblemState,
} from "@/lib/scientific-state";

export type PublicPerformerKind = "human" | "agent" | "organization" | "unknown";
export type PublicPerformerActivity = {
  id: string;
  role: "Result performer" | "Decision performer" | "Advisory check";
  performerId: string;
  performerKind: PublicPerformerKind;
  performerDisplayName: string | null;
  occurredAt: string | null;
  problemHref: string;
  problemLabel: string;
  collectionLabel: string;
  objectHref: string;
  objectLabel: string;
  state: string;
  limitation: string | null;
};

function checkKind(kind: string | null | undefined): PublicPerformerKind {
  if (kind === "human") return "human";
  if (kind === "organization") return "organization";
  if (kind === "agent" || kind === "ai_model" || kind === "deterministic_tool") return "agent";
  return "unknown";
}

/**
 * Projects retained performer facts into public activity rows. This is kept
 * pure so provenance roles can be tested without a database or a browser.
 * Nothing here joins an account to a performer; that requires the separate,
 * verified profile link held by activity-data.
 */
export function publicPerformerActivityForProblem(
  discovery: ProblemDiscovery,
  state: NonNullable<ScientificProblemState>,
): PublicPerformerActivity[] {
  const statement = resolveProblemStatement(state);
  const question = statementParagraphs(statement).question || problemLabel(state);
  const problemHref = discovery.canonicalPath!;
  const collectionLabel = discovery.collection?.name ?? state.source.title;
  return state.reviews.flatMap((review) => {
    const claim = state.claims.find((candidate) => candidate.id === review.target);
    const objectLabel = claim?.assertion ?? "Result statement not retained";
    const objectHref = `/repositories/${state.repositorySlug}/proposals/${encodeURIComponent(review.proposal_id)}`;
    const result: PublicPerformerActivity[] = [];
    if (review.producer_package?.producer_actor) result.push({
      id: `${review.proposal_id}:producer`,
      role: "Result performer",
      performerId: review.producer_package.producer_actor,
      /* Submission v3 requires an agent-class producer identity. This is an
         exact schema fact, not a guess from the identifier. */
      performerKind: "agent",
      performerDisplayName: null,
      occurredAt: review.producer_package.submitted_at ?? review.created_at,
      problemHref,
      problemLabel: question,
      collectionLabel,
      objectHref,
      objectLabel,
      state: review.status,
      limitation: review.producer_package.caveats[0] ?? null,
    });
    if (review.reviewed_by) result.push({
      id: `${review.proposal_id}:decision`,
      role: "Decision performer",
      performerId: review.reviewed_by,
      performerKind: checkKind(review.decision_actor_class),
      performerDisplayName: null,
      occurredAt: review.reviewed_at,
      problemHref,
      problemLabel: question,
      collectionLabel,
      objectHref,
      objectLabel,
      state: review.status,
      limitation: review.decision_reason ?? null,
    });
    for (const check of review.verification_records ?? []) result.push({
      id: `${review.proposal_id}:check:${check.verification_record_id}`,
      role: "Advisory check",
      performerId: check.verifier_actor,
      performerKind: checkKind(check.reviewer_kind),
      performerDisplayName: check.reviewer_display_name ?? null,
      occurredAt: check.completed_at,
      problemHref,
      problemLabel: question,
      collectionLabel,
      objectHref,
      objectLabel: check.property ?? objectLabel,
      state: reviewVerification({ verification_records: [check] }),
      limitation: check.does_not_establish?.[0] ?? null,
    });
    return result;
  });
}

async function allPublicPerformerActivityUncached(): Promise<PublicPerformerActivity[]> {
  const [catalog, coverage] = await Promise.all([discoveredProblems(), reviewedProblemSourceCoverage()]);
  const routes = new Set(coverage.problems.map(({ route }) => route));
  const reviewed = catalog.filter(({ canonicalPath }) => canonicalPath && routes.has(canonicalPath));
  const states = (await Promise.all(reviewed.map(async (discovery) => ({
    discovery,
    state: await scientificProblemState(discovery.repository, discovery.problem, discovery.releaseRoot),
  })))).filter((entry) => entry.state !== null);

  return states.flatMap(({ discovery, state }) => (
    publicPerformerActivityForProblem(discovery, state!)
  )).sort((left, right) => (right.occurredAt ?? "").localeCompare(left.occurredAt ?? "") || left.id.localeCompare(right.id));
}

export const allPublicPerformerActivity = unstable_cache(
  allPublicPerformerActivityUncached,
  ["problems-public-performer-activity-v1"],
  { revalidate: 3_600 },
);

export async function performerActivity(performerIds: readonly string[]) {
  const identities = new Set(performerIds);
  return (await allPublicPerformerActivity()).filter((entry) => identities.has(entry.performerId));
}
