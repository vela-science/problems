import { z } from "zod";
import referenceSource from "../config/plural-authority-reference.v1.json";
import { canonicalJson, sha256, type HashRoot } from "./canonical";

const rootSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);
const commitSchema = z.string().regex(/^[0-9a-f]{40}$/u);
const repositoryIdSchema = z.string().uuid();
const base64Schema = z.string().regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u);
const jsonObjectSchema = z.record(z.string(), z.unknown());

const readerSchema = z.object({
  version: z.literal("0.977.4"),
  binary_sha256: rootSchema,
  release_tag: z.literal("v0.977.4"),
  release_commit: commitSchema,
  release_tree: commitSchema,
  release_archive_sha256: rootSchema,
  release_manifest_sha256: rootSchema,
  command: z.literal("vela projection <repository> --json"),
}).strict();

const decisionSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  performer: z.string().min(1),
  principal_id: z.string().min(1),
  decision_record_root: rootSchema,
  event_root: rootSchema,
}).strict();

const rawBlobSchema = z.object({ root: rootSchema, bytes_base64: base64Schema }).strict();
const authorityRecordEvidenceSchema = z.object({
  record_id: z.string().regex(/^var_[0-9a-f]{16}$/u),
  sequence: z.number().int().positive(),
  payload_root: rootSchema,
  principal_id: z.string().min(1),
  after_event_log_root: rootSchema,
  envelope_bytes_base64: base64Schema,
  payload_bytes_base64: base64Schema,
}).strict();
const authorityEventEvidenceSchema = z.object({
  event_id: z.string().regex(/^vev_[0-9a-f]{16}$/u),
  kind: z.string().min(1),
  event_root: rootSchema,
  bytes_base64: base64Schema,
}).strict();
const repositoryEvidenceSchema = z.object({
  schema: z.literal("site.plural-authority-repository-evidence.v1"),
  reader: readerSchema,
  projection_output_root: rootSchema,
  projection: jsonObjectSchema,
  raw_records: z.object({
    submission: rawBlobSchema,
    artifact: rawBlobSchema,
    claim: rawBlobSchema,
    proposal: rawBlobSchema,
    authority_records: z.array(authorityRecordEvidenceSchema).min(2),
    authority_events: z.array(authorityEventEvidenceSchema).min(2),
  }).strict(),
  evidence_root: rootSchema,
}).strict();
const replaySummarySchema = z.object({
  repository_id: repositoryIdSchema,
  origin_id: z.string().min(1),
  origin_root: rootSchema,
  authority_keyset_root: rootSchema,
  authority_model_root: rootSchema,
  repository_root: rootSchema,
  git_commit: commitSchema,
  git_tree: commitSchema,
  counts: z.record(z.string(), z.number().int().nonnegative()),
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
  authority_event_log_root: rootSchema,
  ingested_submission_root: rootSchema,
  derived_artifact_root: rootSchema,
  derived_claim_root: rootSchema,
  proposal_id: z.string().regex(/^vpr_[0-9a-f]{16}$/u),
  proposal_root: rootSchema,
  decision: decisionSchema,
  local_standing: z.enum(["accepted", "rejected", "unassessed"]),
  evidence: repositoryEvidenceSchema,
  replay: replaySummarySchema,
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
    reader: readerSchema,
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
    artifact_root: rootSchema,
    artifact_bytes: z.number().int().positive(),
    assertion: z.string().min(1),
  }).strict(),
  repositories: z.array(repositorySourceSchema).min(2),
  correction: z.object({
    fixture_class: z.literal("synthetic_reference"),
    integration_seam: z.literal("replace_with_real_consequential_correction_packet"),
    shared_predecessor: claimAnchorSchema,
    synthetic_successor: claimAnchorSchema,
    scope: z.object({ complete_claim_set: z.literal(true), complete_relation_set: z.literal(true) }).strict(),
    downstream_work: z.array(z.object({
      work_id: z.string().min(1),
      repository_id: repositoryIdSchema,
      relation: z.enum(["depends_on_predecessor", "independent_of_predecessor"]),
      basis_claim_root: rootSchema,
    }).strict()).min(1),
    packet_root: rootSchema,
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
    evidence_root: HashRoot;
    authority_keyset_root: HashRoot;
    authority_policy_root: HashRoot;
    authority_event_log_root: HashRoot;
    ingested_submission_root: HashRoot;
    derived_artifact_root: HashRoot;
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
    packet_root: HashRoot;
    shared_predecessor: PluralAuthoritySource["correction"]["shared_predecessor"];
    synthetic_successor: PluralAuthoritySource["correction"]["synthetic_successor"];
    affected_work_count: number;
    unaffected_work_count: number;
  };
  frontiers: DerivedFrontier[];
  does_not_establish: string[];
}

const projectionDomain = "site.plural-authority-registry-projection.v1\0";
const sourceDomain = "site.plural-authority-registry-source.v1\0";
const repositoryEvidenceDomain = "site.plural-authority-repository-evidence.v1\0";
const correctionPacketDomain = "site.synthetic-correction-packet.v1\0";
const frontierQueryDomain = "site.derived-frontier-query.v1\0";
const frontierResultDomain = "site.derived-frontier-result.v1\0";

function rooted(domain: string, value: unknown): HashRoot {
  return sha256(`${domain}${canonicalJson(value)}`);
}
function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || Array.isArray(value) || typeof value !== "object") throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}
function records(value: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((entry, index) => record(entry, `${label}[${index}]`));
}
function text(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  return value;
}
function exactBytes(encoded: string, label: string): Buffer {
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded) throw new Error(`${label} is not canonical base64`);
  return bytes;
}
function parseBytes(encoded: string, label: string): Record<string, unknown> {
  const bytes = exactBytes(encoded, label);
  try { return record(JSON.parse(bytes.toString("utf8")), label); }
  catch (error) { throw new Error(`${label} is not UTF-8 JSON: ${String(error)}`); }
}
function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (canonicalJson(actual) !== canonicalJson(expected)) throw new Error(`${label} drift`);
}
function verifyBlob(blob: z.infer<typeof rawBlobSchema>, expectedRoot: string, label: string): Buffer {
  const bytes = exactBytes(blob.bytes_base64, label);
  if (sha256(bytes) !== blob.root || blob.root !== expectedRoot) throw new Error(`${label} root drift`);
  return bytes;
}

function verifyRepositoryEvidence(source: PluralAuthoritySource, repository: PluralAuthoritySource["repositories"][number]): void {
  const evidence = repository.evidence;
  const evidenceBody = { ...evidence };
  delete (evidenceBody as Partial<typeof evidence>).evidence_root;
  if (rooted(repositoryEvidenceDomain, evidenceBody) !== evidence.evidence_root) throw new Error("Repository evidence root drift");
  assertEqual(evidence.reader, source.protocol_source.reader, "Repository evidence reader identity");

  const projection = evidence.projection;
  if (sha256(canonicalJson(projection)) !== evidence.projection_output_root) throw new Error("retained projection output root drift");
  const projectionCommitment = { ...projection };
  delete projectionCommitment.projection_root;
  if (sha256(canonicalJson(projectionCommitment)) !== projection.projection_root) throw new Error("Vela projection root drift");
  if (projection.reader_version !== source.protocol_source.reader.version) throw new Error("Vela projection reader version drift");
  if (projection.authority_effect !== "none") throw new Error("Vela projection imported authority");
  const projectionRepository = record(projection.repository, "projection.repository");
  const projectionGit = record(projection.git, "projection.git");
  const integrity = record(projection.integrity, "projection.integrity");
  if (integrity.replay !== "verified" || integrity.strict !== "pass" || integrity.blocker_count !== 0) throw new Error("Vela projection is not strict replay-verified");
  const claims = records(projection.claims, "projection.claims");
  const proposals = records(projection.proposals, "projection.proposals");
  const submissions = records(projection.submissions, "projection.submissions");
  const artifacts = records(projection.artifacts, "projection.artifacts");
  if (claims.length !== 1 || proposals.length !== 1 || submissions.length !== 1 || artifacts.length !== 1) throw new Error("reference projection object multiplicity drift");
  const claim = claims[0]!;
  const proposal = proposals[0]!;
  const submission = submissions[0]!;
  const artifact = artifacts[0]!;
  assertEqual({
    repository_id: projectionRepository.repository_id,
    name: projectionRepository.name,
    git_commit: projectionGit.commit,
    git_tree: projectionGit.tree,
    repository_root: projectionRepository.repository_root,
    replay_projection_root: projection.projection_root,
    authority_keyset_root: projectionRepository.authority_keyset_root,
    authority_policy_root: projectionRepository.authority_policy_root,
    authority_event_log_root: projectionRepository.authority_event_log_root,
  }, {
    repository_id: repository.repository_id,
    name: repository.name,
    git_commit: repository.git_commit,
    git_tree: repository.git_tree,
    repository_root: repository.repository_root,
    replay_projection_root: repository.replay_projection_root,
    authority_keyset_root: repository.authority_keyset_root,
    authority_policy_root: repository.authority_policy_root,
    authority_event_log_root: repository.authority_event_log_root,
  }, "Repository projection binding");
  assertEqual({
    repository_id: repository.replay.repository_id,
    origin_id: repository.replay.origin_id,
    origin_root: repository.replay.origin_root,
    git_commit: repository.replay.git_commit,
    git_tree: repository.replay.git_tree,
    repository_root: repository.replay.repository_root,
    authority_keyset_root: repository.replay.authority_keyset_root,
    authority_policy_root: repository.replay.authority_model_root,
  }, {
    repository_id: repository.repository_id,
    origin_id: projectionRepository.origin_id,
    origin_root: projectionRepository.origin_root,
    git_commit: repository.git_commit,
    git_tree: repository.git_tree,
    repository_root: repository.repository_root,
    authority_keyset_root: repository.authority_keyset_root,
    authority_policy_root: repository.authority_policy_root,
  }, "Repository replay binding");
  const projectionCounts = record(projection.counts, "projection.counts");
  assertEqual(repository.replay.counts, {
    accepted_claims: projectionCounts.accepted_claims,
    artifacts: projectionCounts.artifacts,
    pending_claims: projectionCounts.pending_claims,
    proposal_withdrawals: 0,
    proposals: records(projection.proposals, "projection.proposals").length,
    submissions: projectionCounts.submissions,
    verifications: projectionCounts.verifications,
  }, "Repository replay counts");

  verifyBlob(evidence.raw_records.submission, repository.ingested_submission_root, "Submission bytes");
  const artifactBytes = verifyBlob(evidence.raw_records.artifact, repository.derived_artifact_root, "Artifact bytes");
  verifyBlob(evidence.raw_records.claim, repository.derived_claim_root, "Claim bytes");
  verifyBlob(evidence.raw_records.proposal, repository.proposal_root, "Proposal bytes");
  assertEqual({
    submission_id: submission.object_id,
    submission_root: submission.object_root,
    artifact_root: artifact.artifact_root,
    artifact_bytes: artifact.byte_length,
    claim_id: claim.claim_id,
    claim_root: claim.claim_root,
    assertion: claim.assertion,
    proposal_id: proposal.proposal_id,
    proposal_root: proposal.proposal_root,
  }, {
    submission_id: source.portable_submission.submission_id,
    submission_root: repository.ingested_submission_root,
    artifact_root: repository.derived_artifact_root,
    artifact_bytes: artifactBytes.byteLength,
    claim_id: source.portable_submission.claim_id,
    claim_root: repository.derived_claim_root,
    assertion: source.portable_submission.assertion,
    proposal_id: repository.proposal_id,
    proposal_root: repository.proposal_root,
  }, "portable object projection binding");
  const submissionPayload = record(submission.payload, "projection.submission.payload");
  if (record(submissionPayload.provenance, "submission provenance").producer !== source.portable_submission.producer) throw new Error("authenticated Submission producer drift");
  const submissionAuthentication = record(submission.authentication, "submission authentication");
  const signerIdentity = record(submissionPayload.identity, "submission signer identity");
  if (
    submissionAuthentication.signature_verified !== true
    || submissionAuthentication.actor_id !== source.portable_submission.producer
    || signerIdentity.actor_id !== source.portable_submission.producer
  ) throw new Error("portable Submission authentication or signer identity drift");

  const decision = record(proposal.decision, "projection.proposal.decision");
  const decisionEvent = record(decision.decision_event, "projection.proposal.decision_event");
  assertEqual({
    status: proposal.status,
    performer: decision.actor_id,
    principal_id: decision.authority_principal_id,
    decision_record_root: projectionRepository.authority_record_root,
    event_root: decisionEvent.authority_event_root,
    local_standing: claim.standing,
  }, { ...repository.decision, local_standing: repository.local_standing }, "local Decision and Standing binding");

  const authorityRecords = evidence.raw_records.authority_records;
  for (let index = 0; index < authorityRecords.length; index += 1) {
    const retained = authorityRecords[index]!;
    if (retained.sequence !== index + 1) throw new Error("authority record sequence drift");
    const envelope = parseBytes(retained.envelope_bytes_base64, `${retained.record_id} envelope`);
    const envelopePayload = text(envelope.payload, `${retained.record_id} envelope payload`);
    if (envelopePayload !== retained.payload_bytes_base64) throw new Error("authority payload bytes drift");
    const payloadBytes = exactBytes(retained.payload_bytes_base64, `${retained.record_id} payload`);
    if (sha256(payloadBytes) !== retained.payload_root) throw new Error("authority payload root drift");
    const payload = record(JSON.parse(payloadBytes.toString("utf8")), `${retained.record_id} payload`);
    const content = record(payload.content, `${retained.record_id} content`);
    assertEqual({
      record_id: payload.record_id,
      sequence: content.sequence,
      principal_id: record(content.principal, `${retained.record_id} principal`).principal_id,
      after_event_log_root: content.after_event_log_root,
    }, {
      record_id: retained.record_id,
      sequence: retained.sequence,
      principal_id: retained.principal_id,
      after_event_log_root: retained.after_event_log_root,
    }, "authority record binding");
  }
  const decisionRecord = authorityRecords.at(-1)!;
  if (decisionRecord.payload_root !== repository.decision.decision_record_root || decisionRecord.principal_id !== repository.decision.principal_id || decisionRecord.after_event_log_root !== repository.authority_event_log_root) throw new Error("Decision record attribution or event-log root drift");

  const projectionEvents = records(projection.authority_events, "projection.authority_events");
  const eventRoots = [] as [string, string][];
  let initialEventLogRoot: string | null = null;
  for (const retained of evidence.raw_records.authority_events) {
    const bytes = exactBytes(retained.bytes_base64, `${retained.event_id} bytes`);
    if (sha256(bytes) !== retained.event_root) throw new Error("authority Event root drift");
    const event = record(JSON.parse(bytes.toString("utf8")), retained.event_id);
    const content = record(event.content, `${retained.event_id}.content`);
    if (event.id !== retained.event_id || content.kind !== retained.kind) throw new Error("authority Event identity drift");
    const projected = projectionEvents.find((candidate) => record(candidate.event, "projection event receipt").authority_event_id === retained.event_id);
    if (!projected || canonicalJson(projected.record) !== canonicalJson(event)) throw new Error("projection omitted or rewrote an authority Event");
    if (retained.kind === "authority.initialized") initialEventLogRoot = text(record(content.payload, "authority initialization payload").initial_event_log_root, "initial event-log root");
    eventRoots.push([retained.event_id, retained.event_root]);
  }
  if (!initialEventLogRoot) throw new Error("authority initialization Event is missing");
  eventRoots.sort(([left], [right]) => left.localeCompare(right));
  const eventLogRoot = sha256(canonicalJson({ schema: "vela.authority-event-log.v1", legacy_event_log_root: initialEventLogRoot, authority_event_roots: eventRoots.map(([, eventRoot]) => eventRoot) }));
  if (eventLogRoot !== repository.authority_event_log_root) throw new Error("authority event-log root drift");
  const terminalEvent = evidence.raw_records.authority_events.find(({ event_root }) => event_root === repository.decision.event_root);
  if (!terminalEvent) throw new Error("Decision Event root is absent from retained Event bytes");
  const terminalContent = record(parseBytes(terminalEvent.bytes_base64, "Decision Event").content, "Decision Event content");
  const performer = record(record(terminalContent.payload, "Decision Event payload").decision_performer, "Decision performer");
  if (terminalContent.principal_id !== repository.decision.principal_id || performer.actor_id !== repository.decision.performer || performer.authority_principal_id !== repository.decision.principal_id) throw new Error("Decision Event performer or authenticated principal drift");
}

function assertSourceSemantics(source: PluralAuthoritySource): void {
  const correctionBody = { ...source.correction };
  delete (correctionBody as Partial<typeof source.correction>).packet_root;
  if (rooted(correctionPacketDomain, correctionBody) !== source.correction.packet_root) throw new Error("synthetic correction packet root drift");
  const unique = (values: string[]) => new Set(values).size === values.length;
  if (!unique(source.repositories.map(({ repository_id }) => repository_id))) throw new Error("Repository identities must be independent");
  if (!unique(source.repositories.map(({ repository_root }) => repository_root))) throw new Error("terminal Repository roots must diverge");
  if (!unique(source.repositories.map(({ decision }) => decision.principal_id))) throw new Error("authenticated local authority principals must be distinct");
  if (!unique(source.repositories.map(({ authority_keyset_root }) => authority_keyset_root))) throw new Error("Repository authority keysets must be independent");
  if (!unique(source.repositories.map(({ authority_policy_root }) => authority_policy_root))) throw new Error("Repository authority policies must be independent");
  if (!unique(source.repositories.map(({ decision }) => decision.decision_record_root))) throw new Error("local Decision records must be distinct");
  if (new Set(source.repositories.map(({ decision }) => decision.status)).size < 2) throw new Error("reference Decisions must diverge");
  for (const repository of source.repositories) {
    verifyRepositoryEvidence(source, repository);
    const expectedBundleRoot = repository.decision.status === "accepted"
      ? source.protocol_source.portable_divergence.accept_bundle_root
      : source.protocol_source.portable_divergence.reject_bundle_root;
    if (repository.bundle_root !== expectedBundleRoot) throw new Error("Repository bundle root drift");
    if (repository.ingested_submission_root !== source.portable_submission.submission_root || repository.derived_artifact_root !== source.portable_submission.artifact_root || repository.derived_claim_root !== source.portable_submission.claim_root) throw new Error("Repository history does not bind the exact portable input");
    const expectedStanding = repository.decision.status === "accepted" ? "accepted" : "unassessed";
    if (repository.local_standing !== expectedStanding) throw new Error("local Standing must be reconstructed from that Repository's own Decision");
  }
  const [left, right] = source.repositories;
  if (!left || !right) throw new Error("two Repository histories are required");
  for (const key of ["submission", "artifact", "claim"] as const) {
    if (left.evidence.raw_records[key].bytes_base64 !== right.evidence.raw_records[key].bytes_base64) throw new Error(`portable ${key} bytes differ between Repositories`);
  }
  if (source.correction.shared_predecessor.claim_id !== source.portable_submission.claim_id || source.correction.shared_predecessor.claim_root !== source.portable_submission.claim_root) throw new Error("synthetic correction seam must bind the exact shared predecessor");
  const repositoryIds = new Set(source.repositories.map(({ repository_id }) => repository_id));
  for (const work of source.correction.downstream_work) {
    if (!repositoryIds.has(work.repository_id)) throw new Error("downstream work names an unknown Repository");
    if (work.relation === "depends_on_predecessor" && work.basis_claim_root !== source.correction.shared_predecessor.claim_root) throw new Error("dependent work omitted the exact corrected predecessor root");
  }
}

function safeAction(repository: PluralAuthorityRepositoryView): string {
  if (repository.source.stale) return "Refresh this Repository from its current exact root before interpreting the correction.";
  if (repository.local_standing === "accepted") return "Reassess the successor inside this Repository; Standing stays accepted until a new local Decision replays.";
  if (repository.decision.status === "rejected") return "Inspect the successor before any new Submission; the earlier rejection leaves the Claim unassessed here.";
  return "Inspect the successor without importing another Repository's Standing.";
}
function deriveFrontier(name: string, key: "accepted_reassessment" | "unassessed_review", sourceProjectionRoot: HashRoot, members: FrontierMember[]): DerivedFrontier {
  const query = {
    schema: "site.derived-frontier-query.v1",
    key,
    authority_effect: "none",
    selects: key === "accepted_reassessment" ? "affected work whose predecessor has accepted Local Standing" : "affected work whose predecessor is unassessed after a local rejection",
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

/** Build a discardable, authority-none discovery projection from evidence-bound Repository reads. */
export function buildPluralAuthorityRegistry(input: unknown, currentRepositoryRoots: Readonly<Record<string, string>> = {}): PluralAuthorityRegistryProjection {
  const source = pluralAuthoritySourceSchema.parse(input);
  assertSourceSemantics(source);
  const sourceRoot = rooted(sourceDomain, source);
  const repositories: PluralAuthorityRepositoryView[] = source.repositories.map((repository) => ({
    repository_id: repository.repository_id,
    name: repository.name,
    source: {
      bundle_root: repository.bundle_root as HashRoot,
      git_commit: repository.git_commit,
      git_tree: repository.git_tree,
      repository_root: repository.repository_root as HashRoot,
      replay_projection_root: repository.replay_projection_root as HashRoot,
      evidence_root: repository.evidence.evidence_root as HashRoot,
      authority_keyset_root: repository.authority_keyset_root as HashRoot,
      authority_policy_root: repository.authority_policy_root as HashRoot,
      authority_event_log_root: repository.authority_event_log_root as HashRoot,
      ingested_submission_root: repository.ingested_submission_root as HashRoot,
      derived_artifact_root: repository.derived_artifact_root as HashRoot,
      derived_claim_root: repository.derived_claim_root as HashRoot,
      replay_verified: true,
      stale: currentRepositoryRoots[repository.repository_id] !== undefined && currentRepositoryRoots[repository.repository_id] !== repository.repository_root,
    },
    decision: { ...repository.decision, decision_record_root: repository.decision.decision_record_root as HashRoot, event_root: repository.decision.event_root as HashRoot },
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
      packet_root: source.correction.packet_root as HashRoot,
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
    return { work_id: work.work_id, repository_id: repository.repository_id, local_standing: repository.local_standing, affected: true, safe_next_action: safeAction(repository) };
  });
  const frontiers = [
    deriveFrontier("Accepted work needing local reassessment", "accepted_reassessment", projectionRoot, members.filter(({ local_standing }) => local_standing === "accepted")),
    deriveFrontier("Unassessed work needing corrected input review", "unassessed_review", projectionRoot, members.filter(({ local_standing }) => local_standing === "unassessed")),
  ];
  return { ...projectionBody, projection_root: projectionRoot, frontiers };
}

export const pluralAuthorityReferenceSource: PluralAuthoritySource = pluralAuthoritySourceSchema.parse(referenceSource);
export const pluralAuthorityReferenceProjection = buildPluralAuthorityRegistry(pluralAuthorityReferenceSource);
