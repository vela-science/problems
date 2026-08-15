import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  buildMathSourceProjection,
  claimOccurrencePacket,
  reviewedClaimSubjectOccurrences,
  sourceIdForClaim,
  UNSCOPED_RELEASE_ROOT,
} from "../scripts/math-source-projection.mjs";
import {
  verifySourceAdapterBundle,
  writeSourceAdapterBundle,
  type SourceAdapterOutput,
  type VerifiedSourceAdapterBundle,
} from "../src/source-adapters/bundle";
import {
  createSourceAdapterIdentity,
  createSourceNativeRecord,
} from "../src/source-adapters/contracts";
import { mathSourceRegistry } from "../src/math-sources";
import { canonicalJson, sha256 } from "../src/canonical";
import { problemResolutionConfig, problemResolutionConfigRoot } from "../src/problem-resolution";

const root = (digit: string) => `sha256:${digit.repeat(64)}`;
const fixtureRoot = mkdtempSync(join(tmpdir(), "vela-math-source-projection-"));

function claim(input: {
  digit: string;
  title: string;
  assertion: string;
  locator?: string;
  evidenceRoot?: string;
}) {
  return {
    claim_id: `vcl_${input.digit.repeat(64)}`,
    claim_root: root(input.digit),
    standing: "accepted",
    assertion: input.assertion,
    assertion_kind: "theoretical",
    conditions: [],
    created_at: "2026-07-30T12:00:00Z",
    source_title: input.title,
    source_type: "database_record",
    evidence_count: input.evidenceRoot ? 1 : 0,
    imported_object_id: null,
    imported_object_root: null,
    contested: false,
    retracted: false,
    source_path: `records/claims/${input.digit}.json`,
    record: {
      schema: "vela.claim-record.v1",
      claim_id: `vcl_${input.digit.repeat(64)}`,
      assertion: input.assertion,
      provenance: [{
        kind: "database_record",
        title: input.title,
        ...(input.locator ? { locator: input.locator } : {}),
      }],
      evidence: input.evidenceRoot
        ? [{ artifact_root: input.evidenceRoot, relation: "supports" }]
        : [],
    },
  };
}

function writeJson(directory: string, relativePath: string, value: unknown) {
  const path = join(directory, relativePath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function git(command: string[], directory: string): string {
  return execFileSync("git", command, {
    cwd: directory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function makeRepository(slug: string, files: Record<string, unknown>) {
  const directory = join(fixtureRoot, slug);
  mkdirSync(directory, { recursive: true });
  for (const [path, value] of Object.entries(files)) writeJson(directory, path, value);
  writeFileSync(join(directory, ".fixture"), `${slug}\n`);
  git(["init", "-q"], directory);
  git(["config", "user.name", "Vela fixture"], directory);
  git(["config", "user.email", "fixture@vela.space"], directory);
  git(["add", "."], directory);
  git(["commit", "-qm", "fixture"], directory);
  return directory;
}

const mathDirectory = makeRepository("math", {});

afterAll(() => rmSync(fixtureRoot, { recursive: true, force: true }));

const verifiedSourceAdapters = new Map<string, VerifiedSourceAdapterBundle>();

function fixtureAdapterOutput(input: {
  sourceId: string;
  adapterId: string;
  adapterVersion?: string;
  nativeId: string;
  nativeKind: string;
  title: string;
  problemNumber?: number | null;
}): SourceAdapterOutput {
  const metadata = input.problemNumber === null
    ? {}
    : { problem_number: input.problemNumber ?? 1056 };
  const content = {
    source_id: input.sourceId,
    native_id: input.nativeId,
    fixture: true,
  };
  return {
    source_id: input.sourceId,
    /* The registry's own version by default. A bundle whose adapter version
       differs from the declaration's is refused at materialization, so a
       literal here goes stale the first time an adapter changes what it emits
       — which is exactly what it did. */
    adapter: createSourceAdapterIdentity(
      input.adapterId,
      input.adapterVersion
        ?? mathSourceRegistry.sources.find(
          ({ source_id }) => source_id === input.sourceId,
        )?.adapter.version
        ?? "1.0.0",
    ),
    revision: {
      kind: "snapshot",
      value: "fixture-revision",
      git_commit: null,
      git_tree: null,
      content_root: sha256(canonicalJson(content)),
    },
    inputs: [{
      input_id: "fixture",
      role: "retained_snapshot",
      locator: "fixture://bounded-source",
      media_type: "application/json",
      byte_length: 1,
      content_root: root("f"),
    }],
    records: [createSourceNativeRecord({
      schema: "vela.source-native-record.v1",
      source_id: input.sourceId,
      native_id: input.nativeId,
      native_kind: input.nativeKind,
      native_revision: "fixture-revision",
      title: input.title,
      summary: "Bounded source-adapter fixture.",
      source_path: null,
      locators: ["https://example.test/source"],
      metadata,
      content_root: sha256(canonicalJson(content)),
    })],
    coverage: {
      status: "complete",
      scope: "One bounded source-adapter fixture record.",
      native_record_count: 1,
      emitted_record_count: 1,
      omitted_record_count: 0,
    },
    omissions: [],
    loss: [],
  };
}

beforeAll(async () => {
  const outputs = [
    fixtureAdapterOutput({
      sourceId: "source:erdos-problems",
      adapterId: "problems-data/erdos-problems",
      nativeId: "erdos:1056",
      nativeKind: "problem",
      title: "Erdős problem 1056",
    }),
    fixtureAdapterOutput({
      sourceId: "source:formal-conjectures",
      adapterId: "problems-data/formal-conjectures",
      nativeId: "Erdos1056.erdos_1056",
      nativeKind: "formal_conjecture",
      title: "Erdos1056.erdos_1056",
    }),
    fixtureAdapterOutput({
      sourceId: "source:openai-ten-proofs",
      adapterId: "problems-data/openai-ten-proofs",
      nativeId: "comparator:I_MulticolorTriangleRamsey",
      nativeKind: "comparator_profile",
      title: "Multicolor triangle Ramsey numbers",
      problemNumber: null,
    }),
    fixtureAdapterOutput({
      sourceId: "source:physlib",
      adapterId: "problems-data/physlib-api-maps",
      nativeId: "api-map:Physlib/QuantumMechanics/QuantumSystem/API-map.yaml#requirement:1",
      nativeKind: "api_requirement",
      title: "A source-reported Physlib API requirement",
      problemNumber: null,
    }),
    fixtureAdapterOutput({
      sourceId: "source:plby-lean-proofs",
      adapterId: "problems-data/plby-lean-proofs",
      nativeId: "ErdosProblems.Erdos1056",
      nativeKind: "proof_manifest_entry",
      title: "plby proof entry for Erdős 1056",
    }),
    fixtureAdapterOutput({
      sourceId: "source:erdos-ai-contributions-wiki",
      adapterId: "problems-data/erdos-ai-contributions-wiki",
      nativeId: "erdos-ai-wiki:1056:fixture",
      nativeKind: "attributed_activity",
      title: "AI contribution record for Erdős 1056",
    }),
    fixtureAdapterOutput({
      sourceId: "source:gpt-erdos",
      adapterId: "problems-data/gpt-erdos",
      nativeId: "gpt-erdos:1056",
      nativeKind: "attributed_classification",
      title: "GPT-Erdős classification for problem 1056",
    }),
    fixtureAdapterOutput({
      sourceId: "source:jayyhk-erdos-lean",
      adapterId: "problems-data/jayyhk-erdos-lean",
      nativeId: "jayyhk:erdos:1056",
      nativeKind: "proof_manifest_entry",
      title: "Jayyhk proof entry for Erdős 1056",
    }),
    fixtureAdapterOutput({
      sourceId: "source:williamjblair-lean-proofs",
      adapterId: "problems-data/williamjblair-lean-proofs",
      nativeId: "williamjblair:Erdos1056.erdos_1056",
      nativeKind: "proof_manifest_entry",
      title: "William Blair proof entry for Erdős 1056",
    }),
    fixtureAdapterOutput({
      sourceId: "source:oeis-a309370",
      adapterId: "problems-data/oeis-a309370",
      nativeId: "oeis:A309370",
      nativeKind: "sequence",
      title: "OEIS A309370",
      problemNumber: null,
    }),
    /* `attributed_activity`, the same kind the AI-contributions wiki emits,
       because it is the same species of claim: somebody else's judgment about
       what solved a problem. Neither is a Vela result. */
    fixtureAdapterOutput({
      sourceId: "source:vibemathed",
      adapterId: "problems-data/vibemathed",
      nativeId: "vibemathed:erdos-1056",
      nativeKind: "attributed_activity",
      title: "A VibeMathed catalogue entry for Erdős 1056",
    }),
  ];
  for (const output of outputs) {
    const directory = join(fixtureRoot, `adapter-${output.source_id.slice(7)}`);
    await writeSourceAdapterBundle(directory, output, { chunkRecordLimit: 1 });
    verifiedSourceAdapters.set(
      output.source_id,
      await verifySourceAdapterBundle(directory),
    );
  }
});

function material(
  slug: string,
  digit: string,
  directory: string,
  claims: ReturnType<typeof claim>[],
) {
  return {
    slug,
    directory,
    head: git(["rev-parse", "HEAD"], directory),
    tree: git(["rev-parse", "HEAD^{tree}"], directory),
    committed_at: "2026-07-30T12:00:00Z",
    status: {
      repository: { id: "123e4567-e89b-42d3-a456-426614174000" },
      roots: {
        origin: root(digit),
        repository: root((Number.parseInt(digit, 16) + 1).toString(16)),
      },
    },
    current: {},
    claims,
    /* No problem-kind node. `projectGraph` cannot produce one — a graph node
       exists only where a Claim does — and hand-writing one here is what made
       the dead problem-binding loop look alive in this suite while publishing
       nothing in production. */
    graph: { nodes: [] },
  };
}

/* One repository, because there is one authority. These four Claims used to sit
   in four repositories that existed because there were four subject areas, and
   the classifier reached the right source by locator in every case except the
   one that read the repository's slug — which is exactly the coupling the split
   removes. */
function fixtures() {
  return [
    material("math", "1", mathDirectory, [
      claim({
        digit: "5",
        title: "erdos_deep:1056",
        assertion: "Exact retained Erdős problem statement.",
      }),
      claim({
        digit: "6",
        title: "formal statement",
        assertion: "A pinned Lean declaration.",
        locator: "https://github.com/google-deepmind/formal-conjectures/blob/abc/Test.lean",
      }),
      claim({
        digit: "7",
        title: "OEIS A309370 observation",
        assertion: "A309370 records the observed bound.",
        locator: "https://oeis.org/A309370",
      }),
    ]),
  ];
}

describe("Math source projection", () => {
  test("resolves an accepted correction only through its current rooted correction packet", () => {
    const corrected = claim({
      digit: "4",
      title: "Authenticated Submission",
      assertion: "A bounded correction with an explicit occurrence Artifact.",
    });
    corrected.record.relations = [{
      kind: "corrects",
      target_claim_id: `vcl_${"3".repeat(64)}`,
    }];
    const entity = problemResolutionConfig.entities.find(({ problem_number }) => problem_number === 321)!;
    const formal = entity.reviewed_occurrences.find(({ native_id }) => native_id === "Erdos321.erdos_321")!;
    const theta = entity.reviewed_occurrences.find(({ native_id }) => native_id.endsWith(".variants.isTheta"))!;
    const packet = {
      schema: "vela.math.current-erdos-321-correction-chain.v1",
      authority_effect: "none",
      problem: "erdos:321",
      occurrence_resolution: {
        entity_id: entity.entity_id,
        resolver_root: problemResolutionConfigRoot,
        canonical: entity.canonical_occurrence,
        related_occurrences: [formal, theta].map(({ source_id, native_id, content_root }) => ({
          source_id,
          native_id,
          content_root,
          relation: "related",
        })),
        semantic_equivalence: "unresolved",
        scope: "navigation grouping only",
      },
      successor: { assertion: corrected.assertion, relation: "corrects" },
      limitations: ["Occurrence grouping does not establish statement identity or semantic equivalence."],
    };
    expect(reviewedClaimSubjectOccurrences(corrected, packet)).toEqual([formal, theta]);

    expect(() => reviewedClaimSubjectOccurrences(corrected, { ...packet, authority_effect: "standing" }))
      .toThrow(/authority effect/u);
    expect(() => reviewedClaimSubjectOccurrences(corrected, {
      ...packet,
      occurrence_resolution: {
        ...packet.occurrence_resolution,
        related_occurrences: [{
          ...packet.occurrence_resolution.related_occurrences[0],
          native_id: "Erdos321.unreviewed",
        }],
      },
    })).toThrow(/not a rooted reviewed occurrence/u);
    expect(() => reviewedClaimSubjectOccurrences(corrected, {
      ...packet,
      occurrence_resolution: { ...packet.occurrence_resolution, semantic_equivalence: "preserved" },
    })).toThrow(/collapses unresolved semantics/u);
    expect(() => reviewedClaimSubjectOccurrences({ ...corrected, standing: "unassessed" }, packet))
      .toThrow(/only an accepted corrected Claim/u);
  });

  test("loads an occurrence packet only from exact retained Repository bytes", () => {
    const directory = join(fixtureRoot, "occurrence-packet-custody");
    const packetPath = "evidence/erdos-321/occurrence-resolution.v1.json";
    mkdirSync(join(directory, "evidence/erdos-321"), { recursive: true });
    const packet = {
      schema: "vela.math.current-erdos-321-correction-chain.v1",
      successor: { assertion: "exact", relation: "corrects" },
    };
    const bytes = Buffer.from(`${JSON.stringify(packet)}\n`);
    writeFileSync(join(directory, packetPath), bytes);
    const corrected = claim({ digit: "4", title: "correction", assertion: "exact" });
    corrected.record.relations = [{ kind: "corrects", target_claim_id: `vcl_${"3".repeat(64)}` }];
    corrected.record.evidence = [{
      artifact_path: packetPath,
      artifact_root: sha256(bytes),
      relation: "supports",
    }];
    expect(claimOccurrencePacket({ directory }, corrected)).toEqual(packet);

    corrected.record.evidence[0].artifact_root = root("a");
    expect(() => claimOccurrencePacket({ directory }, corrected)).toThrow(/Artifact fixity drift/u);
    corrected.record.evidence[0].artifact_root = sha256(bytes);

    const outside = join(fixtureRoot, "outside-occurrence-packet.json");
    writeFileSync(outside, bytes);
    rmSync(join(directory, packetPath));
    symlinkSync(outside, join(directory, packetPath));
    expect(() => claimOccurrencePacket({ directory }, corrected)).toThrow(/traverses a symlink/u);

    corrected.record.evidence[0].artifact_path = "../outside-occurrence-packet.json";
    expect(() => claimOccurrencePacket({ directory }, corrected)).toThrow(/escapes its Repository/u);
  });

  test("assigns retained Claim provenance to one declared source", () => {
    const [math] = fixtures();
    expect(sourceIdForClaim(math.claims[0])).toBe("source:erdos-problems");
    expect(sourceIdForClaim(math.claims[1])).toBe("source:formal-conjectures");
    expect(sourceIdForClaim(math.claims[2])).toBe("source:oeis-a309370");
    const astra = claim({
      digit: "d",
      title: "OpenAI ten-proofs release",
      assertion: "An attributed formalization-release observation.",
      locator: "https://github.com/openai/ten-proofs/blob/94bc0feb6a9ff12c7d31d6de640a725c9d43d2b6/ComparatorChallenges/I_MulticolorTriangleRamsey.json",
    });
    expect(sourceIdForClaim(astra)).toBe("source:openai-ten-proofs");
  });

  test("does not invent a source binding for an unattributed local Claim", () => {
    const materials = fixtures();
    const local = claim({
      digit: "9",
      title: "record:local-result",
      assertion: "A Repository-local result with no external source reference.",
    });
    materials[0].claims.push(local);

    expect(sourceIdForClaim(local)).toBeNull();
    const projection = buildMathSourceProjection(
      materials,
      root("d"),
      verifiedSourceAdapters,
    );
    expect(projection.bundle.repository_bindings.some(
      (binding) => binding.repository_object_kind === "claim"
        && binding.repository_object_id === local.claim_id,
    )).toBe(false);
  });

  test("keeps Repository-local locators local and rejects unknown external sources", () => {
    const local = claim({
      digit: "a",
      title: "campaign output",
      assertion: "A Repository-local exact statement.",
      locator: "https://github.com/vela-science/math/blob/abc/statements/1/1.lean",
    });
    expect(sourceIdForClaim(local)).toBeNull();

    const forum = claim({
      digit: "b",
      title: "erdosproblems.com forum thread 650",
      assertion: "An attributed upstream observation.",
    });
    expect(sourceIdForClaim(forum)).toBe("source:erdos-problems");

    const unknown = claim({
      digit: "c",
      title: "unregistered external release",
      assertion: "An external result without a declared source adapter.",
      locator: "https://example.invalid/research/release-1",
    });
    expect(() => sourceIdForClaim(unknown)).toThrow(
      `${unknown.claim_id}: external source locator has no Math Source Registry declaration`,
    );
  });

  test("builds real source-native records separately from Repository bindings", () => {
    const first = buildMathSourceProjection(
      fixtures(),
      UNSCOPED_RELEASE_ROOT,
      verifiedSourceAdapters,
    );
    const finalRoot = root("a");
    const scoped = buildMathSourceProjection(
      fixtures(),
      finalRoot,
      verifiedSourceAdapters,
    );

    expect(first.source_registry.observation_bundle_root).toBe(
      scoped.source_registry.observation_bundle_root,
    );
    expect(scoped.source_registry).toMatchObject({
      source_count: mathSourceRegistry.sources.length,
      observation_count: mathSourceRegistry.sources.length,
      release_source_count: mathSourceRegistry.sources.length,
      native_record_count: 11,
      /* Three, not eleven. The other eight were problem-kind bindings the
         builder manufactured from a graph node this fixture hand-wrote — a
         shape `projectGraph` cannot produce, because a graph node exists only
         where a Claim does. So the count that made this assertion pass was the
         fabrication, and in production the same loop bound nothing at all. Both
         are gone; a binding is a Claim object. */
      repository_binding_count: 3,
    });
    expect(
      [...new Set(scoped.bundle.repository_bindings.map((binding) => binding.repository_object_kind))],
    ).toEqual(["claim"]);
    expect(scoped.bundle.native_records).toContainEqual(expect.objectContaining({
      source_id: "source:erdos-problems",
      native_id: "erdos:1056",
      native_kind: "problem",
      title: "Erdős problem 1056",
    }));
    const claimBinding = scoped.bundle.repository_bindings.find(
      (binding) => binding.repository_object_kind === "claim",
    );
    expect(claimBinding).toBeDefined();
    expect(scoped.bundle.native_records.some(
      (record) =>
        record.source_id === claimBinding?.source_id
        && record.native_id === claimBinding.repository_object_id,
    )).toBe(false);
    /* Every identifier a binding states must be one the observation carries.
       `preferredNativeId` guesses it from a Claim's title and provenance, and
       the guesses had drifted from the adapters: `plby:erdos:N` against an
       adapter emitting `ErdosProblems.ErdosN`, and four sources with no branch
       falling through to the Claim's own identifiers, which name no record
       anywhere. `math-sources.ts` skips its existence check for exactly the
       bindings whose root is null, so an invented id validated and shipped.
       A binding may still decline to name a record — that is the "referenced
       but not retained" class the schema carries, `native_id` and root both
       null. What it may not do is name one nobody has. */
    for (const binding of scoped.bundle.repository_bindings) {
      if (binding.native_id === null) continue;
      expect(
        scoped.bundle.native_records.some(
          (record) => record.source_id === binding.source_id
            && record.native_id === binding.native_id,
        ),
        `${binding.source_id} binding names ${binding.native_id}, which no native record carries`,
      ).toBe(true);
    }
    expect(scoped.bundle.release_sources.every(
      (row) => row.release_root === finalRoot,
    )).toBe(true);
    expect(scoped.bundle.repository_bindings.every(
      (row) => row.release_root === finalRoot,
    )).toBe(true);
    expect(scoped.tables.native_records.map(({ row_root }) => row_root)).toEqual(
      first.tables.native_records.map(({ row_root }) => row_root),
    );
  });

  test("does not invent source bytes or operational failure rows", () => {
    const projection = buildMathSourceProjection(
      fixtures(),
      root("b"),
      verifiedSourceAdapters,
    );
    const erdos = projection.bundle.native_records.find(
      ({ source_id }) => source_id === "source:erdos-problems",
    );
    expect(erdos).toMatchObject({
      availability: "reference_only",
      content_root: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
    });
    /* The available-bytes half of this contrast used to come from the retained
       quantum certificate, and that source is gone: its rights permitted no copy
       outside the repository it was retained in. The invariant it was really
       drawing survives without it — a record that says it holds bytes must name
       their root, which the schema also checks and this asserts across the whole
       projection rather than on one row. */
    expect(projection.bundle.native_records.every(
      (record) => record.availability !== "available"
        || /^sha256:[0-9a-f]{64}$/u.test(record.content_root ?? ""),
    )).toBe(true);
    expect(projection.bundle.observations).toContainEqual(
      expect.objectContaining({
        source_id: "source:codetables-stabilizer",
        projected_record_count: 0,
        coverage: expect.objectContaining({
          status: "unobserved",
          native_record_count: null,
          projected_record_count: 0,
        }),
      }),
    );
    expect(canonicalString(projection)).not.toContain("acquisition_failed");
    expect(canonicalString(projection)).not.toContain("failure_reason");
  });

  test("fails closed instead of falling back to retained source parser branches", () => {
    const incomplete = new Map(verifiedSourceAdapters);
    incomplete.delete("source:formal-conjectures");
    expect(() => buildMathSourceProjection(
      fixtures(),
      root("c"),
      incomplete,
    )).toThrow("source-adapter set is incomplete");
  });
});

function canonicalString(value: unknown): string {
  return JSON.stringify(value);
}
