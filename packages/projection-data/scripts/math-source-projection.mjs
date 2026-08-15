import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  createRepositorySourceBinding,
  createMathSourceObservation,
  createMathSourceObservationBundle,
  createMathSourceRegistryRelease,
  createNativeSourceRecord,
  createReleaseSource,
  mathSourceRegistry,
  sourceDeclarationRows,
} from "../src/math-sources.ts";
import { canonicalJson, sha256 } from "../src/canonical.ts";
import {
  occurrenceKey,
  problemResolutionConfig,
  problemResolutionConfigRoot,
} from "../src/problem-resolution.ts";
import { repositoryRegistry } from "../src/registry.ts";
import { materializeVerifiedSourceAdapterBundle } from "../src/source-adapters/projection.ts";
import {
  projectionSourceAdapterIds,
  requireProjectionSourceAdapters,
} from "../src/source-adapters/refresh.ts";

export const UNSCOPED_RELEASE_ROOT = `sha256:${"0".repeat(64)}`;
const UNSCOPED_OBSERVATION_ROOT = `sha256:${"0".repeat(64)}`;
const RFC3339_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function latestRfc3339Instant(values) {
  assert(values.length > 0, "cannot derive generated_at without source timestamps");
  const instants = values.map((value) => {
    assert(
      typeof value === "string" && RFC3339_INSTANT.test(value),
      `invalid RFC3339 timestamp ${value}`,
    );
    const instant = Date.parse(value);
    assert(Number.isFinite(instant), `invalid RFC3339 timestamp ${value}`);
    return { instant, value };
  });
  return instants.reduce(
    (latest, candidate) => candidate.instant > latest.instant ? candidate : latest,
  ).value;
}

function hashRoot(value) {
  return sha256(canonicalJson(value));
}

function sourceNativeKey(value) {
  return `${value?.source_id ?? ""}\0${value?.native_id ?? ""}`;
}

function retainedRepositoryFile(directory, path) {
  assert(typeof path === "string" && path.length > 0 && !isAbsolute(path), "Claim evidence path must be repository-relative");
  const lexical = resolve(directory, path);
  const lexicalRelative = relative(directory, lexical);
  assert(lexicalRelative !== ".." && !lexicalRelative.startsWith(`..${sep}`), `Claim evidence path escapes its Repository: ${path}`);
  let cursor = directory;
  for (const part of lexicalRelative.split(sep)) {
    cursor = join(cursor, part);
    assert(!lstatSync(cursor).isSymbolicLink(), `Claim evidence path traverses a symlink: ${path}`);
  }
  assert(lstatSync(lexical).isFile(), `Claim evidence path is not a regular file: ${path}`);
  const physical = realpathSync(lexical);
  const physicalRelative = relative(realpathSync(directory), physical);
  assert(physicalRelative !== ".." && !physicalRelative.startsWith(`..${sep}`), `Claim evidence path resolves outside its Repository: ${path}`);
  return lexical;
}

/**
 * Interprets the current, source-owned Math correction packet attached to an
 * accepted correction. It does not infer subjects from assertion text or
 * Problem numbers. The packet must resolve through the exact reviewed Web
 * resolver and retain the unresolved-equivalence boundary.
 */
export function reviewedClaimSubjectOccurrences(claim, packet) {
  assert(packet?.schema === "vela.math.current-erdos-321-correction-chain.v1", `${claim.claim_id}: unsupported current Claim subject packet`);
  assert(packet.authority_effect === "none", `${claim.claim_id}: Claim occurrence packet has authority effect`);
  assert(claim.standing === "accepted", `${claim.claim_id}: only an accepted corrected Claim may bind a canonical Problem`);
  const correctionRelations = (claim.record?.relations ?? []).filter(({ kind }) => kind === "corrects" || kind === "supersedes");
  assert(correctionRelations.length === 1 && correctionRelations[0].kind === "corrects", `${claim.claim_id}: Claim occurrence packet requires one exact corrects relation`);
  assert(packet.successor?.relation === "corrects" && packet.successor?.assertion === claim.assertion, `${claim.claim_id}: current correction packet successor drift`);

  const resolution = packet.occurrence_resolution;
  const entity = problemResolutionConfig.entities.find(({ entity_id }) => entity_id === resolution?.entity_id);
  assert(entity, `${claim.claim_id}: Claim occurrence packet names no reviewed resolver entity`);
  assert(packet.problem === `erdos:${entity.problem_number}`, `${claim.claim_id}: Claim occurrence packet Problem drift`);
  assert(resolution.resolver_root === problemResolutionConfigRoot, `${claim.claim_id}: Claim occurrence packet resolver root drift`);
  assert(
    sourceNativeKey(resolution.canonical) === sourceNativeKey(entity.canonical_occurrence)
      && resolution.canonical?.content_root === entity.canonical_occurrence.content_root,
    `${claim.claim_id}: Claim occurrence packet canonical occurrence drift`,
  );
  const configured = new Map(
    entity.reviewed_occurrences.map((occurrence) => [sourceNativeKey(occurrence), occurrence]),
  );
  const selected = [];
  for (const occurrence of resolution.related_occurrences ?? []) {
    const expected = configured.get(sourceNativeKey(occurrence));
    assert(expected && expected.content_root === occurrence.content_root && occurrence.relation === "related", `${claim.claim_id}: Claim occurrence packet identity is not a rooted reviewed occurrence`);
    selected.push(expected);
  }
  assert(selected.length > 0, `${claim.claim_id}: Claim occurrence packet selects no reviewed source occurrence`);
  assert(new Set(selected.map(occurrenceKey)).size === selected.length, `${claim.claim_id}: Claim occurrence packet repeats a mapping`);
  assert(resolution.semantic_equivalence === "unresolved" && resolution.scope === "navigation grouping only", `${claim.claim_id}: Claim occurrence packet collapses unresolved semantics`);
  assert((packet.limitations ?? []).some((value) => /does not establish statement identity or semantic equivalence/iu.test(value)), `${claim.claim_id}: Claim occurrence packet omits its equivalence nonclaim`);
  return selected;
}

export function claimOccurrencePacket(material, claim) {
  const packets = [];
  for (const evidence of claim.record?.evidence ?? []) {
    if (typeof evidence.artifact_path !== "string") continue;
    const path = retainedRepositoryFile(material.directory, evidence.artifact_path);
    const bytes = readFileSync(path);
    assert(sha256(bytes) === evidence.artifact_root, `${claim.claim_id}: Claim occurrence Artifact fixity drift`);
    let candidate;
    try {
      candidate = JSON.parse(bytes.toString("utf8"));
    } catch {
      continue;
    }
    if (candidate?.schema !== "vela.math.current-erdos-321-correction-chain.v1") continue;
    const corrects = (claim.record?.relations ?? []).some(({ kind }) => kind === "corrects");
    if (!corrects) continue;
    assert(candidate.successor?.assertion === claim.assertion, `${claim.claim_id}: current correction packet successor drift`);
    packets.push(candidate);
  }
  assert(packets.length <= 1, `${claim.claim_id}: multiple Claim occurrence packets are ambiguous`);
  return packets[0] ?? null;
}

function claimReferenceText(claim) {
  return canonicalJson({
    source_title: claim.source_title,
    assertion: claim.assertion,
    imported_object_id: claim.imported_object_id,
    provenance: claim.record?.provenance ?? [],
  }).toLocaleLowerCase();
}

const declaredMathSourceIds = new Set(
  mathSourceRegistry.sources.map(({ source_id }) => source_id),
);

/* Whether a provenance URL points back at a Repository's own repository instead
 * of out at a source. The four repository names were spelled out here as a
 * regex alternation, which meant a fifth Repository would have had its own
 * repository classified as an external source until someone remembered this
 * line; the registry already declares them, so read them.
 *
 * The two account names are not a second roster. `vela-science` is where the
 * Repositories live, and `williamjblair` is the account that owned the Erdős
 * Repository before the organization existed: ten retained Claim records still
 * cite `github.com/williamjblair/erdos-frontier` in their provenance, and
 * dropping it would reclassify those as external. */
const repositoryNames = [...new Set(
  repositoryRegistry.repositories.flatMap(({ remotes }) => remotes).map((locator) => {
    const name = new URL(locator).pathname.split("/").pop().replace(/\.git$/u, "");
    assert(/^[a-z0-9-]+$/u.test(name), `repository locator ${locator} has no plain repository name`);
    return name;
  }),
)];
const repositoryLocator = new RegExp(
  String.raw`^https://github\.com/(?:vela-science|williamjblair)/(?:${repositoryNames.join("|")})(?:/|$)`,
  "iu",
);

function externalLocators(claim) {
  const urls = canonicalJson(claim.record?.provenance ?? [])
    .match(/https?:\/\/[^"\\\s]+/giu) ?? [];
  return [...new Set(urls)].filter(
    (url) => !repositoryLocator.test(url),
  );
}

function declaredSource(sourceId, claim) {
  assert(
    declaredMathSourceIds.has(sourceId),
    `${claim.claim_id}: source classifier selected undeclared source ${sourceId}`,
  );
  return sourceId;
}

/**
 * This classifier creates a Repository-to-source relationship only. It never
 * creates a source-native object. Native objects come from exact retained
 * adapter inputs below.
 */
export function sourceIdForClaim(claim) {
  const text = claimReferenceText(claim);
  if (
    /^erdos_deep:\d+$/u.test(claim.source_title ?? "")
    || text.includes("erdosproblems.com")
  ) {
    return declaredSource("source:erdos-problems", claim);
  }
  if (
    /^erdos_corpus:fc:/u.test(claim.source_title ?? "")
    || text.includes("google-deepmind/formal-conjectures")
    || text.includes("google-deepmind.github.io/formal-conjectures")
  ) {
    return declaredSource("source:formal-conjectures", claim);
  }
  if (
    text.includes("github.com/openai/ten-proofs")
    || text.includes("openai.com/index/ten-advances-in-mathematics")
  ) {
    return declaredSource("source:openai-ten-proofs", claim);
  }
  if (text.includes("plby/lean-proofs")) {
    return declaredSource("source:plby-lean-proofs", claim);
  }
  if (text.includes("jayyhk/erdos-lean")) {
    return declaredSource("source:jayyhk-erdos-lean", claim);
  }
  if (text.includes("williamjblair/lean-proofs")) {
    return declaredSource("source:williamjblair-lean-proofs", claim);
  }
  if (text.includes("erdosproblems/wiki/ai-contributions")) {
    return declaredSource("source:erdos-ai-contributions-wiki", claim);
  }
  if (text.includes("neelsomani/gpt-erdos")) {
    return declaredSource("source:gpt-erdos", claim);
  }
  if (text.includes("oeis.org/a309370") || /\ba309370\b/u.test(text)) {
    return declaredSource("source:oeis-a309370", claim);
  }
  if (text.includes("codetables.de")) {
    return declaredSource("source:codetables-stabilizer", claim);
  }
  const unresolved = externalLocators(claim);
  if (unresolved.length > 0) {
    throw new Error(
      `${claim.claim_id}: external source locator has no Math Source Registry declaration: ${unresolved.join(", ")}`,
    );
  }
  return null;
}

function preferredNativeId(sourceId, claim) {
  if (sourceId === "source:erdos-problems") {
    const match = /^erdos_deep:(\d+)$/u.exec(claim.source_title ?? "");
    if (match) return `erdos:${match[1]}`;
  }
  if (sourceId === "source:formal-conjectures") {
    const number = /(?:erdos[_:/-]?|erdos_corpus:fc:)(\d+)/iu.exec(
      `${claim.source_title ?? ""} ${claim.imported_object_id ?? ""}`,
    )?.[1];
    if (number) return `Erdos${number}.erdos_${number}`;
  }
  /* `ErdosProblems.ErdosN`, which is what `proof-manifests.ts` emits and what
     its own schema enforces. This returned `plby:erdos:N` — a shape no adapter
     has ever produced — so every plby binding resolved to nothing. */
  if (sourceId === "source:plby-lean-proofs") {
    const number = /erdos[_:/-]?(\d+)/iu.exec(
      `${claim.source_title ?? ""} ${claim.imported_object_id ?? ""}`,
    )?.[1];
    if (number) return `ErdosProblems.Erdos${number}`;
  }
  /* Emitted as `jayyhk:erdos:N` by the same file, and previously unhandled. */
  if (sourceId === "source:jayyhk-erdos-lean") {
    const number = /erdos[_:/-]?(\d+)/iu.exec(
      `${claim.source_title ?? ""} ${claim.imported_object_id ?? ""}`,
    )?.[1];
    if (number) return `jayyhk:erdos:${number}`;
  }
  if (sourceId === "source:oeis-a309370") return "oeis:A309370";
  if (claim.imported_object_id) return claim.imported_object_id;
  if (claim.source_title && !claim.source_title.startsWith("record:")) {
    return claim.source_title;
  }
  return claim.claim_id;
}

function exactRepositoryInputs(source, repositoryMaterials) {
  return repositoryMaterials
    .filter((material) => source.coverage.repository_slugs.includes(material.slug))
    .map((material) => ({
      repository_slug: material.slug,
      repository_id: material.status.repository.id,
      commit: material.head,
      tree: material.tree,
      origin_root: material.status.roots.origin,
      repository_root: material.status.roots.repository,
    }))
    .sort((a, b) => a.repository_slug.localeCompare(b.repository_slug));
}

function materialFor(repositoryMaterials, slug) {
  const material = repositoryMaterials.find((candidate) => candidate.slug === slug);
  assert(material, `missing exact ${slug} Repository material`);
  return material;
}

function trackedBytes(material, relativePath) {
  execFileSync("git", ["ls-files", "--error-unmatch", relativePath], {
    cwd: material.directory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const bytes = readFileSync(join(material.directory, relativePath));
  return {
    path: relativePath,
    byte_length: bytes.byteLength,
    content_root: sha256(bytes),
    bytes,
  };
}

function trackedJson(material, relativePath) {
  const file = trackedBytes(material, relativePath);
  return {
    ...file,
    value: JSON.parse(file.bytes.toString("utf8")),
  };
}

function scalar(value) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
    return value;
  }
  return canonicalJson(value);
}

function nativeSpec({
  nativeId,
  nativeKind,
  nativeRevision,
  title,
  summary = null,
  metadata = {},
  content,
  availability = "reference_only",
}) {
  return {
    native_id: String(nativeId),
    native_kind: nativeKind,
    native_revision: nativeRevision ? String(nativeRevision) : null,
    title: String(title),
    summary: summary === null || String(summary).trim() === ""
      ? null
      : String(summary),
    metadata: Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [key, scalar(value)]),
    ),
    content_root: content === null ? null : hashRoot(content),
    availability,
  };
}

function retainedSourcePackage(source, repositoryMaterials) {
  const files = [];
  let records = [];
  let revisionValue = null;
  let revisionContentRoot = null;
  let coverageStatus = "partial";
  let declaredNativeCount = null;
  let snapshotRoot = null;

  if (projectionSourceAdapterIds.includes(source.source_id)) {
    throw new Error(
      `${source.source_id}: supported source must be projected from a verified adapter bundle`,
    );
  }

  if (source.snapshot_policy.mode === "reference_only") {
    return {
      files,
      records,
      revision: {
        kind: "observation",
        value: source.declaration_root,
        content_root: source.declaration_root,
        tree: null,
      },
      coverageStatus: "unobserved",
      declaredNativeCount: null,
      snapshotRoot,
    };
  }

  /* Every declared Source is external, so reaching here without a verified
     bundle means the acquisition did not happen rather than that the bytes were
     already local. `repository_local` used to escape this: it let a repository's
     own retained artifact stand in the Source table, which is the category the
     four-boundary split removes. */
  throw new Error(
    `${source.source_id}: external source lacks a required verified adapter bundle`,
  );
}



function exactObservationTime(source, repositoryMaterials) {
  const observedAtCandidates = repositoryMaterials
    .filter((material) => source.coverage.repository_slugs.includes(material.slug))
    .map((material) => material.committed_at);
  assert(
    observedAtCandidates.length > 0,
    `${source.source_id}: no deterministic observation time`,
  );
  return latestRfc3339Instant(observedAtCandidates);
}

function sourceObservation(source, repositoryMaterials) {
  const retained = retainedSourcePackage(source, repositoryMaterials);
  const repositoryInputs = exactRepositoryInputs(source, repositoryMaterials);
  assert(repositoryInputs.length > 0, `${source.source_id}: no exact Repository input`);
  const acquisition = {
    schema: "vela.math-source-retained-acquisition.v2",
    source_id: source.source_id,
    declaration_root: source.declaration_root,
    adapter_root: source.adapter.adapter_root,
    repository_inputs: repositoryInputs,
    retained_inputs: retained.files.map(({ path, byte_length, content_root }) => ({
      path,
      byte_length,
      content_root,
    })),
  };
  const acquisitionRoot = hashRoot(acquisition);
  const observationId = `observation:${source.source_id.slice(7)}:${acquisitionRoot.slice(7, 23)}`;
  const provisionalRecords = retained.records.map((record) => createNativeSourceRecord({
    schema: "vela.math-native-record.v1",
    source_id: source.source_id,
    observation_root: UNSCOPED_OBSERVATION_ROOT,
    ...record,
    locators: source.locators,
    metadata_root: hashRoot(record.metadata),
  })).sort((left, right) => left.native_id.localeCompare(right.native_id));
  const projectedRecordsRoot = hashRoot(
    provisionalRecords.map(({ row_root }) => row_root).sort(),
  );
  const observation = createMathSourceObservation({
    source_id: source.source_id,
    observation_id: observationId,
    acquisition_root: acquisitionRoot,
    observed_at: exactObservationTime(source, repositoryMaterials),
    native_revision: retained.revision,
    snapshot_root: retained.snapshotRoot,
    snapshot_state: source.snapshot_policy.mode,
    projected_record_count: provisionalRecords.length,
    projected_records_root: projectedRecordsRoot,
    coverage: {
      status: retained.coverageStatus,
      included: source.coverage.included,
      native_record_count: retained.declaredNativeCount,
      projected_record_count: provisionalRecords.length,
    },
    omissions: source.coverage.omissions,
  });
  const records = provisionalRecords.map((record) => {
    const { row_root: _rowRoot, ...body } = record;
    return createNativeSourceRecord({
      ...body,
      observation_root: observation.observation_root,
    });
  });
  assert(
    records.every((record, index) => record.row_root === provisionalRecords[index].row_root),
    `${source.source_id}: native record roots changed under observation scoping`,
  );
  return { acquisition, observation, records };
}


function makeBinding({
  releaseRoot,
  repositoryId,
  sourceId,
  observationRoot,
  nativeId,
  nativeRecordRoot,
  repositoryObjectKind,
  repositoryObjectId,
  repositoryObjectRoot,
  bindingKind = "reference",
}) {
  const identity = {
    repository_id: repositoryId,
    source_id: sourceId,
    observation_root: observationRoot,
    native_id: nativeId,
    repository_object_kind: repositoryObjectKind,
    repository_object_id: repositoryObjectId,
    repository_object_root: repositoryObjectRoot,
  };
  return createRepositorySourceBinding({
    schema: "vela.repository-source-binding.v1",
    release_root: releaseRoot,
    repository_id: repositoryId,
    binding_id: `binding:${hashRoot(identity).slice(7, 31)}`,
    source_id: sourceId,
    observation_root: observationRoot,
    native_id: nativeId,
    native_record_root: nativeRecordRoot,
    binding_kind: bindingKind,
    repository_object_kind: repositoryObjectKind,
    repository_object_id: repositoryObjectId,
    repository_object_root: repositoryObjectRoot,
    local_standing_effect: "none",
  });
}

function databaseRows(releaseRoot, bundle) {
  const source_declarations = sourceDeclarationRows().map((row) => ({
    ...row,
    row_root: row.declaration_root,
  }));
  const source_observations = bundle.observations.map((observation) => ({
    source_id: observation.source_id,
    observation_id: observation.observation_id,
    observation_root: observation.observation_root,
    declaration_root: observation.declaration_root,
    acquisition_root: observation.acquisition_root,
    observed_at: observation.observed_at,
    native_revision: observation.native_revision,
    snapshot_root: observation.snapshot_root,
    snapshot_state: observation.snapshot_state,
    projected_record_count: observation.projected_record_count,
    projected_records_root: observation.projected_records_root,
    coverage: observation.coverage,
    omissions: observation.omissions,
    row_root: observation.observation_root,
  }));
  const native_records = bundle.native_records.map((record) => ({
    observation_root: record.observation_root,
    source_id: record.source_id,
    native_id: record.native_id,
    native_kind: record.native_kind,
    native_revision: record.native_revision,
    title: record.title,
    summary: record.summary,
    locators: record.locators,
    metadata: record.metadata,
    metadata_root: record.metadata_root,
    content_root: record.content_root,
    availability: record.availability,
    row_root: record.row_root,
  }));
  const release_sources = bundle.release_sources.map((source) => ({
    release_root: releaseRoot,
    source_id: source.source_id,
    declaration_root: source.declaration_root,
    observation_root: source.observation_root,
    native_record_count: source.native_record_count,
    repository_binding_count: source.repository_binding_count,
    row_root: source.release_source_root,
  }));
  const repository_source_bindings = bundle.repository_bindings.map((binding) => ({
    release_root: releaseRoot,
    repository_id: binding.repository_id,
    binding_id: binding.binding_id,
    source_id: binding.source_id,
    observation_root: binding.observation_root,
    native_id: binding.native_id,
    native_record_root: binding.native_record_root,
    binding_kind: binding.binding_kind,
    repository_object_kind: binding.repository_object_kind,
    repository_object_id: binding.repository_object_id,
    repository_object_root: binding.repository_object_root,
    local_standing_effect: binding.local_standing_effect,
    binding_root: binding.binding_root,
    row_root: binding.binding_root,
  }));
  return {
    source_declarations,
    source_observations,
    native_records,
    release_sources,
    repository_source_bindings,
  };
}

/**
 * Builds the registry from checked declarations, verified external adapter
 * bundles, and the few source-local objects owned by clean Repository checkouts.
 * Repository Claims are never relabeled as upstream objects: adapters emit
 * source-native records, and explicit bindings connect those objects to
 * Repository state.
 */
export function buildMathSourceProjection(
  repositoryMaterials,
  releaseRoot = UNSCOPED_RELEASE_ROOT,
  sourceAdapterBundles,
  sourceAdapterArtifact,
) {
  assert(/^sha256:[0-9a-f]{64}$/u.test(releaseRoot), "invalid source projection release root");
  const verifiedAdapters = requireProjectionSourceAdapters(sourceAdapterBundles);
  const observations = [];
  const nativeRecords = [];
  const observationBySource = new Map();
  for (const source of mathSourceRegistry.sources) {
    const verified = verifiedAdapters.get(source.source_id);
    const projected = verified
      ? (() => {
          const materialized = materializeVerifiedSourceAdapterBundle(
            verified.bundle,
            verified.records,
            exactObservationTime(source, repositoryMaterials),
          );
          return {
            observation: materialized.observation,
            records: materialized.native_records,
          };
        })()
      : sourceObservation(source, repositoryMaterials);
    observations.push(projected.observation);
    nativeRecords.push(...projected.records);
    observationBySource.set(source.source_id, projected.observation);
  }

  const nativeByIdentity = new Map(
    nativeRecords.map((record) => [
      `${record.source_id}\0${record.native_id}`,
      record,
    ]),
  );
  assert(
    nativeByIdentity.size === nativeRecords.length,
    "source adapters emitted duplicate native identities",
  );

  const bindings = [];
  let expectedClaimBindingCount = 0;
  for (const material of repositoryMaterials) {
    for (const claim of material.claims) {
      const subjectPacket = claimOccurrencePacket(material, claim);
      if (subjectPacket) {
        for (const occurrence of reviewedClaimSubjectOccurrences(claim, subjectPacket)) {
          const observation = observationBySource.get(occurrence.source_id);
          assert(observation, `${claim.claim_id}: missing source observation ${occurrence.source_id}`);
          const nativeRecord = nativeByIdentity.get(`${occurrence.source_id}\0${occurrence.native_id}`);
          assert(nativeRecord && nativeRecord.native_kind === occurrence.native_kind && nativeRecord.content_root === occurrence.content_root, `${claim.claim_id}: reviewed Claim occurrence is absent or drifted in the exact Source observation`);
          bindings.push(makeBinding({
            releaseRoot,
            repositoryId: material.status.repository.id,
            sourceId: occurrence.source_id,
            observationRoot: observation.observation_root,
            nativeId: occurrence.native_id,
            nativeRecordRoot: nativeRecord.row_root,
            repositoryObjectKind: "claim",
            repositoryObjectId: claim.claim_id,
            repositoryObjectRoot: claim.claim_root,
            bindingKind: nativeRecord.availability === "available" ? "snapshot" : "reference",
          }));
          expectedClaimBindingCount += 1;
        }
        continue;
      }
      const sourceId = sourceIdForClaim(claim);
      if (sourceId === null) continue;
      const observation = observationBySource.get(sourceId);
      assert(observation, `${claim.claim_id}: missing source observation ${sourceId}`);
      /* Never publish an identifier the observation does not carry.
         `preferredNativeId` derives a source's native identifier from a Claim's
         title and provenance, which is a convention per source rather than a
         fact — and the conventions had drifted. It returned `plby:erdos:N`
         while `proof-manifests.ts` emits `ErdosProblems.ErdosN`, and four
         sources have no branch at all and fall through to the Claim's own
         identifiers, which are not native ids of anything. `math-sources.ts`
         then skips its existence check for exactly the bindings whose root came
         back null, so a binding naming a record that does not exist validated
         cleanly and published.
         A resolved guess binds to the record. An unresolved one binds to the
         Source and says nothing about which record, which is both true and the
         availability class the schema already carries — `native_id` null, root
         null. What it must not do is state an identifier nobody has. */
      const guessed = preferredNativeId(sourceId, claim);
      const nativeRecord = nativeByIdentity.get(`${sourceId}\0${guessed}`) ?? null;
      const nativeId = nativeRecord === null ? null : guessed;
      bindings.push(makeBinding({
        releaseRoot,
        repositoryId: material.status.repository.id,
        sourceId,
        observationRoot: observation.observation_root,
        nativeId,
        nativeRecordRoot: nativeRecord?.row_root ?? null,
        repositoryObjectKind: "claim",
        repositoryObjectId: claim.claim_id,
        repositoryObjectRoot: claim.claim_root,
        bindingKind: nativeRecord?.availability === "available" ? "snapshot" : "reference",
      }));
      expectedClaimBindingCount += 1;
    }
  }

  /* A binding is a Claim object, and there is no problem-kind binding.

     There used to be a loop here that bound every source-native Problem to a
     problem-kind graph node. It published nothing, and could not: a graph node
     exists only where a Claim does — the same assumption `projection-builder.mjs`
     removed from `problem_count`, and that `667a6ee8` removed from the Problem
     ledger by deleting `PROBLEM_BINDINGS_SQL`. So a repository holding 1,217
     Problems and no Claim emitted zero bindings, every release, with nothing
     saying so. The loop ran; `graphNodeById` returned null 2,340 times and
     `continue` fired 2,340 times.

     The alternative was to rebuild it on the native record id instead. That was
     considered and rejected: a Repository→Source binding says which Source
     observation a *governed* object came from, and a Problem is not governed —
     it owns nothing, it is derived from the Source, and the Source it came from
     is already on the native record itself. Binding it would restate a fact the
     record already carries, and would have to invent a `repository_object_root`
     for an object that has no root of its own. */

  const releaseSources = mathSourceRegistry.sources.map((source) => {
    const observation = observationBySource.get(source.source_id);
    assert(observation, `${source.source_id}: missing release observation`);
    return createReleaseSource({
      schema: "vela.math-release-source.v1",
      release_root: releaseRoot,
      source_id: source.source_id,
      declaration_root: source.declaration_root,
      observation_root: observation.observation_root,
      native_record_count: nativeRecords.filter(
        (record) => record.source_id === source.source_id,
      ).length,
      repository_binding_count: bindings.filter(
        (binding) => binding.source_id === source.source_id,
      ).length,
    });
  });

  const bundle = createMathSourceObservationBundle({
    release_root: releaseRoot,
    observations: observations.sort((left, right) => (
      left.source_id.localeCompare(right.source_id)
    )),
    native_records: nativeRecords.sort((left, right) => (
      left.source_id.localeCompare(right.source_id)
      || left.native_id.localeCompare(right.native_id)
    )),
    release_sources: releaseSources.sort((left, right) => (
      left.source_id.localeCompare(right.source_id)
    )),
    repository_bindings: bindings.sort((left, right) => (
      left.repository_id.localeCompare(right.repository_id)
      || left.source_id.localeCompare(right.source_id)
      || left.binding_id.localeCompare(right.binding_id)
    )),
  });
  assert(
    bundle.repository_bindings.filter(
      (binding) => binding.repository_object_kind === "claim",
    ).length === expectedClaimBindingCount,
    "source projection silently lost a Repository Claim binding",
  );
  return {
    bundle,
    source_registry: createMathSourceRegistryRelease(
      bundle,
      sourceAdapterArtifact,
    ),
    tables: databaseRows(releaseRoot, bundle),
  };
}
