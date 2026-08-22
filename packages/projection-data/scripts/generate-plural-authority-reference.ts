import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { canonicalJson } from "../src/canonical";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const READER = {
  version: "0.977.4",
  binary_sha256: "sha256:06f912d107d29e4ce1dadd19bf7ef849ec42d7e62cbc9332c9807e6b8c9bd05e",
  release_tag: "v0.977.4",
  release_commit: "1a2e0328620b4e8c4584c3d4baf257adb11f3d45",
  release_tree: "1bd8ed4e11d3745f159b32f23539f5174fd44803",
  release_archive_sha256: "sha256:023bf4d98766e9d7b1d0c7504fcade78220b3fe4f544daca1faaeace98d25d65",
  release_manifest_sha256: "sha256:210a12c9aada097fc64d4222e199c785b2b3281d0924d3ba68f3779580cabbdc",
  command: "vela projection <repository> --json",
} as const;

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`${name} is required`);
  return resolve(value);
}

function root(bytes: Uint8Array | string): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function rooted(domain: string, value: unknown): string {
  return root(`${domain}\0${canonicalJson(value)}`);
}

function object(value: Json, label: string): JsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error(`${label} is not an object`);
  return value;
}

function array(value: Json, label: string): Json[] {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`);
  return value;
}

function string(value: Json, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} is not a string`);
  return value;
}

async function run(command: string[], cwd?: string): Promise<string> {
  const child = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exit !== 0) throw new Error(`${command.join(" ")} failed: ${stderr.trim()}`);
  return stdout.trim();
}

async function json(path: string): Promise<JsonObject> {
  return object(JSON.parse(await readFile(path, "utf8")) as Json, path);
}

async function raw(path: string) {
  const bytes = await readFile(path);
  return { root: root(bytes), bytes_base64: bytes.toString("base64") };
}

function projectionRoot(document: JsonObject): string {
  const commitment = structuredClone(document);
  delete commitment.projection_root;
  return root(canonicalJson(commitment));
}

async function authorityRecords(repository: string) {
  const directory = join(repository, ".vela", "authority", "records");
  const records = [];
  for (const name of (await readdir(directory)).sort()) {
    const envelopeBytes = await readFile(join(directory, name));
    const envelope = object(JSON.parse(envelopeBytes.toString("utf8")) as Json, name);
    const payloadBytes = Buffer.from(string(envelope.payload, `${name}.payload`), "base64");
    const payload = object(JSON.parse(payloadBytes.toString("utf8")) as Json, `${name}.payload`);
    const content = object(payload.content, `${name}.payload.content`);
    records.push({
      record_id: name.replace(/\.dsse\.json$/u, ""),
      sequence: content.sequence,
      payload_root: root(payloadBytes),
      principal_id: object(content.principal, `${name}.principal`).principal_id,
      after_event_log_root: content.after_event_log_root,
      envelope_bytes_base64: envelopeBytes.toString("base64"),
      payload_bytes_base64: payloadBytes.toString("base64"),
    });
  }
  return records.sort((left, right) => Number(left.sequence) - Number(right.sequence));
}

async function authorityEvents(repository: string) {
  const directory = join(repository, ".vela", "authority", "events");
  const events = [];
  for (const name of (await readdir(directory)).sort()) {
    const bytes = await readFile(join(directory, name));
    const record = object(JSON.parse(bytes.toString("utf8")) as Json, name);
    events.push({
      event_id: basename(name, ".json"),
      kind: object(record.content, `${name}.content`).kind,
      event_root: root(bytes),
      bytes_base64: bytes.toString("base64"),
    });
  }
  return events;
}

async function deriveRepository(
  label: "accept" | "reject",
  repository: string,
  bundleRoot: string,
  name: string,
  vela: string,
) {
  await run(["git", "fsck", "--full", "--strict"], repository);
  const projection = object(JSON.parse(await run([vela, "projection", repository, "--json"])) as Json, `${label} projection`);
  const replay = object(JSON.parse(await run([vela, "replay", repository, "--json"])) as Json, `${label} replay`);
  if (projection.reader_version !== READER.version) throw new Error(`${label} projection reader version drift`);
  if (projection.projection_root !== projectionRoot(projection)) throw new Error(`${label} projection root is not reproducible`);
  const repositoryRead = object(projection.repository, `${label}.repository`);
  const git = object(projection.git, `${label}.git`);
  const claims = array(projection.claims, `${label}.claims`);
  const proposals = array(projection.proposals, `${label}.proposals`);
  const submissions = array(projection.submissions, `${label}.submissions`);
  const artifacts = array(projection.artifacts, `${label}.artifacts`);
  if (claims.length !== 1 || proposals.length !== 1 || submissions.length !== 1 || artifacts.length !== 1) {
    throw new Error(`${label} fixture must retain exactly one Claim, Proposal, Submission, and Artifact`);
  }
  const claim = object(claims[0]!, `${label}.claim`);
  const proposal = object(proposals[0]!, `${label}.proposal`);
  const submission = object(submissions[0]!, `${label}.submission`);
  const artifact = object(artifacts[0]!, `${label}.artifact`);
  const decision = object(proposal.decision, `${label}.decision`);
  const decisionEvent = object(decision.decision_event, `${label}.decision_event`);
  const records = await authorityRecords(repository);
  const events = await authorityEvents(repository);
  const decisionRecordRoot = string(repositoryRead.authority_record_root, `${label}.authority_record_root`);
  if (!records.some(({ payload_root }) => payload_root === decisionRecordRoot)) {
    throw new Error(`${label} Decision record is absent from retained authority records`);
  }
  const rawRecords = {
    submission: await raw(join(repository, string(submission.source_path, `${label}.submission.source_path`))),
    artifact: await raw(join(repository, string(artifact.source_path, `${label}.artifact.source_path`))),
    claim: await raw(join(repository, string(claim.source_path, `${label}.claim.source_path`))),
    proposal: await raw(join(repository, string(proposal.source_path, `${label}.proposal.source_path`))),
    authority_records: records,
    authority_events: events,
  };
  const evidenceBody = {
    schema: "site.plural-authority-repository-evidence.v1",
    reader: READER,
    projection_output_root: root(canonicalJson(projection)),
    projection,
    raw_records: rawRecords,
  };
  const evidenceRoot = rooted("site.plural-authority-repository-evidence.v1", evidenceBody);
  return {
    repository_id: string(repositoryRead.repository_id, `${label}.repository_id`),
    name,
    bundle_root: bundleRoot,
    git_commit: string(git.commit, `${label}.git.commit`),
    git_tree: string(git.tree, `${label}.git.tree`),
    repository_root: string(repositoryRead.repository_root, `${label}.repository_root`),
    replay_projection_root: string(projection.projection_root, `${label}.projection_root`),
    authority_keyset_root: string(repositoryRead.authority_keyset_root, `${label}.authority_keyset_root`),
    authority_policy_root: string(repositoryRead.authority_policy_root, `${label}.authority_policy_root`),
    authority_event_log_root: string(repositoryRead.authority_event_log_root, `${label}.authority_event_log_root`),
    ingested_submission_root: string(submission.object_root, `${label}.submission_root`),
    derived_artifact_root: string(artifact.artifact_root, `${label}.artifact_root`),
    derived_claim_root: string(claim.claim_root, `${label}.claim_root`),
    proposal_id: string(proposal.proposal_id, `${label}.proposal_id`),
    proposal_root: string(proposal.proposal_root, `${label}.proposal_root`),
    decision: {
      status: string(proposal.status, `${label}.proposal.status`),
      performer: string(decision.actor_id, `${label}.decision.actor_id`),
      principal_id: string(decision.authority_principal_id, `${label}.decision.authority_principal_id`),
      decision_record_root: decisionRecordRoot,
      event_root: string(decisionEvent.authority_event_root, `${label}.decision_event.root`),
    },
    local_standing: string(claim.standing, `${label}.claim.standing`),
    evidence: { ...evidenceBody, evidence_root: evidenceRoot },
    replay: {
      repository_id: replay.repository_id,
      origin_id: replay.origin_id,
      origin_root: replay.origin_root,
      authority_keyset_root: replay.authority_keyset_root,
      authority_model_root: replay.authority_model_root,
      repository_root: replay.repository_root,
      git_commit: replay.git_commit,
      git_tree: replay.git_tree,
      counts: replay.counts,
    },
  };
}

const core = argument("--core");
const vela = resolve(process.env.VELA_BIN ?? argument("--vela"));
const output = argument("--output");
if (root(await readFile(vela)) !== READER.binary_sha256) throw new Error("Vela 0.977.4 reader digest drift");
if ((await run([vela, "--version"])) !== `vela ${READER.version}`) throw new Error("Vela reader version drift");

const existing = await json(output);
const protocolSource = object(existing.protocol_source, "protocol_source");
const commit = string(protocolSource.commit, "protocol_source.commit");
const tree = await run(["git", "rev-parse", `${commit}^{tree}`], core);
if (tree !== protocolSource.tree) throw new Error("Core fixture tree drift");
const reference = join(core, "examples", "portable-divergence");
const correctionDirectory = join(core, "conformance", "fixtures", "correction");
const fixtureFiles = {
  flow_root: join(reference, "flow.json"),
  expected_root: join(reference, "expected.json"),
  accept_bundle_root: join(reference, "accept.git.bundle"),
  reject_bundle_root: join(reference, "reject.git.bundle"),
};
const portableDivergence: Record<string, string> = {};
for (const [key, path] of Object.entries(fixtureFiles)) portableDivergence[key] = root(await readFile(path));
const correctionInput = join(correctionDirectory, "diamond-input.json");
const correctionExpected = join(correctionDirectory, "diamond-expected.json");
const correctionProjection = await json(correctionExpected);

const temporary = await mkdtemp(join(tmpdir(), "vela-plural-authority-generate-"));
try {
  const repositories = [];
  const oldRepositories = array(existing.repositories, "repositories").map((value) => object(value, "repository"));
  for (const label of ["accept", "reject"] as const) {
    const bundle = fixtureFiles[`${label}_bundle_root`];
    await run(["git", "bundle", "verify", bundle], core);
    const checkout = join(temporary, label);
    await run(["git", "clone", "--quiet", bundle, checkout]);
    const old = oldRepositories.find((repository) => String(object(repository.decision, "decision").status) === (label === "accept" ? "accepted" : "rejected"));
    if (!old) throw new Error(`${label} repository label is missing from the retained packet`);
    repositories.push(await deriveRepository(label, checkout, portableDivergence[`${label}_bundle_root`]!, string(old.name, `${label}.name`), vela));
  }
  const [left, right] = repositories;
  if (!left || !right) throw new Error("both Repository histories are required");
  for (const field of ["submission", "artifact", "claim"] as const) {
    if (left.evidence.raw_records[field].bytes_base64 !== right.evidence.raw_records[field].bytes_base64) {
      throw new Error(`portable ${field} bytes differ between Repositories`);
    }
  }
  const leftProjection = object(left.evidence.projection, "accept projection");
  const submission = object(array(leftProjection.submissions, "submissions")[0]!, "submission");
  const submissionPayload = object(submission.payload, "submission.payload");
  const submissionAuthentication = object(submission.authentication, "submission.authentication");
  const signerIdentity = object(submissionPayload.identity, "submission.identity");
  const producer = string(object(submissionPayload.provenance, "submission.provenance").producer, "submission.producer");
  if (submissionAuthentication.signature_verified !== true || submissionAuthentication.actor_id !== producer || signerIdentity.actor_id !== producer) {
    throw new Error("portable Submission authentication or signer identity drift");
  }
  const claim = object(array(leftProjection.claims, "claims")[0]!, "claim");
  const artifact = object(array(leftProjection.artifacts, "artifacts")[0]!, "artifact");
  const correction = object(existing.correction, "correction");
  delete correction.packet_root;
  const correctionPacketRoot = rooted("site.synthetic-correction-packet.v1", correction);
  const source = {
    schema: "site.plural-authority-registry-source.v1",
    authority_effect: "none",
    fixture_class: "synthetic_reference",
    protocol_source: {
      repository: protocolSource.repository,
      commit,
      tree,
      reader: READER,
      portable_divergence: portableDivergence,
      correction_conformance: {
        input_root: root(await readFile(correctionInput)),
        expected_root: root(await readFile(correctionExpected)),
        projection_root: correctionProjection.projection_root,
      },
    },
    portable_submission: {
      submission_id: submission.object_id,
      submission_root: submission.object_root,
      producer,
      artifact_root: artifact.artifact_root,
      artifact_bytes: Buffer.from(left.evidence.raw_records.artifact.bytes_base64, "base64").length,
      claim_id: claim.claim_id,
      claim_root: claim.claim_root,
      assertion: claim.assertion,
    },
    repositories,
    correction: { ...correction, packet_root: correctionPacketRoot },
    does_not_establish: existing.does_not_establish,
  };
  await writeFile(output, `${JSON.stringify(source, null, 2)}\n`, { flag: "w" });
  console.log(JSON.stringify({ output, reader: READER, repositories: repositories.map(({ repository_id, replay_projection_root, evidence }) => ({ repository_id, replay_projection_root, evidence_root: evidence.evidence_root })) }, null, 2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
