import "server-only";

import {
  problemFrontier,
  problemFrontierTimeline,
  type FrontierBasis as ProjectionFrontierBasis,
  type FrontierEdgeRecord,
  type ProblemFrontierGap,
  type ProblemFrontierTState,
} from "@vela/projection-data/read-contracts";
import type {
  FrontierBasis,
  FrontierEvidenceStep,
  FrontierState,
  FrontierTimelineData,
} from "@/components/vela/frontier-timeline";

/* Maps the frontier reader's output onto the presentational timeline. The
 * mapping restates retained edges in first-layer words; it derives nothing the
 * projection did not already state, and each chip label is the fixed
 * translation of one projection basis class. */

/** The five first-layer chip labels, one per projection basis class. */
export const frontierBasisLabels: Record<ProjectionFrontierBasis, FrontierBasis> = {
  source_asserted: "source-asserted",
  mechanically_verified: "checked",
  authority_decided: "repository decision",
  exact_derivation: "exact derivation",
  heuristic_advisory: "advisory",
};

function humanizeProperty(value: string | null | undefined): string | null {
  return value ? value.replaceAll("_", " ") : null;
}

function stringField(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export type FrontierClaimRef = { id: string; assertion: string };

export function mapFrontierTimeline({ states, edges, gaps, claims, claimHref }: {
  states: ProblemFrontierTState[];
  edges: FrontierEdgeRecord[];
  gaps: ProblemFrontierGap[];
  claims: FrontierClaimRef[];
  claimHref?: (claimId: string) => string | null;
}): FrontierTimelineData | null {
  /* No verified movement means the section does not exist for this Problem —
     the page renders exactly as it did before the frontier projection. */
  if (!states.length) return null;

  const claimById = new Map(claims.map((claim) => [claim.id, claim]));
  const proposalByClaim = new Map(edges
    .filter((edge) => edge.relation === "proposed_by")
    .map((edge) => [edge.source_ref, edge.target_ref]));
  const decisionByClaim = new Map(edges
    .filter((edge) => edge.relation === "decided_by")
    .map((edge) => [edge.target_ref, edge]));
  const checksByProposal = new Map<string, FrontierEdgeRecord[]>();
  for (const edge of edges.filter(({ relation }) => relation === "verified_by")) {
    const proposalId = stringField(edge.basis_ref, "proposal_id");
    if (!proposalId) continue;
    checksByProposal.set(proposalId, [...(checksByProposal.get(proposalId) ?? []), edge]);
  }
  const deltaRootByCommit = new Map(edges
    .filter((edge) => edge.relation === "state_change")
    .map((edge) => [edge.source_ref, stringField(edge.basis_ref, "semantic_delta_root")]));

  const resultRef = (claimId: string) => ({
    /* The retained assertion where the release carries the Claim; the removed
       side of an old correction may no longer be in current state, and then
       the identifier is the only true title available. */
    title: claimById.get(claimId)?.assertion ?? claimId,
    href: claimHref?.(claimId) ?? null,
  });

  const mapped = states.map((state): FrontierState => {
    const moved = [...state.accepted_added, ...state.accepted_removed];
    const standing = state.accepted_added.length && state.accepted_removed.length
      ? "Result corrected"
      : state.accepted_added.length
        ? "Result accepted"
        : "Result removed";

    const evidence: FrontierEvidenceStep[] = [];
    const checks = state.accepted_added.flatMap((claimId) => {
      const proposalId = proposalByClaim.get(claimId);
      return proposalId ? checksByProposal.get(proposalId) ?? [] : [];
    });
    if (checks.length) {
      evidence.push({
        stage: "submission",
        label: "Submission received",
        basis: frontierBasisLabels.source_asserted,
      });
      for (const check of checks) {
        const outcome = stringField(check.basis_ref, "outcome");
        evidence.push({
          stage: "check",
          label: outcome === "pass" ? "Check passed" : outcome ? `Check ${outcome}` : "Check recorded",
          basis: frontierBasisLabels.mechanically_verified,
          detail: humanizeProperty(stringField(check.basis_ref, "property")),
        });
      }
    }
    const decision = moved.map((claimId) => decisionByClaim.get(claimId)).find(Boolean) ?? null;
    if (decision) {
      evidence.push({
        stage: "repository decision",
        label: "Decision applied",
        basis: frontierBasisLabels.authority_decided,
        detail: stringField(decision.basis_ref, "reviewed_by"),
      });
    }
    evidence.push({
      stage: "result standing",
      label: standing,
      basis: frontierBasisLabels.exact_derivation,
    });

    const eventIds = [...new Set(moved.flatMap((claimId) => {
      const decided = decisionByClaim.get(claimId);
      if (!decided) return [];
      return [
        stringField(decided.basis_ref, "decision_event_id"),
        stringField(decided.basis_ref, "applied_event_id"),
      ].filter((value): value is string => value !== null);
    }))];

    return {
      id: state.commit_sha,
      label: standing,
      at: state.committed_at,
      accepted: state.accepted_added.map(resultRef),
      removed: state.accepted_removed.map(resultRef),
      evidence,
      anchors: {
        repository_root_before: state.repository_root_before,
        repository_root_after: state.repository_root_after,
        semantic_delta_root: deltaRootByCommit.get(state.commit_sha) ?? null,
        ...(eventIds.length ? { event_ids: eventIds } : {}),
      },
    };
  });

  return {
    states: mapped,
    gaps: gaps.map((gap) => {
      if (gap.kind === "unresolved_equivalence") {
        return {
          id: `${gap.kind}:${gap.occurrence_ref}`,
          sentence: `${gap.occurrence_ref} is grouped by the reviewed resolver; semantic equivalence not established.`,
          basis: frontierBasisLabels.heuristic_advisory,
        };
      }
      if (gap.kind === "verification_nonclaim") {
        return {
          id: `${gap.kind}:${gap.verification_ref}`,
          sentence: `A check on ${gap.verification_ref} does not establish: ${gap.nonclaims.join("; ")}.`,
          basis: frontierBasisLabels.mechanically_verified,
        };
      }
      return {
        id: `${gap.kind}:${gap.occurrence_ref}`,
        sentence: `${gap.occurrence_ref} has no accepted Result.`,
        basis: frontierBasisLabels.heuristic_advisory,
      };
    }),
  };
}

/** What the fetch wrapper needs from the assembled Problem state. */
export type FrontierMovementSource = {
  repositorySlug: string;
  claims: Array<{ id: string; assertion: string }>;
  sources: { entity: { entity_id: string } | null };
  anchor: { projectionReleaseRoot: string };
};

/**
 * The frontier movement for one Problem, or undefined. Undefined is the
 * truthful degraded state: no reviewed entity, no verified state-change edge,
 * or a reader refusal all mean the History page renders exactly what it
 * rendered before this projection existed, rather than an apology section.
 */
export async function problemFrontierMovement(
  state: FrontierMovementSource,
): Promise<FrontierTimelineData | undefined> {
  const entityId = state.sources.entity?.entity_id ?? null;
  if (!entityId) return undefined;
  try {
    const root = state.anchor.projectionReleaseRoot;
    const timeline = await problemFrontierTimeline({ root, problemEntityId: entityId });
    if (!timeline.t_states.length) return undefined;
    const frontier = await problemFrontier({ root, problemEntityId: entityId, limit: 500 });
    return mapFrontierTimeline({
      states: timeline.t_states,
      edges: Object.values(frontier.edges_by_basis).flat(),
      gaps: frontier.gaps,
      claims: state.claims,
      claimHref: (claimId) => `/repositories/${state.repositorySlug}/claims/${claimId}`,
    }) ?? undefined;
  } catch {
    /* A failed read must not take the History page down with it; the section
       simply does not exist on this render. */
    return undefined;
  }
}
