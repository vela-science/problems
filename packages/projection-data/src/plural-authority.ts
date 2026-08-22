import { z } from "zod";
import referenceSource from "../config/plural-authority-reference.v1.json";
import { canonicalJson, sha256, type HashRoot } from "./canonical";

const rootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);
const commitSchema = z.string().regex(/^[0-9a-f]{40}$/u);
const repositoryIdSchema = z.string().uuid();

const decisionSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  performer: z.string().min(1),
  principal_id: z.string().min(1),
  decision_record_root: rootSchema,
  event_root: rootSchema,
}).strict();

const repositorySourceSchema = z.object({
  repository_id: repositoryIdSchema,
  name: z.string().min(1),
  bundle_root: rootSchema,
  git_commit: commitSchema,
  git_tree: commitSchema,
  repository_root: rootSchema,
  replay_projection_root: rootSchema,
  authority_keyset_root: rootSchema,
  authority_policy_root: rootSchema,
  ingested_submission_root: rootSchema,
  derived_claim_root: rootSchema,
  replay_verified: z.literal(true),
  decision: decisionSchema,
  local_standing: z.enum(["accepted", "rejected", "unassessed"]),
}).strict();

const claimAnchorSchema = z.object({
  claim_id: z.string().regex(/^vcl_[0-9a-f]{64}$/u),
  claim_root: rootSchema,
}).strict();

export const pluralAuthoritySourceSchema = z.object({
  schema: z.literal("site.plural-authority-registry-source.v1"),
  authority_effect: z.literal("none"),
  fixture_class: z.literal("synthetic_reference"),
  protocol_source: z.object({
    repository: z.string().url(),
    commit: commitSchema,
    tree: commitSchema,
    reader: z.string().min(1),
    reader_sha256: rootSchema,
    portable_divergence: z.object({
      flow_root: rootSchema,
      expected_root: rootSchema,
      accept_bundle_root: rootSchema,
      reject_bundle_root: rootSchema,
    }).strict(),
    correction_conformance: z.object({
      input_root: rootSchema,
      expected_root: rootSchema,
      projection_root: rootSchema,
    }).strict(),
  }).strict(),
  portable_submission: claimAnchorSchema.extend({
    submission_id: z.string().regex(/^vsb_[0-9a-f]{16}$/u),
    submission_root: rootSchema,
    producer: z.string().min(1),
    assertion: z.string().min(1),
  }).strict(),
  repositories: z.array(repositorySourceSchema).min(2),
  correction: z.object({
    fixture_class: z.literal("synthetic_reference"),
    integration_seam: z.literal("replace_with_real_consequential_correction_packet"),
    shared_predecessor: claimAnchorSchema,
    synthetic_successor: claimAnchorSchema,
    scope: z.object({
      complete_claim_set: z.literal(true),
      complete_relation_set: z.literal(true),
    }).strict(),
    downstream_work: z.array(z.object({
      work_id: z.string().min(1),
      repository_id: repositoryIdSchema,
      relation: z.enum(["depends_on_predecessor", "independent_of_predecessor"]),
      basis_claim_root: rootSchema,
    }).strict()).min(1),
  }).strict(),
  does_not_establish: z.array(z.string().min(1)).min(1),
}).strict();

export type PluralAuthoritySource = z.infer<typeof pluralAuthoritySourceSchema>;

export interface PluralAuthorityRepositoryView {
  repository_id: string;
  name: string;
  source: {
    bundle_root: HashRoot;
    git_commit: string;
    git_tree: string;
    repository_root: HashRoot;
    replay_projection_root: HashRoot;
    authority_keyset_root: HashRoot;
    authority_policy_root: HashRoot;
    ingested_submission_root: HashRoot;
    derived_claim_root: HashRoot;
    replay_verified: true;
    stale: boolean;
  };
  decision: {
    status: "accepted" | "rejected";
    performer: string;
    principal_id: string;
    decision_record_root: HashRoot;
    event_root: HashRoot;
  };
  local_standing: "accepted" | "rejected" | "unassessed";
}

export interface FrontierMember {
  work_id: string;
  repository_id: string;
  local_standing: "accepted" | "rejected" | "unassessed";
  affected: true;
  safe_next_action: string;
}

export interface DerivedFrontier {
  schema: "site.derived-frontier.v1";
  kind: "derived_query";
  authority_effect: "none";
  persistence: "none";
  rebuildable: true;
  id: string;
  name: string;
  query_root: HashRoot;
  source_projection_root: HashRoot;
  result_root: HashRoot;
  members: FrontierMember[];
}

export interface PluralAuthorityRegistryProjection {
  schema: "site.plural-authority-registry-projection.v1";
  authority_effect: "none";
  fixture_class: "synthetic_reference";
  projection_root: HashRoot;
  source_root: HashRoot;
  protocol_source: PluralAuthoritySource["protocol_source"];
  portable_submission: PluralAuthoritySource["portable_submission"];
  repositories: PluralAuthorityRepositoryView[];
  correction: {
    fixture_class: "synthetic_reference";
    integration_seam: "replace_with_real_consequential_correction_packet";
    shared_predecessor: PluralAuthoritySource["correction"]["shared_predecessor"];
    synthetic_successor: PluralAuthoritySource["correction"]["synthetic_successor"];
    affected_work_count: number;
    unaffected_work_count: number;
  };
  frontiers: DerivedFrontier[];
  does_not_establish: string[];
}

const projectionDomain = "site.plural-authority-registry-projection.v1\0";
const frontierQueryDomain = "site.derived-frontier-query.v1\0";
const frontierResultDomain = "site.derived-frontier-result.v1\0";

function rooted(domain: string, value: unknown): HashRoot {
  return sha256(`${domain}${canonicalJson(value)}`);
}

function assertSourceSemantics(source: PluralAuthoritySource): void {
  const unique = (values: string[]) => new Set(values).size === values.length;
  if (!unique(source.repositories.map(({ repository_id }) => repository_id))) {
    throw new Error("Repository identities must be independent");
  }
  if (!unique(source.repositories.map(({ repository_root }) => repository_root))) {
    throw new Error("terminal Repository roots must diverge");
  }
  if (!unique(source.repositories.map(({ decision }) => decision.principal_id))) {
    throw new Error("authenticated local authority principals must be distinct");
  }
  if (!unique(source.repositories.map(({ authority_keyset_root }) => authority_keyset_root))) {
    throw new Error("Repository authority keysets must be independent");
  }
  if (!unique(source.repositories.map(({ authority_policy_root }) => authority_policy_root))) {
    throw new Error("Repository authority policies must be independent");
  }
  if (!unique(source.repositories.map(({ decision }) => decision.decision_record_root))) {
    throw new Error("local Decision records must be distinct");
  }
  if (new Set(source.repositories.map(({ decision }) => decision.status)).size < 2) {
    throw new Error("reference Decisions must diverge");
  }
  for (const repository of source.repositories) {
    if (
      repository.ingested_submission_root !== source.portable_submission.submission_root
      || repository.derived_claim_root !== source.portable_submission.claim_root
    ) {
      throw new Error("Repository history does not bind the exact portable input");
    }
    const expectedStanding = repository.decision.status === "accepted" ? "accepted" : "unassessed";
    if (repository.local_standing !== expectedStanding) {
      throw new Error("local Standing must be reconstructed from that Repository's own Decision");
    }
  }
  if (
    source.correction.shared_predecessor.claim_id !== source.portable_submission.claim_id
    || source.correction.shared_predecessor.claim_root !== source.portable_submission.claim_root
  ) {
    throw new Error("synthetic correction seam must bind the exact shared predecessor");
  }
  const repositoryIds = new Set(source.repositories.map(({ repository_id }) => repository_id));
  for (const work of source.correction.downstream_work) {
    if (!repositoryIds.has(work.repository_id)) throw new Error("downstream work names an unknown Repository");
    if (
      work.relation === "depends_on_predecessor"
      && work.basis_claim_root !== source.correction.shared_predecessor.claim_root
    ) {
      throw new Error("dependent work omitted the exact corrected predecessor root");
    }
  }
}

function safeAction(repository: PluralAuthorityRepositoryView): string {
  if (repository.source.stale) {
    return "Refresh this Repository from its current exact root before interpreting the correction.";
  }
  if (repository.local_standing === "accepted") {
    return "Reassess the successor inside this Repository; Standing stays accepted until a new local Decision replays.";
  }
  if (repository.decision.status === "rejected") {
    return "Inspect the successor before any new Submission; the earlier rejection leaves the Claim unassessed here.";
  }
  return "Inspect the successor without importing another Repository's Standing.";
}

function deriveFrontier(
  name: string,
  key: "accepted_reassessment" | "unassessed_review",
  sourceProjectionRoot: HashRoot,
  members: FrontierMember[],
): DerivedFrontier {
  const query = {
    schema: "site.derived-frontier-query.v1",
    key,
    authority_effect: "none",
    selects: key === "accepted_reassessment"
      ? "affected work whose predecessor has accepted Local Standing"
      : "affected work whose predecessor is unassessed after a local rejection",
  } as const;
  const queryRoot = rooted(frontierQueryDomain, query);
  const result = { query_root: queryRoot, source_projection_root: sourceProjectionRoot, members };
  return {
    schema: "site.derived-frontier.v1",
    kind: "derived_query",
    authority_effect: "none",
    persistence: "none",
    rebuildable: true,
    id: `frontier:${queryRoot.slice("sha256:".length, "sha256:".length + 16)}`,
    name,
    query_root: queryRoot,
    source_projection_root: sourceProjectionRoot,
    result_root: rooted(frontierResultDomain, result),
    members,
  };
}

/**
 * Build a discardable global discovery projection from attributed Repository
 * reads. It observes local Decisions and Standing but cannot create, transport,
 * reconcile, or mutate either one.
 */
export function buildPluralAuthorityRegistry(
  input: unknown,
  currentRepositoryRoots: Readonly<Record<string, string>> = {},
): PluralAuthorityRegistryProjection {
  const source = pluralAuthoritySourceSchema.parse(input);
  assertSourceSemantics(source);
  const sourceRoot = rooted("site.plural-authority-registry-source.v1\0", source);
  const repositories: PluralAuthorityRepositoryView[] = source.repositories.map((repository) => ({
    repository_id: repository.repository_id,
    name: repository.name,
    source: {
      bundle_root: repository.bundle_root as HashRoot,
      git_commit: repository.git_commit,
      git_tree: repository.git_tree,
      repository_root: repository.repository_root as HashRoot,
      replay_projection_root: repository.replay_projection_root as HashRoot,
      authority_keyset_root: repository.authority_keyset_root as HashRoot,
      authority_policy_root: repository.authority_policy_root as HashRoot,
      ingested_submission_root: repository.ingested_submission_root as HashRoot,
      derived_claim_root: repository.derived_claim_root as HashRoot,
      replay_verified: true,
      stale: currentRepositoryRoots[repository.repository_id] !== undefined
        && currentRepositoryRoots[repository.repository_id] !== repository.repository_root,
    },
    decision: {
      ...repository.decision,
      decision_record_root: repository.decision.decision_record_root as HashRoot,
      event_root: repository.decision.event_root as HashRoot,
    },
    local_standing: repository.local_standing,
  }));
  const projectionBody = {
    schema: "site.plural-authority-registry-projection.v1" as const,
    authority_effect: "none" as const,
    fixture_class: "synthetic_reference" as const,
    source_root: sourceRoot,
    protocol_source: source.protocol_source,
    portable_submission: source.portable_submission,
    repositories,
    correction: {
      fixture_class: "synthetic_reference" as const,
      integration_seam: source.correction.integration_seam,
      shared_predecessor: source.correction.shared_predecessor,
      synthetic_successor: source.correction.synthetic_successor,
      affected_work_count: source.correction.downstream_work.filter(({ relation }) => relation === "depends_on_predecessor").length,
      unaffected_work_count: source.correction.downstream_work.filter(({ relation }) => relation === "independent_of_predecessor").length,
    },
    does_not_establish: source.does_not_establish,
  };
  const projectionRoot = rooted(projectionDomain, projectionBody);
  const repositoryById = new Map(repositories.map((repository) => [repository.repository_id, repository]));
  const affected = source.correction.downstream_work.filter(({ relation }) => relation === "depends_on_predecessor");
  const members = affected.map((work): FrontierMember => {
    const repository = repositoryById.get(work.repository_id);
    if (!repository) throw new Error("downstream work Repository disappeared during projection");
    return {
      work_id: work.work_id,
      repository_id: repository.repository_id,
      local_standing: repository.local_standing,
      affected: true,
      safe_next_action: safeAction(repository),
    };
  });
  const frontiers = [
    deriveFrontier(
      "Accepted work needing local reassessment",
      "accepted_reassessment",
      projectionRoot,
      members.filter(({ local_standing }) => local_standing === "accepted"),
    ),
    deriveFrontier(
      "Unassessed work needing corrected input review",
      "unassessed_review",
      projectionRoot,
      members.filter(({ local_standing }) => local_standing === "unassessed"),
    ),
  ];
  return { ...projectionBody, projection_root: projectionRoot, frontiers };
}

export const pluralAuthorityReferenceSource: PluralAuthoritySource = pluralAuthoritySourceSchema.parse(referenceSource);
export const pluralAuthorityReferenceProjection = buildPluralAuthorityRegistry(pluralAuthorityReferenceSource);
