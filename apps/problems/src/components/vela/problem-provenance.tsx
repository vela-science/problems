import type { ScientificProblemState } from "@/lib/scientific-state";

type State = NonNullable<ScientificProblemState>;
type Review = State["reviews"][number];

export function currentReview(state: State): Review | null {
  const claims = state.claims ?? [];
  const reviews = state.reviews ?? [];
  const current = claims.find((claim) => claim.id === state.currentClaimId);
  if (!current) return null;
  return reviews.find((review) => review.status === "accepted" && review.claim === current.assertion) ?? null;
}
