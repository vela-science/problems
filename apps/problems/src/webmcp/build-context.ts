import "server-only";

import {
  buildClaimStandingView,
  compositeSearchRoot,
  formalConjecturesCollectionRoot,
  type ClaimSummary,
  type ReviewSummary,
} from "@vela/projection-data";
import { scientificAnchorRoot, type ScientificAnchor } from "@vela/activity-data";
import type { ScientificProblemState } from "@/lib/scientific-state";
import { problemLabel, resolveProblemStatement, statementParagraphs, statementPlainText } from "@/lib/problem-statement";
import type {
  WebMcpClaim,
  WebMcpLineage,
  WebMcpProblemContext,
  WebMcpSourceOccurrence,
} from "./context";

/* Correction edges live on the retained Claim record rather than on a column,
   which is why `problem-history.tsx` reads them the same way. Two surfaces
   agreeing on one shape is fine; a third reading would not be. */
function correctionRelations(claim: ClaimSummary): Array<{ kind: string; target_claim_id: string }> {
  const record = claim.record && typeof claim.record === "object"
    ? claim.record as { relations?: unknown }
    : null;
  if (!Array.isArray(record?.relations)) return [];
  return record.relations.filter((relation): relation is { kind: string; target_claim_id: string } => (
    relation !== null
    && typeof relation === "object"
    && ["corrects", "supersedes"].includes(String((relation as { kind?: unknown }).kind))
    && typeof (relation as { target_claim_id?: unknown }).target_claim_id === "string"
  )).map(({ kind, target_claim_id }) => ({ kind, target_claim_id }));
}

function lineages(claim: ClaimSummary, reviews: ReviewSummary[]): WebMcpLineage[] {
  const view = buildClaimStandingView(claim, reviews);
  return view.lineages.map((lineage) => ({
    submission_id: lineage.submission?.id ?? null,
    proposal_id: lineage.proposal.id,
    proposal_status: lineage.proposal.status,
    /* Kept as a list, never reduced to one outcome. Checks answer different
       questions and do not combine into a verdict — collapsing them here would
       hand the model a score the product deliberately refuses to compute. */
    verifications: lineage.verifications.map((verification) => ({
      id: verification.id,
      outcome: verification.outcome,
      property: verification.property,
      does_not_establish: verification.does_not_establish,
      verifier: verification.verifier,
      completed_at: verification.completed_at,
    })),
    decision: lineage.decision
      ? {
          provenance: lineage.decision.provenance,
          decided_by: lineage.decision.decided_by,
          performer_class: lineage.decision.performer_class,
          decided_at: lineage.decision.decided_at,
          reason: lineage.decision.reason,
          event_id: lineage.decision.event_id,
          applied_event_id: lineage.decision.applied_event_id,
        }
      : null,
  }));
}

/**
 * Projects the exact Problem state into the smaller shape a browser agent
 * reads. Server-side, because everything it reads is server-side, and because
 * a client that could assemble this could also assemble something else.
 */
export function buildWebMcpProblemContext(
  state: NonNullable<ScientificProblemState>,
  route: string,
  collectionName: string,
): WebMcpProblemContext {
  const statement = resolveProblemStatement(state);
  const question = statementParagraphs(statement).question || problemLabel(state);
  const claims: WebMcpClaim[] = state.claims.map((claim) => ({
    id: claim.id,
    root: claim.root ?? null,
    standing: claim.standing,
    assertion: claim.assertion,
    assertion_type: claim.assertion_type,
    conditions: claim.conditions,
    evidence_count: claim.evidence_count,
    contested: claim.contested,
    retracted: claim.retracted,
    is_current: claim.id === state.currentClaimId,
    lineages: lineages(claim, state.reviews),
    corrections: correctionRelations(claim),
  }));
  const sources: WebMcpSourceOccurrence[] = (state.sources.occurrences ?? []).map((occurrence) => ({
    source_id: occurrence.source_id,
    native_id: occurrence.native_id,
    native_kind: occurrence.native_kind,
    role: occurrence.source_role,
    locator: state.locator,
  }));

  return {
    schema: "vela.webmcp-problem-context.v1",
    route,
    repository: state.repositorySlug,
    problem: state.problem.problem,
    collection: collectionName,
    label: problemLabel(state),
    question: statementPlainText(question),
    statement_kind: state.problem.statement_kind,
    declared_status: state.problem.declared_status,
    formalized: state.problem.formalized,
    tags: state.problem.tags,
    release_root: state.anchor.projectionReleaseRoot,
    anchor_root: scientificAnchorRoot(state.anchor as ScientificAnchor),
    problem_record_root: state.anchor.problemRecordRoot,
    repository_root: state.anchor.repositoryRoot,
    source_commit: state.anchor.sourceCommit,
    current_claim_id: state.currentClaimId,
    claims,
    sources,
    search: {
      search_root: compositeSearchRoot(state.anchor.projectionReleaseRoot),
      collection_root: formalConjecturesCollectionRoot,
    },
  };
}
